//! Persistent settings, same `settings.json` format as src/main/config.js.
//!
//! The file is kept as a JSON value so unknown keys survive a round trip.
//! Known sections are checked against the defaults (type per field) before
//! they are stored. Writes are atomic: write `settings.json.tmp`, then rename.

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use serde_json::{json, Map, Value};

use crate::history::HistoryStore;

const THEME_VERSION: i64 = 2;

/// Sections that hold plain lists.
const LIST_KEYS: &[&str] = &[
    "favorites",
    "saved",
    "shortcuts",
    "bangs",
    "customThemes",
    "bookmarks",
    "bookmarkFolders",
    "tabGroups",
    "extensions",
];

/// Sections that are objects with a fixed set of typed fields.
const OBJECT_KEYS: &[&str] = &["privacy", "performance", "hotkeys"];

const SEARCH_ENGINES: &[(&str, &str)] = &[
    ("google", "https://www.google.com/search?q=%s"),
    ("duckduckgo", "https://duckduckgo.com/?q=%s"),
    ("bing", "https://www.bing.com/search?q=%s"),
    ("ecosia", "https://www.ecosia.org/search?q=%s"),
    ("startpage", "https://www.startpage.com/sp/search?query=%s"),
    ("brave", "https://search.brave.com/search?q=%s"),
];

/// Mirror of `DEFAULT_SETTINGS` in src/main/config.js.
pub fn defaults() -> Value {
    json!({
        "search": { "engine": "google", "urlTemplate": "https://www.google.com/search?q=%s" },
        "ui": {
            "tabLayout": "vertical",
            "favoritesBar": true,
            "sidebarWidth": 252,
            "restoreSession": true,
            "gamingMode": false,
            "userName": "",
            "density": "normal",
            "autoSleepMinutes": 30
        },
        "privacy": { "adblock": true, "trackingProtection": true },
        "performance": {
            "enabled": false,
            "cpuLimit": 50,
            "ramLimit": 0,
            "hardCap": true,
            "lowPriority": false
        },
        "favorites": [],
        "saved": [],
        "shortcuts": [],
        "bangs": [],
        "customThemes": [],
        "bookmarks": [],
        "bookmarkFolders": [],
        "tabGroups": [],
        "extensions": [],
        "zoom": {},
        "theme": {
            "accent": "#7c6cff",
            "accentAlt": "#22d3ee",
            "bg": "#0b0d17",
            "text": "#e7e9f5",
            "textDim": "#8b90ab",
            "stroke": 9,
            "shadow": 34,
            "saturation": 160,
            "font": "system",
            "fontSize": 100,
            "wallpaper": "",
            "glass": 0.7,
            "blur": 22,
            "radius": 12,
            "style": "default",
            "bgAnimation": "constellation",
            "animationSpeed": 100,
            "animationIntensity": 55,
            "glowIntensity": 50,
            "transitionSpeed": 100,
            "borderStyle": "default",
            "cursorEffect": "none",
            "cursorColor": "#7c6cff",
            "cursorSize": 16,
            "cursorIntensity": 60,
            "cursorImage": "",
            "cursorPreset": "",
            "customCssChrome": "",
            "customCssNewtab": ""
        },
        "hotkeys": {
            "newTab": ["Ctrl+T"],
            "closeTab": ["Ctrl+W"],
            "reopenTab": ["Ctrl+Shift+T"],
            "focusOmnibox": ["Ctrl+L", "Alt+D"],
            "reload": ["Ctrl+R", "F5"],
            "hardReload": ["Ctrl+Shift+R", "Ctrl+F5"],
            "back": ["Alt+Left"],
            "forward": ["Alt+Right"],
            "nextTab": ["Ctrl+Tab"],
            "prevTab": ["Ctrl+Shift+Tab"],
            "openSettings": ["Ctrl+,"],
            "pictureInPicture": ["Ctrl+Shift+P"],
            "splitView": ["Ctrl+\\"],
            "commandPalette": ["Ctrl+K"],
            "fullscreen": ["F11"],
            "print": ["Ctrl+P"],
            "tabSearch": ["Ctrl+Shift+A"],
            "findInPage": ["Ctrl+F"],
            "zoomIn": ["Ctrl+=", "Ctrl+NumpadAdd"],
            "zoomOut": ["Ctrl+-", "Ctrl+NumpadSubtract"],
            "zoomReset": ["Ctrl+0"],
            "devTools": ["F12", "Ctrl+Shift+I"],
            "taskManager": ["Shift+Escape"],
            "copyUrl": ["Ctrl+Shift+C"]
        }
    })
}

