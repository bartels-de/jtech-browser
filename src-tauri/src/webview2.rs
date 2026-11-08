//! WebView2-specific tab events (Windows only).
//!
//! Tauri reports page loads and titles. WebView2 also tells us about URL
//! changes inside single-page apps, back/forward availability and favicons,
//! which the tab strip needs.

use tauri::{AppHandle, Webview};
use webview2_com::Microsoft::Web::WebView2::Win32::{ICoreWebView2, ICoreWebView2_15};
use webview2_com::{
    take_pwstr, FaviconChangedEventHandler, HistoryChangedEventHandler, SourceChangedEventHandler,
};
use windows_core::{Interface, BOOL, PWSTR};

use crate::tabs::update_tab;

/// Registers the WebView2 event handlers for one tab webview.
pub fn attach(app: &AppHandle, webview: &Webview, id: String) {
    let app = app.clone();
    let result = webview.with_webview(move |platform| {
        let core = match unsafe { platform.controller().CoreWebView2() } {
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

    Ok(())
}
