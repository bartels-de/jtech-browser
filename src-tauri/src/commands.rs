//! Commands invoked by the chrome UI through src/renderer/js/tauri-bridge.js.
//!
//! Only the "chrome" webview may call these (see capabilities/default.json and
//! permissions/chrome.toml). They are async so webview creation never blocks
//! the main thread.

use serde_json::Value;
use tauri::{AppHandle, Manager};

use crate::input::{resolve_input, SearchConfig};
use crate::settings::{Collection, SettingsStore};
use crate::tabs::{self, emit_chrome, WINDOW_LABEL};

type CmdResult<T = ()> = Result<T, String>;

fn resolve(app: &AppHandle, raw: &str) -> Option<String> {
    let settings = app.state::<SettingsStore>().snapshot();
    let template = settings
        .pointer("/search/urlTemplate")
        .and_then(Value::as_str)
        .unwrap_or("https://www.google.com/search?q=%s");
    let bangs = settings
        .get("bangs")
        .and_then(Value::as_array)
        .map(Vec::as_slice)
        .unwrap_or(&[]);
    resolve_input(
        raw,
        &SearchConfig {
            url_template: template,
            bangs,
        },
    )
}

fn window(app: &AppHandle) -> CmdResult<tauri::Window> {
    app.get_window(WINDOW_LABEL)
        .ok_or_else(|| "main window is missing".to_string())
}

/* ------------------------------------------------------------------- Tabs */

/// Called once the chrome UI has registered its listeners. Sends the initial
/// window/theme/settings state and opens the first tab.
#[tauri::command]
pub async fn chrome_ready(app: AppHandle) -> CmdResult {
    let store = app.state::<SettingsStore>();
    emit_chrome(&app, "window:state", tabs::window_state(&app));
    emit_chrome(&app, "theme:update", store.theme());
    emit_chrome(&app, "settings:update", store.public());

    if tabs::tab_count(&app) == 0 {
        // Session restore: all tabs are listed, only the last active one loads.
        let restored = tabs::read_session(&app).is_some_and(|session| tabs::restore_session(&app, &session));
        if !restored {
            tabs::create_tab(&app, crate::newtab::newtab_url(), true)?;
            tabs::focus_omnibox(&app);
        }
    } else {
        tabs::apply_layout(&app);
        tabs::emit_state(&app);
    }
    Ok(())
}

#[tauri::command]
pub async fn new_tab(app: AppHandle, url: Option<String>) -> CmdResult {
    let requested = url.as_deref().map(str::trim).filter(|u| !u.is_empty());
    let target = requested
        .and_then(|raw| resolve(&app, raw))
        .and_then(|resolved| tabs::to_url(&resolved))
        .unwrap_or_else(crate::newtab::newtab_url);
    tabs::create_tab(&app, target, true)?;
    if requested.is_none() {
        tabs::focus_omnibox(&app);
    }
    Ok(())
}

#[tauri::command]
pub async fn close_tab(app: AppHandle, id: String) -> CmdResult {
    tabs::close_tab(&app, &id)
}

#[tauri::command]
pub async fn activate_tab(app: AppHandle, id: String) -> CmdResult {
    tabs::activate(&app, &id);
    Ok(())
}

#[tauri::command]
pub async fn navigate(app: AppHandle, input: String) -> CmdResult {
    let Some(url) = resolve(&app, &input).and_then(|target| tabs::to_url(&target)) else {
        return Ok(());
    };
    if !tabs::navigate_active(&app, url.clone())? {
        tabs::create_tab(&app, url, true)?;
    }
    Ok(())
}