/// Same semantics as `mergeDeep` in config.js: objects merge recursively,
/// everything else (arrays included) is replaced.
pub fn merge_deep(base: &Value, over: &Value) -> Value {
    match (base, over) {
        (Value::Object(base_map), Value::Object(over_map)) => {
            let mut result = base_map.clone();
            for (key, value) in over_map {
                let merged = match (base_map.get(key), value) {
                    (Some(b @ Value::Object(_)), Value::Object(_)) => merge_deep(b, value),
                    _ => value.clone(),
                };
                result.insert(key.clone(), merged);
            }
            Value::Object(result)
        }
        _ => over.clone(),
    }
}

fn same_kind(a: &Value, b: &Value) -> bool {
    matches!(
        (a, b),
        (Value::Bool(_), Value::Bool(_))
            | (Value::Number(_), Value::Number(_))
            | (Value::String(_), Value::String(_))
            | (Value::Array(_), Value::Array(_))
            | (Value::Object(_), Value::Object(_))
    )
}

/// Keeps every field of `base`, taking the value from `input` when it has the
/// same JSON type. Unknown fields in `input` are dropped.
fn coerce_like(base: &Value, input: &Value) -> Value {
    let Some(base_map) = base.as_object() else {
        return base.clone();
    };
    let mut result = Map::new();
    for (key, fallback) in base_map {
        let value = match input.get(key) {
            Some(candidate) if same_kind(candidate, fallback) => candidate.clone(),
            _ => fallback.clone(),
        };
        result.insert(key.clone(), value);
    }
    Value::Object(result)
}

fn normalize_search(input: &Value, base: &Value) -> Value {
    let engine = input
        .get("engine")
        .and_then(Value::as_str)
        .filter(|e| *e == "custom" || SEARCH_ENGINES.iter().any(|(name, _)| name == e))
        .or_else(|| base.get("engine").and_then(Value::as_str))
        .unwrap_or("google");

    let valid_template = |value: Option<&Value>| -> Option<String> {
        let template = value?.as_str()?.trim();
        let lower = template.to_ascii_lowercase();
        let http = lower.starts_with("http://") || lower.starts_with("https://");
        (http && template.contains("%s") && !template.chars().any(char::is_whitespace))
            .then(|| template.to_string())
    };

    if engine == "custom" {
        let fallback = if base.get("engine").and_then(Value::as_str) == Some("custom") {
            valid_template(base.get("urlTemplate"))
        } else {
            None
        };
        if let Some(template) = valid_template(input.get("urlTemplate")).or(fallback) {
            return json!({ "engine": "custom", "urlTemplate": template });
        }
        return json!({ "engine": "google", "urlTemplate": SEARCH_ENGINES[0].1 });
    }

    let (name, template) = SEARCH_ENGINES
        .iter()
        .find(|(name, _)| *name == engine)
        .copied()
        .unwrap_or(SEARCH_ENGINES[0]);
    json!({ "engine": name, "urlTemplate": template })
}

fn normalize_ui(input: &Value, base: &Value) -> Value {
    let mut ui = coerce_like(base, input);
    if let Some(map) = ui.as_object_mut() {
        // Only vertical tabs for now (same as the Electron app).
        map.insert("tabLayout".into(), json!("vertical"));
        let width = map.get("sidebarWidth").and_then(Value::as_f64).unwrap_or(252.0);
        map.insert("sidebarWidth".into(), json!(width.clamp(180.0, 460.0)));
        // Same options as AUTO_SLEEP_OPTIONS in config.js.
        let sleep = map.get("autoSleepMinutes").and_then(Value::as_f64).unwrap_or(30.0);
        let sleep = if [0.0, 15.0, 30.0, 60.0, 120.0].contains(&sleep) { sleep as u64 } else { 30 };
        map.insert("autoSleepMinutes".into(), json!(sleep));
        if let Some(name) = map.get("userName").and_then(Value::as_str) {
            let trimmed: String = name.trim().chars().take(60).collect();
            map.insert("userName".into(), json!(trimmed));
        }
    }
    ui
}

/* ------------------------------------------- Favorites, saved, bookmarks */

const MAX_FAVORITES: usize = 100;
const MAX_SAVED: usize = 200;
const MAX_SHORTCUTS: usize = 30;
const MAX_BOOKMARKS: usize = 500;
const MAX_BOOKMARK_FOLDERS: usize = 200;

fn new_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

fn truncate_chars(text: &str, max: usize) -> String {
    text.chars().take(max).collect()
}

/// Port of `normalizeFavoriteUrl`: only http(s) URLs, normalized.
pub fn normalize_favorite_url(value: Option<&Value>) -> Option<String> {
    let url = url::Url::parse(value?.as_str()?.trim()).ok()?;
    matches!(url.scheme(), "http" | "https").then(|| url.to_string())
}

