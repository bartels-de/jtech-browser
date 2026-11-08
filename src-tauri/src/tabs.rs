//! Tab manager: every browser tab is a child webview of the main window.
//!
//! Rust owns the tab state. The chrome UI receives it as `tabs:state` in the
//! same shape as `TabManager.getState()` in src/main/tabs.js.
//!
//! Locking rule: the state mutex is never held while calling into a webview
//! or window, because those calls can run webview callbacks that lock it too.

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Mutex, MutexGuard};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;
use serde_json::{json, Value};
use tauri::webview::{NewWindowResponse, PageLoadEvent, WebviewBuilder};
use tauri::{
    AppHandle, Emitter, EventTarget, LogicalPosition, LogicalSize, Manager, Url, WebviewUrl,
    WindowEvent,
};

use crate::newtab;

pub const WINDOW_LABEL: &str = "main";
pub const CHROME_LABEL: &str = "chrome";
pub const TAB_PREFIX: &str = "tab-";

const NEW_TAB_TITLE: &str = "Neuer Tab";

#[derive(Debug, Clone)]
pub struct Tab {
    pub id: String,
    pub url: String,
    pub title: String,
    pub favicon: String,
    pub loading: bool,
    pub can_go_back: bool,
    pub can_go_forward: bool,
    pub zoom: f64,
    pub pinned: bool,
    pub group_id: Option<String>,
    pub muted: bool,
    pub volume: f64,
    /// Playing audio (WebView2 `IsDocumentPlayingAudio`).
    pub audible: bool,
    /// No webview: a restored or slept tab that loads on activation.
    pub sleeping: bool,
    /// Milliseconds since the epoch when the tab was last left or shown.
    pub last_active_at: u64,
    /// Label of the tab's webview while it has one. Each webview gets a new
    /// label so a closing webview never blocks waking the tab again.
    pub webview_label: Option<String>,
}

impl Tab {
    /// A tab record without a webview.
    pub fn record(id: String, url: String) -> Self {
        Tab {
            id,
            url,
            title: NEW_TAB_TITLE.to_string(),
            favicon: String::new(),
            loading: false,
            can_go_back: false,
            can_go_forward: false,
            zoom: 1.0,
            pinned: false,
            group_id: None,
            muted: false,
            volume: 1.0,
            audible: false,
            sleeping: true,
            last_active_at: now_millis(),
            webview_label: None,
        }
    }

    fn label(&self) -> Option<String> {
        self.webview_label.clone()
    }

    fn is_new_tab(&self) -> bool {
        self.url.is_empty() || newtab::is_internal(&self.url)
    }
}

static WEBVIEW_COUNTER: AtomicU64 = AtomicU64::new(1);

fn next_webview_label(id: &str) -> String {
    let n = WEBVIEW_COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("{TAB_PREFIX}{id}-{n}")
}

pub fn now_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or_default()
}

#[derive(Debug, Default)]
pub struct Browser {
    pub tabs: Vec<Tab>,
    pub active_id: Option<String>,
    pub chrome_height: f64,
    pub sidebar_width: f64,
    pub dock_width: f64,
    /// An HTML overlay (settings, menus, ...) covers the content area.
    pub overlay: bool,
    /// The UI asked to hide the page (`toggleWebview(false)`).
    pub webview_hidden: bool,
    pub maximized: bool,
    pub fullscreen: bool,
    /// The UI asked to focus the page while it was hidden; done once shown.
    pub pending_content_focus: bool,
    /// URLs of recently closed tabs (newest last, max 25) for "reopen tab".
    pub closed_history: Vec<String>,
}

const MAX_CLOSED_HISTORY: usize = 25;

#[derive(Default)]
pub struct BrowserState(pub Mutex<Browser>);

fn lock(app: &AppHandle) -> MutexGuard<'_, Browser> {
    app.state::<BrowserState>()
        .inner()
        .0
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

fn with_browser<T>(app: &AppHandle, f: impl FnOnce(&mut Browser) -> T) -> T {
    let mut guard = lock(app);
    f(&mut guard)
}

