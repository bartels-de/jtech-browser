//! Tab manager: every browser tab is a child webview of the main window.
//!
//! Rust owns the tab state. The chrome UI receives it as `tabs:state` in the
//! same shape as `TabManager.getState()` in src/main/tabs.js.
//!
//! Locking rule: the state mutex is never held while calling into a webview
//! or window, because those calls can run webview callbacks that lock it too.

use std::sync::{Mutex, MutexGuard};

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
}

impl Tab {
    fn label(&self) -> String {
        tab_label(&self.id)
    }

    fn is_new_tab(&self) -> bool {
        self.url.is_empty() || newtab::is_internal(&self.url)
    }
}

pub fn tab_label(id: &str) -> String {
    format!("{TAB_PREFIX}{id}")
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
                    pinned: false,
                    group_id: None,
                    muted: false,
                    audible: false,
                    volume: 1.0,
                    volume_explicit: false,
                    media_active: false,
                    zoom: tab.zoom,
                    sleeping: false,
                }
            })
            .collect(),
    }
}

/// Sends an event to the chrome UI only (tab webviews never get IPC events).
pub fn emit_chrome<S: Serialize + Clone>(app: &AppHandle, event: &str, payload: S) {
    if let Err(error) = app.emit_to(EventTarget::webview(CHROME_LABEL), event, payload) {
        eprintln!("[tabs] could not emit {event}: {error}");
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
        let labels: Vec<String> = b.tabs.iter().map(Tab::label).collect();
        let visible = if b.overlay || b.webview_hidden {
            None
        } else {
            b.active_id.as_deref().map(tab_label)
        };
        (labels, visible)
    });

    for label in labels {
        let Some(webview) = app.get_webview(&label) else {
            continue;
        };
        if Some(&label) == visible_label.as_ref() {
            let _ = webview.set_position(position);
            let _ = webview.set_size(size);
            let _ = webview.show();
        } else {
            let _ = webview.hide();
        }
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

fn build_tab_webview(app: &AppHandle, id: &str, url: Url) -> WebviewBuilder<tauri::Wry> {
    let app_new_window = app.clone();
    let app_title = app.clone();
    let app_load = app.clone();
    let id_title = id.to_string();
    let id_load = id.to_string();

    WebviewBuilder::new(tab_label(id), WebviewUrl::External(url))
        .on_navigation(navigation_allowed)
        .on_new_window(move |url, _features| {
            // Links with target=_blank and window.open become new tabs.
            if navigation_allowed(&url) {
                let app = app_new_window.clone();
                tauri::async_runtime::spawn(async move {
                    if let Err(error) = create_tab(&app, url, true) {
                        eprintln!("[tabs] could not open new window as tab: {error}");
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
        .on_page_load(move |_webview, payload| {
            let url = payload.url().clone();
            let event = payload.event();
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

/// Creates a tab webview. Must not be called while the state lock is held.
pub fn create_tab(app: &AppHandle, url: Url, activate: bool) -> Result<String, String> {
    let window = app
        .get_window(WINDOW_LABEL)
        .ok_or_else(|| "main window is missing".to_string())?;
    let id = uuid::Uuid::new_v4().to_string();

    with_browser(app, |b| {
        b.tabs.push(Tab {
            id: id.clone(),
            url: url.to_string(),
            title: NEW_TAB_TITLE.to_string(),
            favicon: favicon_guess(&url),
            loading: true,
            can_go_back: false,
            can_go_forward: false,
            zoom: 1.0,
        });
    });

    let (position, size) = content_bounds(app);
    let builder = build_tab_webview(app, &id, url);
    let webview = match window.add_child(builder, position, size) {
        Ok(webview) => webview,
        Err(error) => {
            with_browser(app, |b| b.tabs.retain(|t| t.id != id));
            emit_state(app);
            return Err(error.to_string());
        }
    };

    #[cfg(windows)]
    crate::webview2::attach(app, &webview, id.clone());
    #[cfg(not(windows))]
    let _ = &webview;

    if activate {
        with_browser(app, |b| b.active_id = Some(id.clone()));
    }
    apply_layout(app);
    emit_state(app);
    Ok(id)
}

pub fn activate(app: &AppHandle, id: &str) {
    let changed = with_browser(app, |b| {
        if b.tabs.iter().any(|t| t.id == id) {
            b.active_id = Some(id.to_string());
            true
        } else {
            false
        }
    });
    if changed {
        apply_layout(app);
        emit_state(app);
    }
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
        Some((tab.label(), b.tabs.is_empty()))
    });
    let Some((label, empty)) = closed else {
        return Ok(());
    };

    if let Some(webview) = app.get_webview(&label) {
        let _ = webview.close();
    }

    if empty {
        // Same as Electron: closing the last tab opens a fresh start page.
        create_tab(app, newtab::newtab_url(), true)?;
        focus_omnibox(app);
    } else {
        apply_layout(app);
        emit_state(app);
    }
    Ok(())
}

/// The active tab's webview, if any.
pub fn active_webview(app: &AppHandle) -> Option<tauri::Webview> {
    let label = with_browser(app, |b| b.active_id.as_deref().map(tab_label))?;
    app.get_webview(&label)
}

pub fn active_id(app: &AppHandle) -> Option<String> {
    with_browser(app, |b| b.active_id.clone())
}

pub fn tab_count(app: &AppHandle) -> usize {
    with_browser(app, |b| b.tabs.len())
}

/// The webview of a tab, if it has one.
pub fn webview_for(app: &AppHandle, id: &str) -> Option<tauri::Webview> {
    let label = with_browser(app, |b| b.tabs.iter().find(|t| t.id == id).map(Tab::label))?;
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
        Some((tab.label(), next))
    });
    let Some((label, factor)) = target else {
        return Ok(());
    };
    if let Some(webview) = app.get_webview(&label) {
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

pub fn set_overlay(app: &AppHandle, open: bool) {
    with_browser(app, |b| b.overlay = open);
    apply_layout(app);
    if open {
        if let Some(chrome) = app.get_webview(CHROME_LABEL) {
            let _ = chrome.set_focus();
        }
    }
}

pub fn set_webview_visible(app: &AppHandle, visible: bool) {
    with_browser(app, |b| b.webview_hidden = !visible);
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