/// Port of `normalizeFavicon`: http(s) or data:image URLs, else "".
pub fn normalize_favicon(value: Option<&Value>) -> String {
    let Some(text) = value.and_then(Value::as_str) else {
        return String::new();
    };
    let trimmed = text.trim();
    let lower = trimmed.to_ascii_lowercase();
    if lower.starts_with("http://") || lower.starts_with("https://") || lower.starts_with("data:image/") {
        trimmed.to_string()
    } else {
        String::new()
    }
}

/// Port of `favoriteTitle`: the given title (max 120 chars) or the host
/// without "www.".
pub fn favorite_title(value: Option<&Value>, url: &str) -> String {
    let title = value.and_then(Value::as_str).map(str::trim).unwrap_or("");
    if !title.is_empty() {
        return truncate_chars(title, 120);
    }
    match url::Url::parse(url).ok().and_then(|u| u.host_str().map(str::to_string)) {
        Some(host) => {
            let lower = host.to_ascii_lowercase();
            let stripped = if lower.starts_with("www.") { &host[4..] } else { &host[..] };
            if stripped.is_empty() { url.to_string() } else { stripped.to_string() }
        }
        None => url.to_string(),
    }
}

fn entry_id(entry: &Value) -> String {
    entry
        .get("id")
        .and_then(Value::as_str)
        .filter(|id| !id.is_empty())
        .map(str::to_string)
        .unwrap_or_else(new_id)
}

/// Port of `normalizeFavorites` (also used for saved pages and shortcuts):
/// valid http(s) URLs only, no duplicates, `{ id, title, url, favicon }`.
pub fn normalize_favorites(input: &Value, max: usize) -> Value {
    let Some(items) = input.as_array() else {
        return json!([]);
    };
    let mut seen = std::collections::HashSet::new();
    let mut result = Vec::new();
    for entry in items.iter().filter(|e| e.is_object()) {
        let Some(url) = normalize_favorite_url(entry.get("url")) else {
            continue;
        };
        if !seen.insert(url.clone()) {
            continue;
        }
        result.push(json!({
            "id": entry_id(entry),
            "title": favorite_title(entry.get("title"), &url),
            "url": url,
            "favicon": normalize_favicon(entry.get("favicon")),
        }));
        if result.len() >= max {
            break;
        }
    }
    Value::Array(result)
}

fn normalize_tags(value: Option<&Value>) -> Option<Value> {
    let items = value?.as_array()?;
    let tags: Vec<Value> = items
        .iter()
        .map(|tag| match tag {
            Value::String(text) => text.clone(),
            Value::Null => "null".to_string(),
            other => other.to_string(),
        })
        .map(|tag| truncate_chars(tag.trim(), 30))
        .filter(|tag| !tag.is_empty())
        .take(10)
        .map(Value::String)
        .collect();
    Some(Value::Array(tags))
}

/// Port of `normalizeBookmarks`.
pub fn normalize_bookmarks(input: &Value) -> Value {
    let Some(items) = input.as_array() else {
        return json!([]);
    };
    let mut seen = std::collections::HashSet::new();
    let mut result = Vec::new();
    for entry in items.iter().filter(|e| e.is_object()) {
        let Some(url) = normalize_favorite_url(entry.get("url")) else {
            continue;
        };
        if !seen.insert(url.clone()) {
            continue;
        }
        let created = entry
            .get("createdAt")
            .and_then(Value::as_f64)
            .filter(|n| n.is_finite())
            .map(|n| json!(n))
            .unwrap_or_else(|| json!(now_millis() as u64));
        result.push(json!({
            "id": entry_id(entry),
            "title": favorite_title(entry.get("title"), &url),
            "url": url,
            "favicon": normalize_favicon(entry.get("favicon")),
            "folderId": entry.get("folderId").and_then(Value::as_str),
            "tags": normalize_tags(entry.get("tags")).unwrap_or_else(|| json!([])),
            "createdAt": created,
        }));
        if result.len() >= MAX_BOOKMARKS {
            break;
        }
    }
    Value::Array(result)
}

/// Port of `normalizeBookmarkFolders`.
pub fn normalize_bookmark_folders(input: &Value) -> Value {
    let Some(items) = input.as_array() else {
        return json!([]);
    };
    let mut seen = std::collections::HashSet::new();
    let mut result = Vec::new();
    for entry in items.iter().filter(|e| e.is_object()) {
        let name = truncate_chars(entry.get("name").and_then(Value::as_str).unwrap_or("").trim(), 60);
        if name.is_empty() {
            continue;
        }
        let id = entry_id(entry);
        if !seen.insert(id.clone()) {
            continue;
        }
        result.push(json!({
            "id": id,
            "name": name,
            "parentId": entry.get("parentId").and_then(Value::as_str),
        }));
        if result.len() >= MAX_BOOKMARK_FOLDERS {
            break;
        }
    }
    Value::Array(result)
}

