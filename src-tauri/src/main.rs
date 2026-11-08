// No console window in release builds on Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
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

fn main() {
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
