//! Keyboard shortcuts (port of src/main/shortcuts.js and `handleShortcut`
//! in src/main/main.js).
//!
//! Hotkeys are strings like "Ctrl+Shift+T" from `settings.hotkeys`. On
//! Windows, WebView2 reports accelerator keys of every webview (chrome UI and
//! tabs) through `AcceleratorKeyPressed`; see webview2.rs. The matching here is
//! pure so it can be unit-tested.

use serde_json::Value;

/// One compiled accelerator.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Hotkey {
    pub action: String,
    pub key: String,
    pub ctrl: bool,
    pub alt: bool,
    pub shift: bool,
    pub meta: bool,
}

/// A key press, with the key named like DOM `KeyboardEvent.key`.
#[derive(Debug, Clone, Default)]
pub struct KeyInput {
    pub key: String,
    pub ctrl: bool,
    pub alt: bool,
    pub shift: bool,
    pub meta: bool,
}

/// Same aliases as `normalizeKey` in shortcuts.js.
pub fn normalize_key(key: &str) -> String {
    let lower = key.to_lowercase();
    let alias = match lower.as_str() {
        "esc" => "escape",
        "del" => "delete",
        "left" => "arrowleft",
        "right" => "arrowright",
        "up" => "arrowup",
        "down" => "arrowdown",
        "space" => " ",
        "plus" | "add" | "numpadadd" => "+",
        "subtract" | "numpadsubtract" => "-",
        _ => return lower,
    };
    alias.to_string()
}

/// Port of `parseAccelerator`. Returns `None` for empty input.
pub fn parse_accelerator(action: &str, accelerator: &str) -> Option<Hotkey> {
    let mut parts: Vec<String> = accelerator
        .split('+')
        .map(|part| part.trim().to_lowercase())
        .filter(|part| !part.is_empty())
        .collect();
    let key = parts.pop()?;
    let has = |names: &[&str]| parts.iter().any(|p| names.contains(&p.as_str()));
    Some(Hotkey {
        action: action.to_string(),
        key: normalize_key(&key),
        ctrl: has(&["ctrl", "control"]),
        alt: has(&["alt"]),
        shift: has(&["shift"]),
        meta: has(&["meta", "cmd", "super"]),
    })
}

/// Port of `compileHotkeys`: `{ action: ["Ctrl+T", ...] }` to a flat list.
pub fn compile(hotkeys: &Value) -> Vec<Hotkey> {
    let Some(map) = hotkeys.as_object() else {
        return Vec::new();
    };
    let mut compiled = Vec::new();
    for (action, accelerators) in map {
        let list: Vec<&Value> = match accelerators {
            Value::Array(items) => items.iter().collect(),
            other => vec![other],
        };
        for accelerator in list.into_iter().filter_map(Value::as_str) {
            if let Some(hotkey) = parse_accelerator(action, accelerator) {
                compiled.push(hotkey);
            }
        }
    }
    compiled
}

/// Port of `matchHotkey`: the action for a key press, if any.
pub fn match_hotkey<'a>(compiled: &'a [Hotkey], input: &KeyInput) -> Option<&'a str> {
    let key = normalize_key(&input.key);
    if key.is_empty() {
        return None;
    }
    compiled
        .iter()
        .find(|h| {
            h.key == key
                && h.ctrl == input.ctrl
                && h.alt == input.alt
                && h.shift == input.shift
                && h.meta == input.meta
        })
        .map(|h| h.action.as_str())
}