/// Rounds and clamps a zoom factor like config.js (0.25..5, two decimals).
pub fn clamp_zoom(factor: f64) -> f64 {
    ((factor * 100.0).round() / 100.0).clamp(0.25, 5.0)
}

/// Port of `normalizeZoom`: `{ host: factor }`, without 100 % entries.
pub fn normalize_zoom(input: &Value) -> Value {
    let Some(map) = input.as_object() else {
        return json!({});
    };
    let mut result = Map::new();
    for (host, value) in map {
        if host.is_empty() || result.len() >= 500 {
            break;
        }
        let factor = match value {
            Value::Number(n) => n.as_f64(),
            Value::String(text) => text.trim().parse::<f64>().ok(),
            _ => None,
        };
        let Some(factor) = factor.filter(|f| f.is_finite()) else {
            continue;
        };
        let clamped = clamp_zoom(factor);
        if (clamped - 1.0).abs() < 0.01 {
            continue;
        }
        result.insert(host.trim().to_lowercase(), json!(clamped));
    }
    Value::Object(result)
}

/// Lower-case host of an http(s) URL (the key of `settings.zoom`).
pub fn zoom_host(url: &str) -> Option<String> {
    let parsed = url::Url::parse(url).ok()?;
    if !matches!(parsed.scheme(), "http" | "https") {
        return None;
    }
    parsed.host_str().map(str::to_lowercase)
}

/// Which list an entry is added to.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Collection {
    Favorites,
    Saved,
    Shortcuts,
}

impl Collection {
    fn key(self) -> &'static str {
        match self {
            Collection::Favorites => "favorites",
            Collection::Saved => "saved",
            Collection::Shortcuts => "shortcuts",
        }
    }

    fn max(self) -> usize {
        match self {
            Collection::Favorites => MAX_FAVORITES,
            Collection::Saved => MAX_SAVED,
            Collection::Shortcuts => MAX_SHORTCUTS,
        }
    }
}

/// Port of `addFavorite` / `addSaved` / `addShortcut` on a list value.
/// Existing URLs are updated, new favorites go last, saved pages and
/// shortcuts first. Invalid URLs leave the list unchanged.
pub fn add_to_collection(list: &Value, kind: Collection, entry: &Value) -> Value {
    let Some(url) = normalize_favorite_url(entry.get("url")) else {
        return list.clone();
    };
    let mut items = list.as_array().cloned().unwrap_or_default();
    if let Some(existing) = items.iter_mut().find(|item| item.get("url").and_then(Value::as_str) == Some(url.as_str())) {
        if entry.get("title").and_then(Value::as_str).is_some_and(|t| !t.is_empty()) {
            existing["title"] = json!(favorite_title(entry.get("title"), &url));
        }
        if entry.get("favicon").and_then(Value::as_str).is_some_and(|f| !f.is_empty()) {
            existing["favicon"] = json!(normalize_favicon(entry.get("favicon")));
        }
        return Value::Array(items);
    }
    let item = json!({
        "id": new_id(),
        "title": favorite_title(entry.get("title"), &url),
        "url": url,
        "favicon": normalize_favicon(entry.get("favicon")),
    });
    if kind == Collection::Favorites {
        items.push(item);
    } else {
        items.insert(0, item);
    }
    normalize_favorites(&Value::Array(items), kind.max())
}

/// Removes the entry with `id` from a list.
pub fn remove_by_id(list: &Value, id: &str) -> Value {
    let items = list.as_array().cloned().unwrap_or_default();
    Value::Array(
        items
            .into_iter()
            .filter(|item| item.get("id").and_then(Value::as_str) != Some(id))
            .collect(),
    )
}

/// Port of `addBookmark` on the bookmark list.
pub fn add_bookmark(list: &Value, entry: &Value) -> Value {
    let Some(url) = normalize_favorite_url(entry.get("url")) else {
        return list.clone();
    };
    let mut items = list.as_array().cloned().unwrap_or_default();
    if let Some(existing) = items.iter_mut().find(|item| item.get("url").and_then(Value::as_str) == Some(url.as_str())) {
        if entry.get("title").and_then(Value::as_str).is_some_and(|t| !t.is_empty()) {
            existing["title"] = json!(favorite_title(entry.get("title"), &url));
        }
        if entry.get("favicon").and_then(Value::as_str).is_some_and(|f| !f.is_empty()) {
            existing["favicon"] = json!(normalize_favicon(entry.get("favicon")));
        }
        if let Some(folder) = entry.get("folderId").and_then(Value::as_str).filter(|f| !f.is_empty()) {
            existing["folderId"] = json!(folder);
        }
        if let Some(tags) = normalize_tags(entry.get("tags")) {
            existing["tags"] = tags;
        }
        return Value::Array(items);
    }
    items.insert(
        0,
        json!({
            "id": new_id(),
            "title": favorite_title(entry.get("title"), &url),
            "url": url,
            "favicon": normalize_favicon(entry.get("favicon")),
            "folderId": entry.get("folderId").and_then(Value::as_str),
            "tags": normalize_tags(entry.get("tags")).unwrap_or_else(|| json!([])),
            "createdAt": now_millis() as u64,
        }),
    );
    normalize_bookmarks(&Value::Array(items))
}

