//! `jtech://` URI scheme: serves the start page (src/renderer/newtab.html).
//!
//! On Windows, WebView2 exposes custom schemes as `http://<scheme>.localhost/`,
//! so the start page lives at `http://jtech.localhost/newtab` there.

use std::borrow::Cow;

use serde_json::{json, Value};
use tauri::http::{header::CONTENT_TYPE, Request, Response, StatusCode};
use tauri::{Manager, Url, UriSchemeContext, Wry};

use crate::settings::SettingsStore;
use crate::tabs::TAB_PREFIX;

pub const SCHEME: &str = "jtech";

const NEWTAB_HTML: &str = include_str!("../../src/renderer/newtab.html");

/// URL a tab webview loads for the start page.
pub fn newtab_url() -> Url {
    let raw = if cfg!(windows) {
        "http://jtech.localhost/newtab"
    } else {
        "jtech://localhost/newtab"
    };
    Url::parse(raw).expect("valid start page URL")
}

/// True for every URL served by the `jtech` scheme.
pub fn is_internal(url: &str) -> bool {
    let lower = url.to_ascii_lowercase();
    lower.starts_with("jtech:")
        || lower.starts_with("http://jtech.localhost")
        || lower.starts_with("https://jtech.localhost")
}

/// JSON that is safe to put inside an inline `<script>`.
fn script_json(value: &Value) -> String {
    value
        .to_string()
        .replace('<', "\\u003c")
        .replace('>', "\\u003e")
        .replace('&', "\\u0026")
        .replace('\u{2028}', "\\u2028")
        .replace('\u{2029}', "\\u2029")
}

/// Start page HTML with the same globals tabs.js injects in Electron.
fn render(settings: &Value) -> String {
    let search = settings
        .pointer("/search/urlTemplate")
        .cloned()
        .unwrap_or_else(|| json!("https://www.google.com/search?q=%s"));
    let user = settings.pointer("/ui/userName").cloned().unwrap_or_else(|| json!(""));
    let bangs = settings.get("bangs").cloned().unwrap_or_else(|| json!([]));
    let shortcuts = settings.get("shortcuts").cloned().unwrap_or_else(|| json!([]));

    let script = format!(
        "<script>window.__JTECH_SEARCH__={};window.__JTECH_BANGS__={};window.__JTECH_USER__={};window.__JTECH_SHORTCUTS__={};window.__JTECH_HISTORY__=[];</script>",
        script_json(&search),
        script_json(&bangs),
        script_json(&user),
        script_json(&shortcuts),
    );

    match NEWTAB_HTML.find("<head>") {
        Some(index) => {
            let at = index + "<head>".len();
            format!("{}{}{}", &NEWTAB_HTML[..at], script, &NEWTAB_HTML[at..])
        }
        None => format!("{script}{NEWTAB_HTML}"),
    }
}

fn respond(status: StatusCode, content_type: &str, body: Vec<u8>) -> Response<Cow<'static, [u8]>> {
    Response::builder()
        .status(status)
        .header(CONTENT_TYPE, content_type)
        .header("Cache-Control", "no-store")
        .body(Cow::Owned(body))
        .expect("valid response")
}

/// Protocol handler registered for the `jtech` scheme.
pub fn handle(ctx: UriSchemeContext<'_, Wry>, request: Request<Vec<u8>>) -> Response<Cow<'static, [u8]>> {
    // Only tab webviews may load the start page.
    if !ctx.webview_label().starts_with(TAB_PREFIX) {
        return respond(StatusCode::FORBIDDEN, "text/plain", b"forbidden".to_vec());
    }

    let uri = request.uri();
    let path = uri.path();
    // `jtech://newtab` arrives as host "newtab", the Windows form as path "/newtab".
    let is_newtab = path == "/newtab"
        || path == "/newtab/"
        || (uri.host() == Some("newtab") && (path.is_empty() || path == "/"));
    if !is_newtab {
        return respond(StatusCode::NOT_FOUND, "text/plain", b"not found".to_vec());
    }

    let settings = ctx
        .app_handle()
        .try_state::<SettingsStore>()
        .map(|store| store.snapshot())
        .unwrap_or_else(|| json!({}));
    respond(
        StatusCode::OK,
        "text/html; charset=utf-8",
        render(&settings).into_bytes(),
    )
}