/// Names a Windows virtual-key code like DOM `KeyboardEvent.key` (lower case,
/// unshifted). `mapped` is the character the current keyboard layout gives
/// for the key (MapVirtualKey), used for punctuation keys.
pub fn vk_to_key(vk: u32, mapped: Option<char>) -> Option<String> {
    let named = match vk {
        0x08 => "backspace",
        0x09 => "tab",
        0x0D => "enter",
        0x1B => "escape",
        0x20 => " ",
        0x21 => "pageup",
        0x22 => "pagedown",
        0x23 => "end",
        0x24 => "home",
        0x25 => "arrowleft",
        0x26 => "arrowup",
        0x27 => "arrowright",
        0x28 => "arrowdown",
        0x2D => "insert",
        0x2E => "delete",
        0x6A => "*",
        0x6B => "+",
        0x6D => "-",
        0x6E => ".",
        0x6F => "/",
        _ => "",
    };
    if !named.is_empty() {
        return Some(named.to_string());
    }
    match vk {
        0x30..=0x39 | 0x41..=0x5A => char::from_u32(vk).map(|c| c.to_ascii_lowercase().to_string()),
        // Numpad digits.
        0x60..=0x69 => char::from_u32(vk - 0x60 + u32::from(b'0')).map(String::from),
        // F1..F24.
        0x70..=0x87 => Some(format!("f{}", vk - 0x6F)),
        // Modifier keys alone are never a hotkey.
        0x10..=0x12 | 0x5B | 0x5C | 0xA0..=0xA5 => None,
        _ => mapped
            .filter(|c| !c.is_control() && !c.is_whitespace())
            .map(|c| c.to_lowercase().to_string()),
    }
}

/// A printable key (optionally with Shift) and no Ctrl/Alt/Meta.
pub fn is_typing_key(input: &KeyInput) -> bool {
    !input.ctrl && !input.alt && !input.meta && input.key.chars().count() == 1
}

/* ------------------------------------------------------------- Actions */

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Origin {
    /// The chrome UI webview had focus.
    Chrome,
    /// A tab webview had focus.
    Content(String),
}

/// Matches a key press against `settings.hotkeys` and runs the action.
/// Returns true when the key was used (the webview must not handle it).
pub fn handle(app: &tauri::AppHandle, input: &KeyInput, origin: Origin) -> bool {
    use tauri::Manager;

    // Typing must never be swallowed: plain character keys are not hotkeys
    // (the hotkey editor only accepts Ctrl/Alt combos and function keys).
    if is_typing_key(input) {
        return false;
    }
    let Some(store) = app.try_state::<crate::settings::SettingsStore>() else {
        return false;
    };
    let compiled = compile(&store.section("hotkeys"));
    let Some(action) = match_hotkey(&compiled, input).map(str::to_string) else {
        return false;
    };
    // Same as Electron: while an overlay (settings, studio, ...) is open only
    // DevTools works, so the hotkey editor can record keys.
    if crate::tabs::overlay_open(app) && action != "devTools" {
        return false;
    }
    if !is_known(&action) {
        return false;
    }
    let app = app.clone();
    // Run outside the WebView2 callback: actions create and close webviews.
    tauri::async_runtime::spawn(async move {
        if let Err(error) = run(&app, &action, &origin).await {
            eprintln!("[shortcuts] {action} failed: {error}");
        }
    });
    true
}

const ACTIONS: &[&str] = &[
    "newTab",
    "closeTab",
    "reopenTab",
    "focusOmnibox",
    "reload",
    "hardReload",
    "back",
    "forward",
    "nextTab",
    "prevTab",
    "openSettings",
    "pictureInPicture",
    "commandPalette",
    "fullscreen",
    "print",
    "tabSearch",
    "findInPage",
    "zoomIn",
    "zoomOut",
    "zoomReset",
    "copyUrl",
    "taskManager",
    "devTools",
];

/// Actions this build can run ("splitView" is not ported yet).
pub fn is_known(action: &str) -> bool {
    ACTIONS.contains(&action)
}

fn focus_chrome_and_emit(app: &tauri::AppHandle, event: &str) {
    use tauri::Manager;
    if let Some(chrome) = app.get_webview(crate::tabs::CHROME_LABEL) {
        let _ = chrome.set_focus();
    }
    crate::tabs::emit_chrome(app, event, Value::Null);
}