/// Port of `removeBookmarkFolder`: drops the folder and its subfolders and
/// moves their bookmarks to the root. Returns (bookmarks, folders).
pub fn remove_bookmark_folder(bookmarks: &Value, folders: &Value, id: &str) -> (Value, Value) {
    let folder_list = folders.as_array().cloned().unwrap_or_default();
    let mut remove = std::collections::HashSet::from([id.to_string()]);
    loop {
        let before = remove.len();
        for folder in &folder_list {
            let parent = folder.get("parentId").and_then(Value::as_str);
            let folder_id = folder.get("id").and_then(Value::as_str);
            if let (Some(parent), Some(folder_id)) = (parent, folder_id) {
                if remove.contains(parent) {
                    remove.insert(folder_id.to_string());
                }
            }
        }
        if remove.len() == before {
            break;
        }
    }
    // Same as config.js: only bookmarks directly in the removed folder move.
    let bookmarks = bookmarks
        .as_array()
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .map(|mut bookmark| {
            if bookmark.get("folderId").and_then(Value::as_str) == Some(id) {
                bookmark["folderId"] = Value::Null;
            }
            bookmark
        })
        .collect();
    let folders = folder_list
        .into_iter()
        .filter(|f| !f.get("id").and_then(Value::as_str).is_some_and(|fid| remove.contains(fid)))
        .collect();
    (Value::Array(bookmarks), Value::Array(folders))
}

fn list_or_empty(value: Option<&Value>) -> Value {
    match value {
        Some(Value::Array(items)) => Value::Array(items.clone()),
        _ => Value::Array(Vec::new()),
    }
}

fn read_json(path: &Path) -> Option<Value> {
    let text = fs::read_to_string(path).ok()?;
    serde_json::from_str(&text).ok()
}

fn now_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or_default()
}

/// Writes JSON atomically: first `<file>.tmp`, then rename over the target.
/// `std::fs::rename` replaces an existing file on Windows as well.
pub fn write_json_atomic(path: &Path, value: &Value) -> std::io::Result<()> {
    let text = serde_json::to_string_pretty(value).map_err(std::io::Error::other)?;
    write_text_atomic(path, &text)
}

/// Same as `write_json_atomic` without indentation (history.json).
pub fn write_json_atomic_compact(path: &Path, value: &Value) -> std::io::Result<()> {
    let text = serde_json::to_string(value).map_err(std::io::Error::other)?;
    write_text_atomic(path, &text)
}

fn write_text_atomic(path: &Path, text: &str) -> std::io::Result<()> {
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir)?;
    }
    let mut tmp = path.as_os_str().to_owned();
    tmp.push(".tmp");
    let tmp = PathBuf::from(tmp);
    fs::write(&tmp, text)?;
    fs::rename(&tmp, path)
}

/// Lists with a config.js normalizer are normalized, others pass through.
fn normalize_list(key: &str, list: &Value) -> Value {
    match key {
        "favorites" => normalize_favorites(list, MAX_FAVORITES),
        "saved" => normalize_favorites(list, MAX_SAVED),
        "shortcuts" => normalize_favorites(list, MAX_SHORTCUTS),
        "bookmarks" => normalize_bookmarks(list),
        "bookmarkFolders" => normalize_bookmark_folders(list),
        _ => list.clone(),
    }
}

/// Normalizes a freshly loaded settings file (port of `loadSettings`).
fn normalize_loaded(stored: Value) -> Value {
    let defaults = defaults();
    let stored = if stored.is_object() { stored } else { json!({}) };
    let has_engine = stored.pointer("/search/engine").is_some_and(Value::is_string);
    let theme_current = stored.get("themeVersion").and_then(Value::as_i64) == Some(THEME_VERSION);

    let mut merged = merge_deep(&defaults, &stored);
    let map = merged.as_object_mut().expect("settings are an object");

    let search_input = if has_engine { map["search"].clone() } else { defaults["search"].clone() };
    map.insert("search".into(), normalize_search(&search_input, &defaults["search"]));

    let ui = map["ui"].clone();
    map.insert("ui".into(), normalize_ui(&ui, &defaults["ui"]));

    for key in LIST_KEYS {
        let list = list_or_empty(map.get(*key));
        map.insert((*key).into(), normalize_list(key, &list));
    }
    for key in OBJECT_KEYS {
        let value = coerce_like(&defaults[*key], &map[*key]);
        map.insert((*key).into(), value);
    }
    let zoom = normalize_zoom(map.get("zoom").unwrap_or(&Value::Null));
    map.insert("zoom".into(), zoom);

    let theme = if theme_current {
        coerce_like(&defaults["theme"], &map["theme"])
    } else {
        // Theme restart (same as config.js): keep only the custom CSS.
        let previous = map["theme"].clone();
        let mut theme = defaults["theme"].clone();
        for key in ["customCssChrome", "customCssNewtab"] {
            if let Some(css) = previous.get(key).filter(|v| v.is_string()) {
                theme[key] = css.clone();
            }
        }
        map.insert("customThemes".into(), json!([]));
        theme
    };
    map.insert("theme".into(), theme);
    map.insert("themeVersion".into(), json!(THEME_VERSION));
    merged
}