/* ------------------------------------------------------------ State event */

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct TabPayload {
    id: String,
    title: String,
    url: String,
    favicon: String,
    loading: bool,
    can_go_back: bool,
    can_go_forward: bool,
    is_new_tab: bool,
    pinned: bool,
    group_id: Option<String>,
    muted: bool,
    audible: bool,
    volume: f64,
    volume_explicit: bool,
    media_active: bool,
    zoom: f64,
    sleeping: bool,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct StatePayload {
    active_id: Option<String>,
    split_mode: bool,
    split_left_id: Option<String>,
    split_right_id: Option<String>,
    split_ratio: f64,
    tabs: Vec<TabPayload>,
}

fn state_payload(browser: &Browser) -> StatePayload {
    StatePayload {
        active_id: browser.active_id.clone(),
        split_mode: false,
        split_left_id: None,
        split_right_id: None,
        split_ratio: 0.5,
        tabs: browser
            .tabs
            .iter()
            .map(|tab| {
                let is_new_tab = tab.is_new_tab();
                TabPayload {
                    id: tab.id.clone(),
                    title: tab.title.clone(),
                    // Same as Electron's displayUrl: empty for internal pages.
                    url: if is_new_tab { String::new() } else { tab.url.clone() },
                    favicon: tab.favicon.clone(),
                    loading: tab.loading,
                    can_go_back: tab.can_go_back,
                    can_go_forward: tab.can_go_forward,
                    is_new_tab,
                    pinned: tab.pinned,
                    group_id: tab.group_id.clone(),
                    muted: tab.muted,
                    audible: tab.audible,
                    volume: tab.volume,
                    volume_explicit: false,
                    media_active: false,
                    zoom: tab.zoom,
                    sleeping: tab.sleeping,
                }
            })
            .collect(),
    }
}

/// Sends an event to the chrome UI only (tab webviews never get IPC events).
pub fn emit_chrome<S: Serialize + Clone>(app: &AppHandle, event: &str, payload: S) {
    if let Err(error) = app.emit_to(EventTarget::webview(CHROME_LABEL), event, payload) {
        crate::applog!("[tabs] could not emit {event}: {error}");
    }
}

pub fn emit_state(app: &AppHandle) {
    let payload = with_browser(app, |browser| state_payload(browser));
    emit_chrome(app, "tabs:state", payload);
}

/// Changes one tab and pushes the new state. Unknown ids are ignored.
pub fn update_tab(app: &AppHandle, id: &str, f: impl FnOnce(&mut Tab)) {
    let found = with_browser(app, |browser| match browser.tabs.iter_mut().find(|t| t.id == id) {
        Some(tab) => {
            f(tab);
            true
        }
        None => false,
    });
    if found {
        emit_state(app);
    }
}

/* ---------------------------------------------------------------- Layout */

/// Content area in logical pixels: below the chrome, right of the sidebar,
/// left of the dock.
fn content_bounds(app: &AppHandle) -> (LogicalPosition<f64>, LogicalSize<f64>) {
    let (width, height) = app
        .get_window(WINDOW_LABEL)
        .and_then(|window| {
            let scale = window.scale_factor().ok()?;
            let size = window.inner_size().ok()?.to_logical::<f64>(scale);
            Some((size.width, size.height))
        })
        .unwrap_or((1280.0, 800.0));

    with_browser(app, |b| {
        let x = b.sidebar_width.max(0.0);
        let y = b.chrome_height.max(0.0);
        let w = (width - x - b.dock_width.max(0.0)).max(1.0);
        let h = (height - y).max(1.0);
        (LogicalPosition::new(x, y), LogicalSize::new(w, h))
    })
}

/// Positions the active tab and shows only that one.
pub fn apply_layout(app: &AppHandle) {
    let (position, size) = content_bounds(app);
    let (labels, visible_label) = with_browser(app, |b| {
        let labels: Vec<String> = b.tabs.iter().filter_map(Tab::label).collect();
        let visible = if b.overlay || b.webview_hidden {
            None
        } else {
            b.active_id
                .as_deref()
                .and_then(|id| b.tabs.iter().find(|t| t.id == id))
                .and_then(Tab::label)
        };
        (labels, visible)
    });

    let mut shown = None;
    for label in labels {
        let Some(webview) = app.get_webview(&label) else {
            continue;
        };
        if Some(&label) == visible_label.as_ref() {
            let _ = webview.set_position(position);
            let _ = webview.set_size(size);
            let _ = webview.show();
            shown = Some(webview.clone());
        } else {
            let _ = webview.hide();
        }
    }
    let focus = shown.is_some() && with_browser(app, |b| std::mem::take(&mut b.pending_content_focus));
    if let (true, Some(webview)) = (focus, shown) {
        let _ = webview.set_focus();
    }
}

/* ------------------------------------------------------------- Tab CRUD */

fn navigation_allowed(url: &Url) -> bool {
    matches!(url.scheme(), "http" | "https" | "about" | "blob" | "data" | "jtech")
}

fn favicon_guess(url: &Url) -> String {
    match (url.scheme(), url.host_str()) {
        ("http" | "https", Some(_)) if !newtab::is_internal(url.as_str()) => {
            format!("{}/favicon.ico", url.origin().ascii_serialization())
        }
        _ => String::new(),
    }
}

fn build_tab_webview(app: &AppHandle, id: &str, label: &str, url: Url) -> WebviewBuilder<tauri::Wry> {
    let app_new_window = app.clone();
    let app_title = app.clone();
    let app_load = app.clone();
    let id_title = id.to_string();
    let id_load = id.to_string();

    WebviewBuilder::new(label, WebviewUrl::External(url))
        .on_navigation(navigation_allowed)
        .on_new_window(move |url, _features| {
            // Links with target=_blank and window.open become new tabs.
            if navigation_allowed(&url) {
                let app = app_new_window.clone();
                tauri::async_runtime::spawn(async move {
                    if let Err(error) = create_tab(&app, url, true) {
                        crate::applog!("[tabs] could not open new window as tab: {error}");
                    }
                });
            }
            NewWindowResponse::Deny
        })
        .on_document_title_changed(move |_webview, title| {
            let history_title = title.clone();
            update_tab(&app_title, &id_title, |tab| {
                tab.title = if title.trim().is_empty() {
                    NEW_TAB_TITLE.to_string()
                } else {
                    title
                };
            });
            // Titles often arrive after the load finished.
            if let Some(url) = tab_url(&app_title, &id_title) {
                record_history(&app_title, &url, &history_title, true);
            }
        })
        .on_page_load(move |webview, payload| {
            let url = payload.url().clone();
            let event = payload.event();
            if matches!(event, PageLoadEvent::Started) {
                // Per-site zoom, like did-navigate in tabs.js.
                let host_zoom = site_zoom(&app_load, url.as_str());
                let changed = with_browser(&app_load, |b| {
                    let tab = b.tabs.iter_mut().find(|t| t.id == id_load)?;
                    let changed = (tab.zoom - host_zoom).abs() > 0.001;
                    tab.zoom = host_zoom;
                    Some(changed)
                });
                if changed == Some(true) {
                    tauri::async_runtime::spawn(async move {
                        let _ = webview.set_zoom(host_zoom);
                    });
                }
            }
            update_tab(&app_load, &id_load, |tab| {
                tab.url = url.to_string();
                match event {
                    PageLoadEvent::Started => {
                        tab.loading = true;
                        tab.favicon = favicon_guess(&url);
                    }
                    PageLoadEvent::Finished => tab.loading = false,
                }
                if newtab::is_internal(url.as_str()) {
                    tab.title = NEW_TAB_TITLE.to_string();
                }
            });
            if matches!(event, PageLoadEvent::Finished) {
                let title = tab_title(&app_load, &id_load).unwrap_or_default();
                record_history(&app_load, url.as_str(), &title, false);
            }
        })
}

/// Stored zoom for the URL's host (`settings.zoom`), 1 for other URLs.
fn site_zoom(app: &AppHandle, url: &str) -> f64 {
    app.try_state::<crate::settings::SettingsStore>()
        .map(|store| store.zoom_for(url))
        .unwrap_or(1.0)
}

fn tab_url(app: &AppHandle, id: &str) -> Option<String> {
    with_browser(app, |b| b.tabs.iter().find(|t| t.id == id).map(|t| t.url.clone()))
}

fn tab_title(app: &AppHandle, id: &str) -> Option<String> {
    with_browser(app, |b| b.tabs.iter().find(|t| t.id == id).map(|t| t.title.clone()))
}

/// Adds a visit of an http(s) page to history.json (or only updates the
/// newest entry's title) and sends the entry to the UI like main.js.
fn record_history(app: &AppHandle, url: &str, title: &str, title_only: bool) {
    let lower = url.to_ascii_lowercase();
    if !(lower.starts_with("http://") || lower.starts_with("https://")) || newtab::is_internal(url) {
        return;
    }
    let Some(store) = app.try_state::<crate::settings::SettingsStore>() else {
        return;
    };
    let entry = if title_only {
        store.history.update_title(url, title)
    } else {
        store.history.add(url, title)
    };
    if let Some(entry) = entry {
        emit_chrome(app, "history:entry", entry);
    }
}

/// Turns a resolved omnibox target into a loadable URL.
pub fn to_url(target: &str) -> Option<Url> {
    if target == crate::input::NEWTAB {
        return Some(newtab::newtab_url());
    }
    Url::parse(target).ok()
}

/// Gives a tab record a webview that loads `url`. Must not be called while
/// the state lock is held.
fn spawn_webview(app: &AppHandle, id: &str, url: Url) -> Result<(), String> {
    let window = app
        .get_window(WINDOW_LABEL)
        .ok_or_else(|| "main window is missing".to_string())?;
    let label = next_webview_label(id);
    let host_zoom = site_zoom(app, url.as_str());
    let zoom = with_browser(app, |b| {
        let tab = b.tabs.iter_mut().find(|t| t.id == id)?;
        tab.zoom = host_zoom;
        tab.webview_label = Some(label.clone());
        tab.sleeping = false;
        tab.loading = true;
        tab.url = url.to_string();
        if tab.favicon.is_empty() {
            tab.favicon = favicon_guess(&url);
        }
        Some(tab.zoom)
    });
    let Some(zoom) = zoom else {
        return Err("tab is gone".to_string());
    };

    let (position, size) = content_bounds(app);
    let builder = build_tab_webview(app, id, &label, url);
    let webview = match window.add_child(builder, position, size) {
        Ok(webview) => webview,
        Err(error) => {
            with_browser(app, |b| {
                if let Some(tab) = b.tabs.iter_mut().find(|t| t.id == id) {
                    tab.webview_label = None;
                    tab.sleeping = true;
                    tab.loading = false;
                }
            });
            return Err(error.to_string());
        }
    };
    // Hidden until apply_layout shows the active tab.
    let _ = webview.hide();
    if (zoom - 1.0).abs() > 0.001 {
        let _ = webview.set_zoom(zoom);
    }

    #[cfg(windows)]
    crate::webview2::attach(app, &webview, id.to_string());
    Ok(())
}

/// Creates a tab with a webview. Must not be called while the state lock is held.
pub fn create_tab(app: &AppHandle, url: Url, activate_tab: bool) -> Result<String, String> {
    let id = uuid::Uuid::new_v4().to_string();
    with_browser(app, |b| {
        let mut tab = Tab::record(id.clone(), url.to_string());
        tab.favicon = favicon_guess(&url);
        b.tabs.push(tab);
    });

    if let Err(error) = spawn_webview(app, &id, url) {
        with_browser(app, |b| b.tabs.retain(|t| t.id != id));
        emit_state(app);
        return Err(error);
    }

    let first = with_browser(app, |b| b.active_id.is_none());
    if activate_tab || first {
        activate(app, &id);
    } else {
        apply_layout(app);
        emit_state(app);
    }
    Ok(id)
}

/// Loads a sleeping tab again. Does nothing for tabs with a webview.
pub fn wake(app: &AppHandle, id: &str) -> Result<(), String> {
    let url = with_browser(app, |b| {
        let tab = b.tabs.iter().find(|t| t.id == id && t.sleeping)?;
        Some(tab.url.clone())
    });
    let Some(url) = url else {
        return Ok(());
    };
    let target = load_target(&url);
    spawn_webview(app, id, target)
}

/// URL to load for a stored tab URL: http(s) pages as they are, everything
/// else (start page, empty, unknown schemes) as the start page.
pub fn load_target(url: &str) -> Url {
    match Url::parse(url) {
        Ok(parsed) if matches!(parsed.scheme(), "http" | "https") && !newtab::is_internal(url) => parsed,
        _ => newtab::newtab_url(),
    }
}

pub fn activate(app: &AppHandle, id: &str) {
    let now = now_millis();
    let sleeping = with_browser(app, |b| {
        if !b.tabs.iter().any(|t| t.id == id) {
            return None;
        }
        // Idle time counts from leaving a tab.
        if let Some(previous) = b.active_id.clone() {
            if let Some(tab) = b.tabs.iter_mut().find(|t| t.id == previous) {
                tab.last_active_at = now;
            }
        }
        let tab = b.tabs.iter_mut().find(|t| t.id == id)?;
        tab.last_active_at = now;
        b.active_id = Some(id.to_string());
        Some(tab.sleeping)
    });
    let Some(sleeping) = sleeping else {
        return;
    };
    if sleeping {
        if let Err(error) = wake(app, id) {
            crate::applog!("[tabs] could not wake tab: {error}");
        }
    }
    apply_layout(app);
    if let Some(webview) = webview_for(app, id) {
        if !content_hidden(app) {
            let _ = webview.set_focus();
        }
    }
    emit_state(app);
}

/// Destroys the webview of a background tab and keeps its record.
pub fn sleep(app: &AppHandle, id: &str) {
    let label = with_browser(app, |b| {
        if b.active_id.as_deref() == Some(id) {
            return None;
        }
        let tab = b.tabs.iter_mut().find(|t| t.id == id && !t.sleeping)?;
        tab.sleeping = true;
        tab.audible = false;
        tab.loading = false;
        tab.webview_label.take()
    });
    let Some(label) = label else {
        return;
    };
    if let Some(webview) = app.get_webview(&label) {
        let _ = webview.close();
    }
    emit_state(app);
}

/// Tabs that may be put to sleep: not active, not pinned, not audible, not
/// already sleeping, and unused for at least `max_idle_ms`.
pub fn idle_tab_ids(tabs: &[Tab], active_id: Option<&str>, now: u64, max_idle_ms: u64) -> Vec<String> {
    if max_idle_ms == 0 {
        return Vec::new();
    }
    tabs.iter()
        .filter(|t| Some(t.id.as_str()) != active_id)
        .filter(|t| !t.pinned && !t.audible && !t.sleeping)
        .filter(|t| now.saturating_sub(t.last_active_at) >= max_idle_ms)
        .map(|t| t.id.clone())
        .collect()
}

/// Port of `sleepIdleTabs`. Returns how many tabs were put to sleep.
pub fn sleep_idle_tabs(app: &AppHandle, max_idle_ms: u64) -> usize {
    let ids = with_browser(app, |b| idle_tab_ids(&b.tabs, b.active_id.as_deref(), now_millis(), max_idle_ms));
    for id in &ids {
        sleep(app, id);
    }
    ids.len()
}

/// Checks every minute for idle tabs (`ui.autoSleepMinutes`, 0 = off).
pub fn start_auto_sleep(app: &AppHandle) {
    let app = app.clone();
    std::thread::spawn(move || {
        loop {
            std::thread::sleep(std::time::Duration::from_secs(60));
            let minutes = app
                .try_state::<crate::settings::SettingsStore>()
                .map(|store| store.section("ui"))
                .and_then(|ui| ui.get("autoSleepMinutes").and_then(Value::as_u64))
                .unwrap_or(30);
            let count = sleep_idle_tabs(&app, minutes * 60 * 1000);
            if count > 0 {
                crate::applog!("[tabs] {count} idle tab(s) put to sleep after {minutes} min");
            }
        }
    });
}

/* -------------------------------------------------------- Session restore */

/// One tab from session.json.
#[derive(Debug, Clone, PartialEq)]
pub struct StoredTab {
    pub url: String,
    pub title: String,
    pub favicon: String,
    pub pinned: bool,
    pub group_id: Option<String>,
    pub muted: bool,
    pub zoom: f64,
    pub volume: f64,
}

/// Reads session.json (the `tabs:state` shape). Returns the tabs and the
/// index of the tab that loads right away; all others stay lazy. Same rules
/// as main.js: the stored active tab, else the first one.
pub fn parse_session(session: &Value) -> (Vec<StoredTab>, usize) {
    let Some(list) = session.get("tabs").and_then(Value::as_array) else {
        return (Vec::new(), 0);
    };
    let active_id = session.get("activeId").and_then(Value::as_str).filter(|id| !id.is_empty());
    let mut tabs = Vec::new();
    let mut active_index = None;
    for entry in list.iter().filter(|e| e.is_object()) {
        let text = |key: &str| entry.get(key).and_then(Value::as_str).unwrap_or("").to_string();
        let url = text("url");
        let url = if url.is_empty() { crate::input::NEWTAB.to_string() } else { url };
        let id = text("id");
        if active_index.is_none() && !id.is_empty() && Some(id.as_str()) == active_id {
            active_index = Some(tabs.len());
        }
        let zoom = entry.get("zoom").and_then(Value::as_f64).filter(|z| z.is_finite() && *z > 0.0);
        let volume = entry.get("volume").and_then(Value::as_f64).filter(|v| v.is_finite());
        tabs.push(StoredTab {
            title: text("title"),
            favicon: text("favicon"),
            pinned: entry.get("pinned").and_then(Value::as_bool).unwrap_or(false),
            group_id: entry.get("groupId").and_then(Value::as_str).map(str::to_string),
            muted: entry.get("muted").and_then(Value::as_bool).unwrap_or(false),
            zoom: zoom.map(|z| z.clamp(ZOOM_LEVELS[0], ZOOM_LEVELS[ZOOM_LEVELS.len() - 1])).unwrap_or(1.0),
            // Only a boost above 100 % is restored (the page owns normal volume).
            volume: volume.filter(|v| *v > 1.0001).map(|v| v.min(3.0)).unwrap_or(1.0),
            url,
        });
    }
    (tabs, active_index.unwrap_or(0))
}

/// Turns stored tabs into sleeping records (no webviews yet).
pub fn lazy_records(stored: &[StoredTab]) -> Vec<Tab> {
    stored
        .iter()
        .map(|entry| {
            let target = load_target(&entry.url);
            let is_new_tab = newtab::is_internal(target.as_str());
            let mut tab = Tab::record(uuid::Uuid::new_v4().to_string(), target.to_string());
            tab.title = if !entry.title.trim().is_empty() {
                entry.title.clone()
            } else if is_new_tab {
                NEW_TAB_TITLE.to_string()
            } else {
                entry.url.clone()
            };
            let favicon = entry.favicon.trim();
            if favicon.starts_with("http://") || favicon.starts_with("https://") || favicon.starts_with("data:image/") {
                tab.favicon = favicon.to_string();
            }
            tab.pinned = entry.pinned;
            tab.group_id = if entry.pinned { None } else { entry.group_id.clone() };
            tab.muted = entry.muted;
            tab.zoom = entry.zoom;
            tab.volume = entry.volume;
            tab
        })
        .collect()
}

/// Restores session.json: every tab appears in the list, only the last
/// active one loads. Returns false when there was nothing to restore.
pub fn restore_session(app: &AppHandle, session: &Value) -> bool {
    let (stored, active_index) = parse_session(session);
    if stored.is_empty() {
        return false;
    }
    let records = lazy_records(&stored);
    let active = records.get(active_index).or_else(|| records.first()).map(|t| t.id.clone());
    with_browser(app, |b| b.tabs.extend(records));
    match active {
        Some(id) => activate(app, &id),
        None => emit_state(app),
    }
    true
}

pub const SESSION_FILE: &str = "session.json";

/// Writes session.json next to settings.json when `ui.restoreSession` is on.
pub fn save_session(app: &AppHandle) {
    let Some(store) = app.try_state::<crate::settings::SettingsStore>() else {
        return;
    };
    let enabled = store.section("ui").get("restoreSession").and_then(Value::as_bool).unwrap_or(true);
    if !enabled {
        return;
    }
    let path = store.dir().join(SESSION_FILE);
    if let Err(error) = crate::settings::write_json_atomic(&path, &session_value(app)) {
        crate::applog!("[tabs] could not save session: {error}");
    }
}

/// Reads session.json if `ui.restoreSession` is on.
pub fn read_session(app: &AppHandle) -> Option<Value> {
    let store = app.try_state::<crate::settings::SettingsStore>()?;
    let enabled = store.section("ui").get("restoreSession").and_then(Value::as_bool).unwrap_or(true);
    if !enabled {
        return None;
    }
    let text = std::fs::read_to_string(store.dir().join(SESSION_FILE)).ok()?;
    serde_json::from_str(&text).ok()
}

/// The current tab list in the `tabs:state` shape, for session.json.
pub fn session_value(app: &AppHandle) -> Value {
    let payload = with_browser(app, |b| state_payload(b));
    serde_json::to_value(payload).unwrap_or(Value::Null)
}

pub fn close_tab(app: &AppHandle, id: &str) -> Result<(), String> {
    let closed = with_browser(app, |b| {
        let index = b.tabs.iter().position(|t| t.id == id)?;
        let tab = b.tabs.remove(index);
        if !tab.is_new_tab() && !tab.url.starts_with("data:") && !tab.url.is_empty() {
            b.closed_history.push(tab.url.clone());
            let excess = b.closed_history.len().saturating_sub(MAX_CLOSED_HISTORY);
            b.closed_history.drain(..excess);
        }
        if b.active_id.as_deref() == Some(id) {
            let next = b.tabs.get(index).or_else(|| b.tabs.last());
            b.active_id = next.map(|t| t.id.clone());
        }
        let next = b.active_id.clone();
        Some((tab.label(), b.tabs.is_empty(), next))
    });
    let Some((label, empty, next)) = closed else {
        return Ok(());
    };

    if let Some(webview) = label.and_then(|label| app.get_webview(&label)) {
        let _ = webview.close();
    }

    if empty {
        // Same as Electron: closing the last tab opens a fresh start page.
        create_tab(app, newtab::newtab_url(), true)?;
        focus_omnibox(app);
    } else if let Some(next) = next {
        // Wakes the neighbour if it was sleeping.
        activate(app, &next);
    } else {
        apply_layout(app);
        emit_state(app);
    }
    Ok(())
}

/// The active tab's webview, if any.
pub fn active_webview(app: &AppHandle) -> Option<tauri::Webview> {
    let id = active_id(app)?;
    webview_for(app, &id)
}

/// Loads `url` in the active tab (waking it if needed). Returns false when
/// there is no active tab.
pub fn navigate_active(app: &AppHandle, url: Url) -> Result<bool, String> {
    let Some(id) = active_id(app) else {
        return Ok(false);
    };
    let sleeping = with_browser(app, |b| {
        let tab = b.tabs.iter_mut().find(|t| t.id == id)?;
        tab.url = url.to_string();
        tab.loading = true;
        Some(tab.sleeping)
    });
    match sleeping {
        None => return Ok(false),
        Some(true) => {
            spawn_webview(app, &id, url)?;
            apply_layout(app);
        }
        Some(false) => {
            if let Some(webview) = webview_for(app, &id) {
                webview.navigate(url).map_err(|e| e.to_string())?;
                focus_content(app);
            }
        }
    }
    emit_state(app);
    Ok(true)
}

pub fn active_id(app: &AppHandle) -> Option<String> {
    with_browser(app, |b| b.active_id.clone())
}

pub fn tab_count(app: &AppHandle) -> usize {
    with_browser(app, |b| b.tabs.len())
}

/// The webview of a tab, if it has one.
pub fn webview_for(app: &AppHandle, id: &str) -> Option<tauri::Webview> {
    let label = with_browser(app, |b| b.tabs.iter().find(|t| t.id == id).and_then(Tab::label))?;
    app.get_webview(&label)
}

/// URL of the active tab as the user sees it (empty for the start page).
pub fn active_url(app: &AppHandle) -> Option<String> {
    with_browser(app, |b| {
        let id = b.active_id.as_deref()?;
        let tab = b.tabs.iter().find(|t| t.id == id)?;
        Some(if tab.is_new_tab() { String::new() } else { tab.url.clone() })
    })
}

pub fn overlay_open(app: &AppHandle) -> bool {
    with_browser(app, |b| b.overlay)
}

/// Activates the next (`1`) or previous (`-1`) tab, wrapping around.
pub fn cycle(app: &AppHandle, direction: isize) -> Result<(), String> {
    let next = with_browser(app, |b| {
        let len = b.tabs.len() as isize;
        if len < 2 {
            return None;
        }
        let index = b
            .active_id
            .as_deref()
            .and_then(|id| b.tabs.iter().position(|t| t.id == id))
            .map(|i| i as isize)
            .unwrap_or(-1);
        let next = (index + direction).rem_euclid(len) as usize;
        Some(b.tabs[next].id.clone())
    });
    if let Some(id) = next {
        activate(app, &id);
    }
    Ok(())
}

/// Opens the most recently closed tab again (or a start page).
pub fn reopen_closed(app: &AppHandle) -> Result<(), String> {
    let url = with_browser(app, |b| b.closed_history.pop());
    let target = url
        .and_then(|u| Url::parse(&u).ok())
        .unwrap_or_else(newtab::newtab_url);
    create_tab(app, target, true).map(|_| ())
}

/// Zoom levels, same as `TabManager.zoom` in tabs.js.
pub const ZOOM_LEVELS: &[f64] = &[
    0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0,
];

/// Next zoom factor for `in`, `out`, `reset` or `set` (with `value`).
/// Unknown actions return `None`.
pub fn next_zoom(current: f64, action: &str, value: Option<f64>) -> Option<f64> {
    let current = if current.is_finite() && current > 0.0 { current } else { 1.0 };
    let first = ZOOM_LEVELS[0];
    let last = ZOOM_LEVELS[ZOOM_LEVELS.len() - 1];
    let next = match action {
        "reset" => 1.0,
        "in" => ZOOM_LEVELS.iter().copied().find(|l| *l > current + 0.01).unwrap_or(last),
        "out" => ZOOM_LEVELS.iter().rev().copied().find(|l| *l < current - 0.01).unwrap_or(first),
        "set" => {
            let v = value.filter(|v| v.is_finite() && *v != 0.0).unwrap_or(1.0);
            v.clamp(first, last)
        }
        _ => return None,
    };
    Some((next * 100.0).round() / 100.0)
}

/// Changes the zoom of the active tab.
pub fn zoom(app: &AppHandle, action: &str, value: Option<f64>) -> Result<(), String> {
    let target = with_browser(app, |b| {
        let id = b.active_id.clone()?;
        let tab = b.tabs.iter_mut().find(|t| t.id == id)?;
        let next = next_zoom(tab.zoom, action, value)?;
        tab.zoom = next;
        Some((tab.label(), next, tab.url.clone()))
    });
    let Some((label, factor, url)) = target else {
        return Ok(());
    };
    // Remembered per host like setZoomFactor in config.js (http(s) only).
    if let Some(store) = app.try_state::<crate::settings::SettingsStore>() {
        store.set_zoom_for(&url, factor);
    }
    if let Some(webview) = label.and_then(|label| app.get_webview(&label)) {
        webview.set_zoom(factor).map_err(|e| e.to_string())?;
    }
    emit_state(app);
    Ok(())
}

pub fn focus_omnibox(app: &AppHandle) {
    if let Some(chrome) = app.get_webview(CHROME_LABEL) {
        let _ = chrome.set_focus();
    }
    emit_chrome(app, "ui:focus-omnibox", Value::Null);
}

pub fn set_layout(app: &AppHandle, chrome_height: Option<f64>, sidebar_width: Option<f64>) {
    let overlay = with_browser(app, |b| {
        if let Some(height) = chrome_height.filter(|v| v.is_finite()) {
            b.chrome_height = height.max(0.0).round();
        }
        if let Some(width) = sidebar_width.filter(|v| v.is_finite()) {
            b.sidebar_width = width.max(0.0).round();
        }
        b.overlay
    });
    if !overlay {
        apply_layout(app);
    }
}

pub fn set_dock(app: &AppHandle, width: f64) {
    if !width.is_finite() {
        return;
    }
    with_browser(app, |b| b.dock_width = width.max(0.0).round());
    apply_layout(app);
}

/// Moves keyboard focus to the chrome UI. Called before a tab webview is
/// hidden: a hidden window keeps the Win32 keyboard focus, so keys typed
/// into the UI (e.g. the settings) would otherwise go to the invisible page.
fn focus_chrome(app: &AppHandle) {
    if let Some(chrome) = app.get_webview(CHROME_LABEL) {
        let _ = chrome.set_focus();
    }
}

/// Focuses the active page, or remembers the request while the page is
/// hidden (never give focus to an invisible webview).
pub fn focus_content(app: &AppHandle) {
    let hidden = with_browser(app, |b| {
        let hidden = b.overlay || b.webview_hidden;
        b.pending_content_focus = hidden;
        hidden
    });
    if !hidden {
        if let Some(webview) = active_webview(app) {
            let _ = webview.set_focus();
        }
    }
}

/// True while the tab webviews are hidden behind an overlay or by the UI.
pub fn content_hidden(app: &AppHandle) -> bool {
    with_browser(app, |b| b.overlay || b.webview_hidden)
}

pub fn set_overlay(app: &AppHandle, open: bool) {
    let changed = with_browser(app, |b| std::mem::replace(&mut b.overlay, open) != open);
    if open && changed {
        focus_chrome(app);
    }
    apply_layout(app);
}

pub fn set_webview_visible(app: &AppHandle, visible: bool) {
    let changed = with_browser(app, |b| std::mem::replace(&mut b.webview_hidden, !visible) == visible);
    if !visible && changed {
        focus_chrome(app);
    }
    apply_layout(app);
}

/* --------------------------------------------------------- Window events */

pub fn window_state(app: &AppHandle) -> Value {
    let maximized = app
        .get_window(WINDOW_LABEL)
        .and_then(|w| w.is_maximized().ok())
        .unwrap_or(false);
    json!({ "maximized": maximized })
}

pub fn on_window_event(app: &AppHandle, event: &WindowEvent) {
    match event {
        WindowEvent::Resized(_) | WindowEvent::ScaleFactorChanged { .. } => {
            apply_layout(app);
            let state = window_state(app);
            let maximized = state["maximized"].as_bool().unwrap_or(false);
            let changed = with_browser(app, |b| {
                let changed = b.maximized != maximized;
                b.maximized = maximized;
                changed
            });
            if changed {
                emit_chrome(app, "window:state", state);
            }
            let fullscreen = app
                .get_window(WINDOW_LABEL)
                .and_then(|w| w.is_fullscreen().ok())
                .unwrap_or(false);
            let fullscreen_changed = with_browser(app, |b| {
                let changed = b.fullscreen != fullscreen;
                b.fullscreen = fullscreen;
                changed
            });
            if fullscreen_changed {
                emit_chrome(app, "window:fullscreen", json!({ "fullscreen": fullscreen }));
            }
        }
        WindowEvent::Focused(focused) => emit_chrome(app, "window:focus", *focused),
        WindowEvent::CloseRequested { .. } => {
            save_session(app);
            if let Some(store) = app.try_state::<crate::settings::SettingsStore>() {
                store.history.flush();
            }
        }
        _ => {}
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn zoom_steps_like_electron() {
        assert_eq!(next_zoom(1.0, "in", None), Some(1.1));
        assert_eq!(next_zoom(1.0, "out", None), Some(0.9));
        assert_eq!(next_zoom(1.05, "in", None), Some(1.1));
        assert_eq!(next_zoom(3.0, "in", None), Some(3.0));
        assert_eq!(next_zoom(0.25, "out", None), Some(0.25));
        assert_eq!(next_zoom(1.75, "reset", None), Some(1.0));
        assert_eq!(next_zoom(1.0, "set", Some(9.0)), Some(3.0));
        assert_eq!(next_zoom(1.0, "set", Some(1.234)), Some(1.23));
        assert_eq!(next_zoom(1.0, "set", None), Some(1.0));
        assert_eq!(next_zoom(f64::NAN, "in", None), Some(1.1));
        assert_eq!(next_zoom(1.0, "bogus", None), None);
    }
}

#[cfg(test)]
mod session_tests {
    use super::*;
    use serde_json::json;

    fn tab(id: &str, last: u64) -> Tab {
        let mut tab = Tab::record(id.to_string(), "https://example.com/".to_string());
        tab.sleeping = false;
        tab.last_active_at = last;
        tab
    }

    #[test]
    fn restore_loads_only_the_stored_active_tab() {
        let session = json!({
            "activeId": "b",
            "tabs": [
                { "id": "a", "url": "", "title": "" },
                { "id": "b", "url": "https://example.com/x", "title": "X", "zoom": 1.5, "pinned": true, "groupId": "g" },
                { "id": "c", "url": "javascript:alert(1)", "title": "", "volume": 2.5, "muted": true },
                "junk"
            ]
        });
        let (stored, active) = parse_session(&session);
        assert_eq!(stored.len(), 3);
        assert_eq!(active, 1);
        assert_eq!(stored[0].url, crate::input::NEWTAB);
        assert_eq!(stored[1].zoom, 1.5);
        assert_eq!(stored[2].volume, 2.5);

        let records = lazy_records(&stored);
        assert!(records.iter().all(|t| t.sleeping && t.webview_label.is_none()));
        assert!(records[0].is_new_tab());
        assert_eq!(records[0].title, NEW_TAB_TITLE);
        assert_eq!(records[1].title, "X");
        assert!(records[1].pinned);
        // Pinned tabs never keep a group (same as setPinned in tabs.js).
        assert_eq!(records[1].group_id, None);
        // Unsafe schemes become the start page.
        assert!(records[2].is_new_tab());
        assert!(records[2].muted);
    }

    #[test]
    fn restore_falls_back_to_first_tab() {
        let (stored, active) = parse_session(&json!({ "activeId": "zzz", "tabs": [{ "url": "https://a.test/" }, { "url": "https://b.test/" }] }));
        assert_eq!((stored.len(), active), (2, 0));
        let (stored, active) = parse_session(&json!({ "tabs": "nope" }));
        assert_eq!((stored.len(), active), (0, 0));
        let (stored, _) = parse_session(&json!({ "tabs": [{ "url": "https://a.test/", "zoom": 99 }] }));
        assert_eq!(stored[0].zoom, 3.0);
        assert_eq!(stored[0].volume, 1.0);
    }

    #[test]
    fn idle_selection_skips_active_pinned_audible_sleeping() {
        let minute = 60_000;
        let now = 100 * minute;
        let mut tabs = vec![
            tab("active", 0),
            tab("old", 0),
            tab("fresh", now - minute),
            tab("pinned", 0),
            tab("audible", 0),
            tab("sleeping", 0),
        ];
        tabs[3].pinned = true;
        tabs[4].audible = true;
        tabs[5].sleeping = true;
        assert_eq!(idle_tab_ids(&tabs, Some("active"), now, 30 * minute), vec!["old".to_string()]);
        assert!(idle_tab_ids(&tabs, Some("active"), now, 0).is_empty());
        assert_eq!(idle_tab_ids(&tabs, Some("active"), now, minute).len(), 2);
    }
}
