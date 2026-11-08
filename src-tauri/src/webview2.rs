//! WebView2-specific tab events (Windows only).
//!
//! Tauri reports page loads and titles. WebView2 also tells us about URL
//! changes inside single-page apps, back/forward availability and favicons,
//! which the tab strip needs.

use tauri::{AppHandle, Webview};
use webview2_com::Microsoft::Web::WebView2::Win32::{
    ICoreWebView2, ICoreWebView2Controller, ICoreWebView2Settings9, ICoreWebView2_15, ICoreWebView2_8, COREWEBVIEW2_KEY_EVENT_KIND,
    COREWEBVIEW2_KEY_EVENT_KIND_KEY_DOWN, COREWEBVIEW2_KEY_EVENT_KIND_SYSTEM_KEY_DOWN,
};
use webview2_com::{
    take_pwstr, AcceleratorKeyPressedEventHandler, FaviconChangedEventHandler,
    HistoryChangedEventHandler, IsDocumentPlayingAudioChangedEventHandler,
    SourceChangedEventHandler,
};
use windows_core::{Interface, BOOL, PWSTR};

use crate::shortcuts::{self, KeyInput, Origin};
use crate::tabs::update_tab;

#[link(name = "user32")]
extern "system" {
    fn GetKeyState(virtual_key: i32) -> i16;
    fn MapVirtualKeyW(code: u32, map_type: u32) -> u32;
}

const VK_SHIFT: i32 = 0x10;
const VK_CONTROL: i32 = 0x11;
const VK_MENU: i32 = 0x12;
const VK_LWIN: i32 = 0x5B;
const VK_RWIN: i32 = 0x5C;
const MAPVK_VK_TO_CHAR: u32 = 2;

fn key_down(virtual_key: i32) -> bool {
    // SAFETY: GetKeyState only reads the calling thread's keyboard state.
    unsafe { GetKeyState(virtual_key) < 0 }
}

/// Builds a DOM-like key input from a WebView2 virtual-key code.
fn key_input(virtual_key: u32) -> Option<KeyInput> {
    // SAFETY: MapVirtualKeyW is a pure lookup in the active keyboard layout.
    let mapped = unsafe { MapVirtualKeyW(virtual_key, MAPVK_VK_TO_CHAR) } & 0x7FFF_FFFF;
    let key = shortcuts::vk_to_key(virtual_key, char::from_u32(mapped).filter(|_| mapped != 0))?;
    Some(KeyInput {
        key,
        ctrl: key_down(VK_CONTROL),
        alt: key_down(VK_MENU),
        shift: key_down(VK_SHIFT),
        meta: key_down(VK_LWIN) || key_down(VK_RWIN),
    })
}

/// Routes accelerator keys (Ctrl/Alt combos, F-keys, Escape, ...) of one
/// webview through the hotkey table. Matched keys are marked handled so
/// neither the page nor WebView2's own shortcuts see them.
fn register_accelerators(controller: &ICoreWebView2Controller, app: &AppHandle, origin: Origin) -> windows_core::Result<()> {
    let app = app.clone();
    let handler = AcceleratorKeyPressedEventHandler::create(Box::new(move |_sender, args| {
        let Some(args) = args else {
            return Ok(());
        };
        let mut kind = COREWEBVIEW2_KEY_EVENT_KIND::default();
        let mut virtual_key = 0u32;
        unsafe {
            args.KeyEventKind(&mut kind)?;
            args.VirtualKey(&mut virtual_key)?;
        }
        if kind != COREWEBVIEW2_KEY_EVENT_KIND_KEY_DOWN && kind != COREWEBVIEW2_KEY_EVENT_KIND_SYSTEM_KEY_DOWN {
            return Ok(());
        }
        if let Some(input) = key_input(virtual_key) {
            if shortcuts::handle(&app, &input, origin.clone()) {
                unsafe { args.SetHandled(true)? };
            }
        }
        Ok(())
    }));
    let mut token = 0i64;
    unsafe { controller.add_AcceleratorKeyPressed(&handler, &mut token)? };
    Ok(())
}

/// Turns off WebView2's own handling of `app-region: drag` (wry enables
/// it). In a child webview it neither moves the top-level window nor lets
/// the clicks through, so the title bar could not be dragged at all. With
/// it off, the bridge sees the mousedown and starts a native window drag.
/// Returns true when the page has to be reloaded for the change to apply.
fn disable_native_drag_regions(controller: &ICoreWebView2Controller) -> windows_core::Result<bool> {
    let core = unsafe { controller.CoreWebView2()? };
    let settings = unsafe { core.Settings()? };
    let Ok(settings9) = settings.cast::<ICoreWebView2Settings9>() else {
        return Ok(false);
    };
    let mut enabled = BOOL::default();
    unsafe { settings9.IsNonClientRegionSupportEnabled(&mut enabled)? };
    if !enabled.as_bool() {
        return Ok(false);
    }
    unsafe {
        settings9.SetIsNonClientRegionSupportEnabled(false)?;
        core.Reload()?;
    }
    Ok(true)
}