pub struct SettingsStore {
    path: PathBuf,
    data: Mutex<Value>,
    pub history: HistoryStore,
}

impl SettingsStore {
    /// Loads (or creates) `settings.json` in `dir`.
    pub fn load(dir: &Path) -> Self {
        let path = dir.join("settings.json");

        let mut stored = read_json(&path);
        if stored.is_none() && path.exists() {
            // Unreadable file: keep a backup and try the last temp file.
            let backup = dir.join(format!("settings.json.corrupt-{}", now_millis()));
            let _ = fs::copy(&path, backup);
            stored = read_json(&dir.join("settings.json.tmp"));
        }

        let data = normalize_loaded(stored.unwrap_or_else(|| json!({})));
        let store = Self {
            path,
            data: Mutex::new(data),
            history: HistoryStore::load(dir),
        };
        store.persist();
        store
    }

    fn lock(&self) -> std::sync::MutexGuard<'_, Value> {
        self.data.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    fn persist_value(&self, value: &Value) {
        if let Err(error) = write_json_atomic(&self.path, value) {
            crate::applog!("[settings] could not save {}: {error}", self.path.display());
        }
    }

    fn persist(&self) {
        let snapshot = self.lock().clone();
        self.persist_value(&snapshot);
    }

    fn history(&self) -> Value {
        self.history.entries()
    }

    /// Full settings value (used internally, e.g. for the start page).
    pub fn snapshot(&self) -> Value {
        self.lock().clone()
    }

    /// Folder that holds settings.json (and session.json).
    pub fn dir(&self) -> PathBuf {
        self.path.parent().map(Path::to_path_buf).unwrap_or_default()
    }

    /// One top-level section (e.g. "hotkeys"), `Null` if missing.
    pub fn section(&self, key: &str) -> Value {
        self.lock().get(key).cloned().unwrap_or(Value::Null)
    }

    pub fn theme(&self) -> Value {
        self.lock()["theme"].clone()
    }

    /// Port of `publicSettings()`: what the UI receives.
    pub fn public(&self) -> Value {
        let current = self.snapshot();
        let mut out = Map::new();
        for key in [
            "search",
            "ui",
            "favorites",
            "saved",
            "shortcuts",
            "bangs",
            "bookmarks",
            "bookmarkFolders",
            "tabGroups",
            "extensions",
            "privacy",
            "performance",
            "hotkeys",
            "customThemes",
        ] {
            out.insert(key.into(), current.get(key).cloned().unwrap_or(Value::Null));
        }
        out.insert("history".into(), self.history());
        Value::Object(out)
    }

    /// Port of `updateSettings(patch)`. Returns the public settings.
    pub fn update(&self, patch: &Value) -> Value {
        if patch.is_object() {
            let defaults = defaults();
            let snapshot = {
                let mut current = self.lock();
                if let Some(search) = patch.get("search").filter(|v| v.is_object()) {
                    current["search"] = normalize_search(search, &current["search"]);
                }
                if let Some(ui) = patch.get("ui").filter(|v| v.is_object()) {
                    current["ui"] = normalize_ui(ui, &current["ui"]);
                }
                for key in LIST_KEYS {
                    if let Some(list) = patch.get(*key).filter(|v| v.is_array()) {
                        current[*key] = normalize_list(key, list);
                    }
                }
                for key in OBJECT_KEYS {
                    if let Some(section) = patch.get(*key).filter(|v| v.is_object()) {
                        let base = coerce_like(&defaults[*key], &current[*key]);
                        current[*key] = coerce_like(&base, &merge_deep(&base, section));
                    }
                }
                if let Some(zoom) = patch.get("zoom").filter(|v| v.is_object()) {
                    current["zoom"] = normalize_zoom(zoom);
                }
                current.clone()
            };
            if let Some(history) = patch.get("history").filter(|v| v.is_array()) {
                self.history.set(history);
            }
            self.persist_value(&snapshot);
        }
        self.public()
    }

