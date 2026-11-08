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
        if let Some(name) = map.get("userName").and_then(Value::as_str) {
            let trimmed: String = name.trim().chars().take(60).collect();
            map.insert("userName".into(), json!(trimmed));
        }
    }
    ui
}

/// Port of `normalizeFavoriteUrl`: only http(s) URLs, normalized.
pub fn normalize_favorite_url(value: Option<&Value>) -> Option<String> {
    let url = url::Url::parse(value?.as_str()?.trim()).ok()?;
    matches!(url.scheme(), "http" | "https").then(|| url.to_string())
}

/// Port of `favoriteTitle`: the given title (max 120 chars) or the host
/// without "www.".
pub fn favorite_title(value: Option<&Value>, url: &str) -> String {
    let title = value.and_then(Value::as_str).map(str::trim).unwrap_or("");
    if !title.is_empty() {
        return title.chars().take(120).collect();
    }
    match url::Url::parse(url).ok().and_then(|u| u.host_str().map(str::to_string)) {
        Some(host) => {
            let stripped = if host.to_ascii_lowercase().starts_with("www.") { &host[4..] } else { &host[..] };
            if stripped.is_empty() { url.to_string() } else { stripped.to_string() }
        }
        None => url.to_string(),
    }
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
        map.insert((*key).into(), list);
    }
    for key in OBJECT_KEYS {
        let value = coerce_like(&defaults[*key], &map[*key]);
        map.insert((*key).into(), value);
    }
    if !map.get("zoom").is_some_and(Value::is_object) {
        map.insert("zoom".into(), json!({}));
    }

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
            eprintln!("[settings] could not save {}: {error}", self.path.display());
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
                        current[*key] = list.clone();
                    }
                }
                for key in OBJECT_KEYS {
                    if let Some(section) = patch.get(*key).filter(|v| v.is_object()) {
                        let base = coerce_like(&defaults[*key], &current[*key]);
                        current[*key] = coerce_like(&base, &merge_deep(&base, section));
                    }
                }
                if let Some(zoom) = patch.get("zoom").filter(|v| v.is_object()) {
                    current["zoom"] = zoom.clone();
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
}