/// Hotkeys and window dragging for the chrome UI webview.
pub fn attach_chrome(app: &AppHandle, webview: &Webview) {
    let app = app.clone();
    let result = webview.with_webview(move |platform| {
        let controller = platform.controller();
        if let Err(error) = disable_native_drag_regions(&controller) {
            eprintln!("[webview2] could not change drag region support: {error}");
        }
        if let Err(error) = register_accelerators(&controller, &app, Origin::Chrome) {
            eprintln!("[webview2] could not register chrome hotkeys: {error}");
        }
    });
    if let Err(error) = result {
        eprintln!("[webview2] with_webview failed: {error}");
    }
}

/// Registers the WebView2 event handlers for one tab webview.
pub fn attach(app: &AppHandle, webview: &Webview, id: String) {
    let app = app.clone();
    let result = webview.with_webview(move |platform| {
        let controller = platform.controller();
        if let Err(error) = register_accelerators(&controller, &app, Origin::Content(id.clone())) {
            eprintln!("[webview2] could not register tab hotkeys: {error}");
        }
        let core = match unsafe { controller.CoreWebView2() } {
            Ok(core) => core,
            Err(error) => {
                eprintln!("[webview2] no CoreWebView2: {error}");
                return;
            }
        };
        if let Err(error) = register(&core, &app, &id) {
            eprintln!("[webview2] could not register tab events: {error}");
        }
    });
    if let Err(error) = result {
        eprintln!("[webview2] with_webview failed: {error}");
    }
}

fn register(core: &ICoreWebView2, app: &AppHandle, id: &str) -> windows_core::Result<()> {
    let mut token = 0i64;

    // URL changes, including history.pushState and hash changes.
    {
        let app = app.clone();
        let id = id.to_string();
        let handler = SourceChangedEventHandler::create(Box::new(move |sender, _args| {
            if let Some(sender) = sender {
                let mut raw = PWSTR::null();
                unsafe { sender.Source(&mut raw)? };
                let url = take_pwstr(raw);
                if !url.is_empty() && !url.starts_with("data:") {
                    update_tab(&app, &id, |tab| tab.url = url);
                }
            }
            Ok(())
        }));
        unsafe { core.add_SourceChanged(&handler, &mut token)? };
    }

    // Back/forward availability.
    {
        let app = app.clone();
        let id = id.to_string();
        let handler = HistoryChangedEventHandler::create(Box::new(move |sender, _args| {
            if let Some(sender) = sender {
                let mut back = BOOL::default();
                let mut forward = BOOL::default();
                unsafe {
                    sender.CanGoBack(&mut back)?;
                    sender.CanGoForward(&mut forward)?;
                }
                update_tab(&app, &id, |tab| {
                    tab.can_go_back = back.as_bool();
                    tab.can_go_forward = forward.as_bool();
                });
            }
            Ok(())
        }));
        unsafe { core.add_HistoryChanged(&handler, &mut token)? };
    }

    // Favicons (WebView2 runtime 1.0.1185+; skipped on older runtimes).
    if let Ok(core15) = core.cast::<ICoreWebView2_15>() {
        let app = app.clone();
        let id = id.to_string();
        let handler = FaviconChangedEventHandler::create(Box::new(move |sender, _args| {
            if let Some(sender) = sender.and_then(|s| s.cast::<ICoreWebView2_15>().ok()) {
                let mut raw = PWSTR::null();
                unsafe { sender.FaviconUri(&mut raw)? };
                let favicon = take_pwstr(raw);
                if favicon.starts_with("http://") || favicon.starts_with("https://") {
                    update_tab(&app, &id, |tab| tab.favicon = favicon);
                }
            }
            Ok(())
        }));
        unsafe { core15.add_FaviconChanged(&handler, &mut token)? };
    }

    // Audio state, so auto-sleep skips tabs that play sound (runtime 1.0.864+).
    if let Ok(core8) = core.cast::<ICoreWebView2_8>() {
        let app = app.clone();
        let id = id.to_string();
        let handler = IsDocumentPlayingAudioChangedEventHandler::create(Box::new(move |sender, _args| {
            if let Some(sender) = sender.and_then(|s| s.cast::<ICoreWebView2_8>().ok()) {
                let mut playing = BOOL::default();
                unsafe { sender.IsDocumentPlayingAudio(&mut playing)? };
                update_tab(&app, &id, |tab| tab.audible = playing.as_bool());
            }
            Ok(())
        }));
        unsafe { core8.add_IsDocumentPlayingAudioChanged(&handler, &mut token)? };
    }

    Ok(())
}
