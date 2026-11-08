// No console window in release builds on Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
// The default settings are one large json! literal.
#![recursion_limit = "256"]

mod commands;
mod history;
mod input;
mod newtab;
mod settings;
mod tabs;
#[cfg(windows)]
mod webview2;

use tauri::webview::WebviewBuilder;
use tauri::window::WindowBuilder;
use tauri::{LogicalPosition, LogicalSize, Manager, Url, WebviewUrl};

use settings::SettingsStore;
use tabs::{BrowserState, CHROME_LABEL, WINDOW_LABEL};

/// The chrome UI may only show its own bundled pages.
fn chrome_navigation_allowed(url: &Url) -> bool {
    match url.scheme() {
        "tauri" => true,
        "http" | "https" => url.host_str() == Some("tauri.localhost"),
        "about" => true,
        _ => false,
    }
}

/// Gives the process the same AppUserModelID as the installer's shortcuts
/// (the bundle identifier). Windows then attributes the window and its
/// WebView2 helper processes to "JTech Browser" (taskbar, Task Manager)
/// instead of the WebView2 runtime.
#[cfg(windows)]
fn set_app_user_model_id() {
    #[link(name = "shell32")]
    extern "system" {
        fn SetCurrentProcessExplicitAppUserModelID(app_id: *const u16) -> i32;
    }
    let id: Vec<u16> = "com.jtech.browser".encode_utf16().chain(std::iter::once(0)).collect();
    // SAFETY: `id` is a NUL-terminated UTF-16 string that outlives the call.
    let result = unsafe { SetCurrentProcessExplicitAppUserModelID(id.as_ptr()) };
    if result < 0 {
        eprintln!("[main] could not set AppUserModelID: {result:#x}");
    }
}

fn main() {
    // Must run before the first window is created.
    #[cfg(windows)]
    set_app_user_model_id();

    tauri::Builder::default()
        .manage(BrowserState::default())
        .register_uri_scheme_protocol(newtab::SCHEME, newtab::handle)
        .invoke_handler(tauri::generate_handler![
            commands::chrome_ready,
            commands::new_tab,
            commands::close_tab,
            commands::activate_tab,
            commands::navigate,
            commands::go_back,
            commands::go_forward,
            commands::reload_tab,
            commands::stop_tab,
            commands::print_tab,
            commands::focus_content,
            commands::window_minimize,
            commands::window_toggle_maximize,
            commands::window_close,
            commands::window_start_dragging,
            commands::set_layout,
            commands::set_dock,
            commands::set_overlay,
            commands::toggle_webview,
            commands::get_settings,
            commands::save_settings,
            commands::save_theme,
            commands::get_update_status,
        ])
        .setup(|app| {
            let config_dir = app.path().app_config_dir()?;
            app.manage(SettingsStore::load(&config_dir));

            let window = WindowBuilder::new(app, WINDOW_LABEL)
                .title("JTech Browser")
                .inner_size(1280.0, 820.0)
                .min_inner_size(720.0, 480.0)
                .decorations(false)
                .center()
                .build()?;

            let scale = window.scale_factor()?;
            let size = window.inner_size()?.to_logical::<f64>(scale);

            let handle = app.handle().clone();
            let chrome = WebviewBuilder::new(
                CHROME_LABEL,
                WebviewUrl::App("renderer/index.html".into()),
            )
            .on_navigation(chrome_navigation_allowed)
            .on_new_window(move |url, _features| {
                // Links from the UI (changelog, help, ...) open as tabs.
                if matches!(url.scheme(), "http" | "https") {
                    let app = handle.clone();
                    tauri::async_runtime::spawn(async move {
                        let _ = tabs::create_tab(&app, url, true);
                    });
                }
                tauri::webview::NewWindowResponse::Deny
            })
            .auto_resize();
            window.add_child(
                chrome,
                LogicalPosition::new(0.0, 0.0),
                LogicalSize::new(size.width, size.height),
            )?;

            let handle = app.handle().clone();
            window.on_window_event(move |event| tabs::on_window_event(&handle, event));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running JTech Browser");
}