    /// Changes the full settings value, saves it and returns public settings.
    fn modify(&self, f: impl FnOnce(&mut Value)) -> Value {
        let snapshot = {
            let mut current = self.lock();
            f(&mut current);
            current.clone()
        };
        self.persist_value(&snapshot);
        self.public()
    }

    pub fn add_to(&self, kind: Collection, entry: &Value) -> Value {
        self.modify(|current| {
            let key = kind.key();
            current[key] = add_to_collection(&current[key], kind, entry);
        })
    }

    pub fn remove_from(&self, kind: Collection, id: &str) -> Value {
        self.modify(|current| {
            let key = kind.key();
            current[key] = remove_by_id(&current[key], id);
        })
    }

    pub fn add_bookmark(&self, entry: &Value) -> Value {
        self.modify(|current| current["bookmarks"] = add_bookmark(&current["bookmarks"], entry))
    }

    pub fn remove_bookmark(&self, id: &str) -> Value {
        self.modify(|current| current["bookmarks"] = remove_by_id(&current["bookmarks"], id))
    }

    /// Port of `addBookmarkFolder`.
    pub fn add_bookmark_folder(&self, name: &str, parent_id: Option<&str>) -> Value {
        let name = truncate_chars(name.trim(), 60);
        if name.is_empty() {
            return self.public();
        }
        self.modify(|current| {
            let mut folders = current["bookmarkFolders"].as_array().cloned().unwrap_or_default();
            folders.push(json!({ "id": new_id(), "name": name, "parentId": parent_id }));
            current["bookmarkFolders"] = normalize_bookmark_folders(&Value::Array(folders));
        })
    }

    pub fn remove_bookmark_folder(&self, id: &str) -> Value {
        self.modify(|current| {
            let (bookmarks, folders) = remove_bookmark_folder(&current["bookmarks"], &current["bookmarkFolders"], id);
            current["bookmarks"] = bookmarks;
            current["bookmarkFolders"] = folders;
        })
    }

    /// Port of `getZoomFactor`: stored zoom for the URL's host, else 1.
    pub fn zoom_for(&self, url: &str) -> f64 {
        let Some(host) = zoom_host(url) else {
            return 1.0;
        };
        self.lock()
            .pointer("/zoom")
            .and_then(|zoom| zoom.get(&host))
            .and_then(Value::as_f64)
            .filter(|f| f.is_finite() && *f > 0.0)
            .unwrap_or(1.0)
    }

    /// Port of `setZoomFactor`: stores the zoom for the URL's host (100 %
    /// removes the entry). Non-http(s) URLs are ignored.
    pub fn set_zoom_for(&self, url: &str, factor: f64) {
        let Some(host) = zoom_host(url) else {
            return;
        };
        if !factor.is_finite() {
            return;
        }
        let clamped = clamp_zoom(factor);
        let snapshot = {
            let mut current = self.lock();
            let mut zoom = current.get("zoom").and_then(Value::as_object).cloned().unwrap_or_default();
            if (clamped - 1.0).abs() < 0.01 {
                zoom.remove(&host);
            } else {
                zoom.insert(host, json!(clamped));
            }
            current["zoom"] = normalize_zoom(&Value::Object(zoom));
            current.clone()
        };
        self.persist_value(&snapshot);
    }