fn eval_active(app: &AppHandle, script: &str) -> CmdResult {
    if let Some(webview) = tabs::active_webview(app) {
        webview.eval(script).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn go_back(app: AppHandle) -> CmdResult {
    eval_active(&app, "history.back()")
}

#[tauri::command]
pub async fn go_forward(app: AppHandle) -> CmdResult {
    eval_active(&app, "history.forward()")
}

#[tauri::command]
pub async fn reload_tab(app: AppHandle, hard: Option<bool>) -> CmdResult {
    if let Some(webview) = tabs::active_webview(&app) {
        if hard.unwrap_or(false) {
            // Bypass the cache like Electron's reloadIgnoringCache.
            webview
                .eval("location.reload(true)")
                .map_err(|e| e.to_string())?;
        } else {
            webview.reload().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn stop_tab(app: AppHandle) -> CmdResult {
    eval_active(&app, "window.stop()")?;
    if let Some(id) = tabs::active_id(&app) {
        tabs::update_tab(&app, &id, |tab| tab.loading = false);
    }
    Ok(())
}

#[tauri::command]
pub async fn print_tab(app: AppHandle) -> CmdResult {
    if let Some(webview) = tabs::active_webview(&app) {
        webview.print().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn focus_content(app: AppHandle) -> CmdResult {
    tabs::focus_content(&app);
    Ok(())
}

/* ----------------------------------------------------------------- Window */

#[tauri::command]
pub async fn window_minimize(app: AppHandle) -> CmdResult {
    window(&app)?.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn window_toggle_maximize(app: AppHandle) -> CmdResult {
    let window = window(&app)?;
    let result = if window.is_maximized().unwrap_or(false) {
        window.unmaximize()
    } else {
        window.maximize()
    };
    result.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn window_close(app: AppHandle) -> CmdResult {
    window(&app)?.close().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn window_start_dragging(app: AppHandle) -> CmdResult {
    window(&app)?.start_dragging().map_err(|e| e.to_string())
}

/* ----------------------------------------------------------------- Layout */

#[tauri::command]
pub async fn set_layout(app: AppHandle, chrome_height: Option<f64>, sidebar_width: Option<f64>) -> CmdResult {
    tabs::set_layout(&app, chrome_height, sidebar_width);
    Ok(())
}

#[tauri::command]
pub async fn set_dock(app: AppHandle, width: f64) -> CmdResult {
    tabs::set_dock(&app, width);
    Ok(())
}

#[tauri::command]
pub async fn set_overlay(app: AppHandle, open: bool) -> CmdResult {
    tabs::set_overlay(&app, open);
    Ok(())
}

#[tauri::command]
pub async fn toggle_webview(app: AppHandle, visible: bool) -> CmdResult {
    tabs::set_webview_visible(&app, visible);
    Ok(())
}

/* --------------------------------------------------------------- Settings */

#[tauri::command]
pub async fn get_settings(app: AppHandle) -> CmdResult<Value> {
    Ok(app.state::<SettingsStore>().public())
}

#[tauri::command]
pub async fn save_settings(app: AppHandle, patch: Value) -> CmdResult<Value> {
    let next = app.state::<SettingsStore>().update(&patch);
    emit_chrome(&app, "settings:update", next.clone());
    Ok(next)
}

#[tauri::command]
pub async fn save_theme(app: AppHandle, theme: Value) -> CmdResult<Value> {
    let saved = app.state::<SettingsStore>().update_theme(&theme);
    emit_chrome(&app, "theme:update", saved.clone());
    Ok(saved)
}

/* ---------------------------------------------------------------- Updates */

/// Update status in the shape of `publicUpdateState()` in main.js. The
/// Tauri build has no updater yet, so it reports "unsupported" with a
/// reason that the UI shows instead of Electron's dev-mode text.
#[tauri::command]
pub async fn get_update_status(app: AppHandle) -> CmdResult<Value> {
    Ok(serde_json::json!({
        "state": "idle",
        "version": null,
        "percent": 0,
        "message": "",
        "lastCheck": 0,
        "current": app.package_info().version.to_string(),
        "supported": false,
        "unsupportedLabel": "Noch nicht verfügbar",
        "unsupportedReason": "Automatische Updates folgen in einer späteren Version. Neue Versionen bitte vorerst manuell installieren."
    }))
}

/* ------------------------------------------------------------------- Zoom */

/// `zoom(action, value)`: "in", "out", "reset" or "set" for the active tab.
#[tauri::command]
pub async fn zoom_tab(app: AppHandle, action: String, value: Option<f64>) -> CmdResult {
    tabs::zoom(&app, &action, value)
}

/* -------------------------------------- Favorites, saved pages, bookmarks */

/// Saves a list change and tells the UI (same as applySettingsUpdate).
fn publish(app: &AppHandle, settings: Value) -> CmdResult<Value> {
    emit_chrome(app, "settings:update", settings.clone());
    Ok(settings)
}

#[tauri::command]
pub async fn favorites_add(app: AppHandle, entry: Value) -> CmdResult<Value> {
    let next = app.state::<SettingsStore>().add_to(Collection::Favorites, &entry);
    publish(&app, next)
}

#[tauri::command]
pub async fn favorites_remove(app: AppHandle, id: String) -> CmdResult<Value> {
    let next = app.state::<SettingsStore>().remove_from(Collection::Favorites, &id);
    publish(&app, next)
}

#[tauri::command]
pub async fn saved_add(app: AppHandle, entry: Value) -> CmdResult<Value> {
    let next = app.state::<SettingsStore>().add_to(Collection::Saved, &entry);
    publish(&app, next)
}

#[tauri::command]
pub async fn saved_remove(app: AppHandle, id: String) -> CmdResult<Value> {
    let next = app.state::<SettingsStore>().remove_from(Collection::Saved, &id);
    publish(&app, next)
}

#[tauri::command]
pub async fn shortcuts_add(app: AppHandle, entry: Value) -> CmdResult<Value> {
    let next = app.state::<SettingsStore>().add_to(Collection::Shortcuts, &entry);
    publish(&app, next)
}

#[tauri::command]
pub async fn shortcuts_remove(app: AppHandle, id: String) -> CmdResult<Value> {
    let next = app.state::<SettingsStore>().remove_from(Collection::Shortcuts, &id);
    publish(&app, next)
}

#[tauri::command]
pub async fn bookmarks_add(app: AppHandle, entry: Value) -> CmdResult<Value> {
    let next = app.state::<SettingsStore>().add_bookmark(&entry);
    publish(&app, next)
}

#[tauri::command]
pub async fn bookmarks_remove(app: AppHandle, id: String) -> CmdResult<Value> {
    let next = app.state::<SettingsStore>().remove_bookmark(&id);
    publish(&app, next)
}

#[tauri::command]
pub async fn bookmarks_add_folder(app: AppHandle, name: String, parent_id: Option<String>) -> CmdResult<Value> {
    let next = app
        .state::<SettingsStore>()
        .add_bookmark_folder(&name, parent_id.as_deref());
    publish(&app, next)
}

#[tauri::command]
pub async fn bookmarks_remove_folder(app: AppHandle, id: String) -> CmdResult<Value> {
    let next = app.state::<SettingsStore>().remove_bookmark_folder(&id);
    publish(&app, next)
}