const PIP_SCRIPT: &str = "(async()=>{const v=document.querySelector('video');if(!v)return;\
if(document.pictureInPictureElement){await document.exitPictureInPicture();return;}\
if(v.requestPictureInPicture)await v.requestPictureInPicture();})().catch(()=>{})";

async fn run(app: &tauri::AppHandle, action: &str, origin: &Origin) -> Result<(), String> {
    use crate::commands;
    use crate::tabs;
    use tauri::Manager;

    match action {
        "newTab" => commands::new_tab(app.clone(), None).await?,
        "closeTab" => {
            if let Some(id) = tabs::active_id(app) {
                tabs::close_tab(app, &id)?;
            }
        }
        "reopenTab" => tabs::reopen_closed(app)?,
        "focusOmnibox" => tabs::focus_omnibox(app),
        "reload" => commands::reload_tab(app.clone(), Some(false)).await?,
        "hardReload" => commands::reload_tab(app.clone(), Some(true)).await?,
        "back" => commands::go_back(app.clone()).await?,
        "forward" => commands::go_forward(app.clone()).await?,
        "nextTab" => tabs::cycle(app, 1)?,
        "prevTab" => tabs::cycle(app, -1)?,
        "openSettings" => focus_chrome_and_emit(app, "ui:open-settings"),
        "commandPalette" => focus_chrome_and_emit(app, "ui:command-palette"),
        "tabSearch" => focus_chrome_and_emit(app, "ui:tab-search"),
        "findInPage" => focus_chrome_and_emit(app, "ui:find-open"),
        "taskManager" => focus_chrome_and_emit(app, "ui:task-manager"),
        "pictureInPicture" => {
            if let Some(webview) = tabs::active_webview(app) {
                webview.eval(PIP_SCRIPT).map_err(|e| e.to_string())?;
            }
        }
        "fullscreen" => {
            if let Some(window) = app.get_window(tabs::WINDOW_LABEL) {
                let next = !window.is_fullscreen().unwrap_or(false);
                window.set_fullscreen(next).map_err(|e| e.to_string())?;
            }
        }
        "print" => commands::print_tab(app.clone()).await?,
        "zoomIn" => tabs::zoom(app, "in", None)?,
        "zoomOut" => tabs::zoom(app, "out", None)?,
        "zoomReset" => tabs::zoom(app, "reset", None)?,
        "copyUrl" => {
            let url = tabs::active_url(app).unwrap_or_default();
            let lower = url.to_ascii_lowercase();
            let copyable = lower.starts_with("http://") || lower.starts_with("https://");
            let copied = copyable && crate::clipboard::write_text(&url);
            let message = if copied {
                "Link kopiert"
            } else {
                "Diese Seite hat keinen Link zum Kopieren"
            };
            tabs::emit_chrome(app, "ui:toast", message);
        }
        "devTools" => {
            let target = match origin {
                Origin::Content(id) => tabs::webview_for(app, id),
                Origin::Chrome => app.get_webview(tabs::CHROME_LABEL),
            };
            if let Some(webview) = target {
                if webview.is_devtools_open() {
                    webview.close_devtools();
                } else {
                    webview.open_devtools();
                }
            }
        }
        _ => {}
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn key(key: &str, ctrl: bool, alt: bool, shift: bool) -> KeyInput {
        KeyInput {
            key: key.into(),
            ctrl,
            alt,
            shift,
            meta: false,
        }
    }

    #[test]
    fn parses_accelerators_like_electron() {
        let hotkey = parse_accelerator("x", "Ctrl+Shift+T").unwrap();
        assert_eq!(hotkey.key, "t");
        assert!(hotkey.ctrl && hotkey.shift && !hotkey.alt && !hotkey.meta);
        assert_eq!(parse_accelerator("x", "Alt+Left").unwrap().key, "arrowleft");
        assert_eq!(parse_accelerator("x", "Ctrl+NumpadAdd").unwrap().key, "+");
        assert_eq!(parse_accelerator("x", "Shift+Esc").unwrap().key, "escape");
        assert_eq!(parse_accelerator("x", "Ctrl+,").unwrap().key, ",");
        assert!(parse_accelerator("x", "").is_none());
        assert!(parse_accelerator("x", "+").is_none());
    }

    #[test]
    fn matches_default_hotkeys() {
        let compiled = compile(&crate::settings::defaults()["hotkeys"]);
        let m = |input: KeyInput| match_hotkey(&compiled, &input).map(str::to_string);
        assert_eq!(m(key("t", true, false, false)).as_deref(), Some("newTab"));
        assert_eq!(m(key("T", true, false, true)).as_deref(), Some("reopenTab"));
        assert_eq!(m(key("f5", false, false, false)).as_deref(), Some("reload"));
        assert_eq!(m(key("f5", true, false, false)).as_deref(), Some("hardReload"));
        assert_eq!(m(key("arrowleft", false, true, false)).as_deref(), Some("back"));
        assert_eq!(m(key("tab", true, false, true)).as_deref(), Some("prevTab"));
        assert_eq!(m(key("escape", false, false, true)).as_deref(), Some("taskManager"));
        assert_eq!(m(key("+", true, false, false)).as_deref(), Some("zoomIn"));
        assert_eq!(m(key("=", true, false, false)).as_deref(), Some("zoomIn"));
        assert_eq!(m(key("-", true, false, false)).as_deref(), Some("zoomOut"));
        assert_eq!(m(key(",", true, false, false)).as_deref(), Some("openSettings"));
        assert_eq!(m(key("t", false, false, false)), None);
        assert_eq!(m(key("t", true, true, false)), None);
    }

    #[test]
    fn custom_hotkeys_and_bad_values() {
        let compiled = compile(&json!({ "newTab": "Alt+N", "closeTab": [1, "Ctrl+Q"], "x": null }));
        assert_eq!(match_hotkey(&compiled, &key("n", false, true, false)), Some("newTab"));
        assert_eq!(match_hotkey(&compiled, &key("q", true, false, false)), Some("closeTab"));
        assert_eq!(compiled.len(), 2);
    }

    #[test]
    fn typing_keys_are_never_hotkeys() {
        assert!(is_typing_key(&key("m", false, false, false)));
        assert!(is_typing_key(&key("M", false, false, true)));
        assert!(is_typing_key(&key(" ", false, false, false)));
        assert!(!is_typing_key(&key("m", true, false, false)));
        assert!(!is_typing_key(&key("f5", false, false, false)));
        assert!(!is_typing_key(&key("escape", false, false, true)));
    }

    #[test]
    fn virtual_keys_map_to_dom_names() {
        assert_eq!(vk_to_key(0x54, None).as_deref(), Some("t"));
        assert_eq!(vk_to_key(0x30, None).as_deref(), Some("0"));
        assert_eq!(vk_to_key(0x74, None).as_deref(), Some("f5"));
        assert_eq!(vk_to_key(0x7B, None).as_deref(), Some("f12"));
        assert_eq!(vk_to_key(0x25, None).as_deref(), Some("arrowleft"));
        assert_eq!(vk_to_key(0x1B, None).as_deref(), Some("escape"));
        assert_eq!(vk_to_key(0x6B, None).as_deref(), Some("+"));
        assert_eq!(vk_to_key(0x6D, None).as_deref(), Some("-"));
        assert_eq!(vk_to_key(0x09, None).as_deref(), Some("tab"));
        // Punctuation depends on the layout (US "=", German "+").
        assert_eq!(vk_to_key(0xBB, Some('=')).as_deref(), Some("="));
        assert_eq!(vk_to_key(0xBB, Some('+')).as_deref(), Some("+"));
        assert_eq!(vk_to_key(0xBC, Some(',')).as_deref(), Some(","));
        assert_eq!(vk_to_key(0x11, None), None);
        assert_eq!(vk_to_key(0xBB, None), None);
    }
}