    /// Port of `updateTheme(input)`. Returns the stored theme.
    pub fn update_theme(&self, input: &Value) -> Value {
        let (theme, snapshot) = {
            let mut current = self.lock();
            let theme = coerce_like(&current["theme"], input);
            current["theme"] = theme.clone();
            (theme, current.clone())
        };
        self.persist_value(&snapshot);
        theme
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn loads_old_files_and_keeps_unknown_keys() {
        let stored = json!({
            "search": { "engine": "bing" },
            "ui": { "sidebarWidth": 9999, "tabLayout": "horizontal" },
            "favorites": "broken",
            "theme": { "accent": "#ffffff" },
            "themeVersion": 2,
            "somethingNew": 1
        });
        let settings = normalize_loaded(stored);
        assert_eq!(settings["search"]["urlTemplate"], "https://www.bing.com/search?q=%s");
        assert_eq!(settings["ui"]["sidebarWidth"], json!(460.0));
        assert_eq!(settings["ui"]["tabLayout"], "vertical");
        assert_eq!(settings["favorites"], json!([]));
        assert_eq!(settings["theme"]["accent"], "#ffffff");
        assert_eq!(settings["somethingNew"], 1);
    }

    #[test]
    fn old_theme_version_resets_theme() {
        let settings = normalize_loaded(json!({ "theme": { "accent": "#ffffff", "customCssChrome": "a{}" } }));
        assert_eq!(settings["theme"]["accent"], "#7c6cff");
        assert_eq!(settings["theme"]["customCssChrome"], "a{}");
        assert_eq!(settings["search"]["engine"], "google");
    }

    #[test]
    fn favorites_are_normalized_like_config_js() {
        let list = normalize_favorites(
            &json!([
                { "id": "a", "url": " https://www.Example.com ", "title": "", "favicon": "javascript:x" },
                { "url": "https://www.example.com/" },
                { "url": "ftp://example.com/" },
                { "url": 5 },
                "junk",
                { "url": "http://test.dev/x", "title": "T", "favicon": "data:image/png;base64,AA" }
            ]),
            100,
        );
        let items = list.as_array().unwrap();
        assert_eq!(items.len(), 2);
        assert_eq!(items[0]["id"], "a");
        assert_eq!(items[0]["url"], "https://www.example.com/");
        assert_eq!(items[0]["title"], "example.com");
        assert_eq!(items[0]["favicon"], "");
        assert_eq!(items[1]["title"], "T");
        assert!(items[1]["favicon"].as_str().unwrap().starts_with("data:image/"));
        assert_eq!(favorite_title(Some(&json!("x".repeat(200))), "https://a.b/").chars().count(), 120);
        let many: Vec<Value> = (0..50).map(|i| json!({ "url": format!("https://s{i}.test/") })).collect();
        assert_eq!(normalize_favorites(&Value::Array(many), MAX_SHORTCUTS).as_array().unwrap().len(), 30);
    }

    #[test]
    fn add_and_remove_entries() {
        let list = add_to_collection(&json!([]), Collection::Favorites, &json!({ "url": "https://a.test" }));
        let list = add_to_collection(&list, Collection::Favorites, &json!({ "url": "https://b.test", "title": "B" }));
        assert_eq!(list[1]["url"], "https://b.test/");
        // Existing URL: updated in place, not duplicated.
        let list = add_to_collection(&list, Collection::Favorites, &json!({ "url": "https://a.test/", "title": "A" }));
        assert_eq!(list.as_array().unwrap().len(), 2);
        assert_eq!(list[0]["title"], "A");
        // Invalid URL: unchanged.
        assert_eq!(add_to_collection(&list, Collection::Favorites, &json!({ "url": "file:///c" })), list);
        // Saved pages go first.
        let saved = add_to_collection(&json!([{ "id": "x", "url": "https://x.test/", "title": "x", "favicon": "" }]), Collection::Saved, &json!({ "url": "https://y.test" }));
        assert_eq!(saved[0]["url"], "https://y.test/");
        let id = list[0]["id"].as_str().unwrap().to_string();
        assert_eq!(remove_by_id(&list, &id).as_array().unwrap().len(), 1);
    }

    #[test]
    fn bookmarks_and_folders() {
        let list = add_bookmark(&json!([]), &json!({ "url": "https://a.test", "folderId": "f1", "tags": [" x ", "", 3] }));
        assert_eq!(list[0]["folderId"], "f1");
        assert_eq!(list[0]["tags"], json!(["x", "3"]));
        assert!(list[0]["createdAt"].is_number());
        let list = add_bookmark(&list, &json!({ "url": "https://a.test/", "title": "New", "tags": ["y"] }));
        assert_eq!(list.as_array().unwrap().len(), 1);
        assert_eq!(list[0]["title"], "New");
        assert_eq!(list[0]["tags"], json!(["y"]));

        let folders = json!([
            { "id": "f1", "name": "One", "parentId": null },
            { "id": "f2", "name": "Two", "parentId": "f1" },
            { "id": "f3", "name": "Three", "parentId": "f2" },
            { "id": "f4", "name": "Four", "parentId": null }
        ]);
        let (bookmarks, folders) = remove_bookmark_folder(&list, &folders, "f1");
        assert_eq!(bookmarks[0]["folderId"], Value::Null);
        assert_eq!(folders.as_array().unwrap().len(), 1);
        assert_eq!(folders[0]["id"], "f4");
        assert_eq!(normalize_bookmark_folders(&json!([{ "name": "  " }, { "id": "a", "name": "A" }, { "id": "a", "name": "B" }])).as_array().unwrap().len(), 1);
    }

    #[test]
    fn zoom_map_and_hosts() {
        let zoom = normalize_zoom(&json!({ "Example.com": 1.5, "one.test": 1.0, "big.test": 9, "bad.test": "x", "str.test": "0.8" }));
        assert_eq!(zoom, json!({ "example.com": 1.5, "big.test": 5.0, "str.test": 0.8 }));
        assert_eq!(zoom_host("https://WWW.Example.com/a?b").as_deref(), Some("www.example.com"));
        assert_eq!(zoom_host("http://jtech.localhost/newtab").as_deref(), Some("jtech.localhost"));
        assert_eq!(zoom_host("jtech://newtab"), None);
        assert_eq!(clamp_zoom(1.234), 1.23);
        assert_eq!(clamp_zoom(0.1), 0.25);
    }
}
