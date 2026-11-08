//! Browsing history in `history.json`, same format as src/main/config.js:
//! `[{ id, url, title, timestamp }]`, newest first, at most 2000 entries.
//! Visits of the same URL within 30 s are merged. Writes are batched (3 s)
//! and atomic; `flush` writes pending changes right away (window close).

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, MutexGuard};
use std::time::Duration;

use serde_json::{json, Value};

use crate::settings::{favorite_title, normalize_favorite_url, write_json_atomic_compact};

pub const MAX_ENTRIES: usize = 2000;
const MERGE_WINDOW_MS: f64 = 30_000.0;
const SAVE_DELAY: Duration = Duration::from_secs(3);

fn now_ms() -> f64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as f64)
        .unwrap_or_default()
}

fn entry_title(title: Option<&Value>, url: &str) -> String {
    favorite_title(title, url).chars().take(200).collect()
}

fn timestamp_of(entry: &Value) -> Option<f64> {
    match entry.get("timestamp")? {
        Value::Number(n) => n.as_f64(),
        Value::String(s) => s.trim().parse().ok(),
        _ => None,
    }
    .filter(|t| t.is_finite())
}

fn number(value: f64) -> Value {
    if value.fract() == 0.0 && value.abs() < 9.0e15 {
        json!(value as i64)
    } else {
        json!(value)
    }
}

/// Port of `normalizeHistory`.
pub fn normalize_history(input: &Value, now: f64) -> Vec<Value> {
    let Some(items) = input.as_array() else {
        return Vec::new();
    };
    let mut seen = std::collections::HashSet::new();
    let mut result: Vec<(f64, Value)> = Vec::new();
    for entry in items.iter().filter(|e| e.is_object()) {
        let Some(url) = normalize_favorite_url(entry.get("url")) else {
            continue;
        };
        let timestamp = timestamp_of(entry).unwrap_or(now);
        if !seen.insert(format!("{url}|{}", (timestamp / 1000.0).floor())) {
            continue;
        }
        let id = entry
            .get("id")
            .and_then(Value::as_str)
            .filter(|id| !id.is_empty())
            .map(str::to_string)
            .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
        let title = entry_title(entry.get("title"), &url);
        result.push((timestamp, json!({ "id": id, "url": url, "title": title, "timestamp": number(timestamp) })));
        if result.len() >= MAX_ENTRIES {
            break;
        }
    }
    result.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));
    result.into_iter().map(|(_, entry)| entry).collect()
}

/// Port of `addHistoryEntry` on a list. Returns the new or updated entry,
/// or `None` for URLs that are not http(s).
pub fn add_entry(list: &mut Vec<Value>, url: &str, title: &str, now: f64) -> Option<Value> {
    let url = normalize_favorite_url(Some(&json!(url)))?;
    let title_value = json!(title);
    let merge = list.first().is_some_and(|last| {
        last.get("url").and_then(Value::as_str) == Some(url.as_str())
            && now - timestamp_of(last).unwrap_or(0.0) < MERGE_WINDOW_MS
    });
    if merge {
        let last = &mut list[0];
        last["title"] = json!(entry_title(Some(&title_value), &url));
        last["timestamp"] = number(now);
    } else {
        list.insert(
            0,
            json!({
                "id": uuid::Uuid::new_v4().to_string(),
                "url": url,
                "title": entry_title(Some(&title_value), &url),
                "timestamp": number(now),
            }),
        );
        list.truncate(MAX_ENTRIES);
    }
    list.first().cloned()
}

/// Sets the title of the newest entry if it is for `url` (titles often
/// arrive after the page load). Returns the updated entry.
pub fn update_title(list: &mut [Value], url: &str, title: &str) -> Option<Value> {
    let url = normalize_favorite_url(Some(&json!(url)))?;
    let first = list.first_mut()?;
    if first.get("url").and_then(Value::as_str) != Some(url.as_str()) || title.trim().is_empty() {
        return None;
    }
    let title = entry_title(Some(&json!(title)), &url);
    if first.get("title").and_then(Value::as_str) == Some(title.as_str()) {
        return None;
    }
    first["title"] = json!(title);
    Some(first.clone())
}

fn read_json(path: &Path) -> Option<Value> {
    serde_json::from_str(&fs::read_to_string(path).ok()?).ok()
}

struct Inner {
    path: PathBuf,
    entries: Mutex<Vec<Value>>,
    pending: AtomicBool,
}

impl Inner {
    fn lock(&self) -> MutexGuard<'_, Vec<Value>> {
        self.entries.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    fn save_now(&self) {
        self.pending.store(false, Ordering::SeqCst);
        let snapshot = Value::Array(self.lock().clone());
        if let Err(error) = write_json_atomic_compact(&self.path, &snapshot) {
            eprintln!("[history] could not save {}: {error}", self.path.display());
        }
    }
}

#[derive(Clone)]
pub struct HistoryStore(Arc<Inner>);

impl HistoryStore {
    pub fn load(dir: &Path) -> Self {
        let path = dir.join("history.json");
        let mut stored = read_json(&path);
        if stored.is_none() && path.exists() {
            let backup = dir.join(format!("history.json.corrupt-{}", now_ms() as u64));
            let _ = fs::copy(&path, backup);
            stored = read_json(&dir.join("history.json.tmp"));
        }
        let entries = normalize_history(&stored.unwrap_or_else(|| json!([])), now_ms());
        HistoryStore(Arc::new(Inner {
            path,
            entries: Mutex::new(entries),
            pending: AtomicBool::new(false),
        }))
    }

    pub fn entries(&self) -> Value {
        Value::Array(self.0.lock().clone())
    }

    /// Replaces the whole history (clear, remove one entry) and saves now.
    pub fn set(&self, input: &Value) {
        *self.0.lock() = normalize_history(input, now_ms());
        self.0.save_now();
    }

    pub fn add(&self, url: &str, title: &str) -> Option<Value> {
        let entry = add_entry(&mut self.0.lock(), url, title, now_ms());
        if entry.is_some() {
            self.schedule_save();
        }
        entry
    }

    pub fn update_title(&self, url: &str, title: &str) -> Option<Value> {
        let entry = update_title(&mut self.0.lock(), url, title);
        if entry.is_some() {
            self.schedule_save();
        }
        entry
    }

    fn schedule_save(&self) {
        if self.0.pending.swap(true, Ordering::SeqCst) {
            return;
        }
        let inner = Arc::clone(&self.0);
        std::thread::spawn(move || {
            std::thread::sleep(SAVE_DELAY);
            if inner.pending.load(Ordering::SeqCst) {
                inner.save_now();
            }
        });
    }

    /// Writes pending changes right away (e.g. when the window closes).
    pub fn flush(&self) {
        if self.0.pending.load(Ordering::SeqCst) {
            self.0.save_now();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_like_config_js() {
        let list = normalize_history(
            &json!([
                { "id": "a", "url": "https://a.test", "title": "", "timestamp": 1000 },
                { "id": "b", "url": "https://b.test/", "title": "B", "timestamp": 5000 },
                { "id": "dup", "url": "https://a.test/", "timestamp": 1500 },
                { "url": "javascript:alert(1)", "timestamp": 1 },
                "junk"
            ]),
            9999.0,
        );
        assert_eq!(list.len(), 2);
        assert_eq!(list[0]["id"], "b");
        assert_eq!(list[1]["url"], "https://a.test/");
        assert_eq!(list[1]["title"], "a.test");
        assert_eq!(list[1]["timestamp"], 1000);
    }

    #[test]
    fn merges_visits_within_30_seconds() {
        let mut list = Vec::new();
        let first = add_entry(&mut list, "https://a.test/", "A", 1_000.0).unwrap();
        let merged = add_entry(&mut list, "https://a.test/", "A2", 20_000.0).unwrap();
        assert_eq!(first["id"], merged["id"]);
        assert_eq!(list.len(), 1);
        assert_eq!(list[0]["title"], "A2");
        add_entry(&mut list, "https://a.test/", "A", 60_000.0).unwrap();
        assert_eq!(list.len(), 2);
        add_entry(&mut list, "https://b.test/", "B", 61_000.0).unwrap();
        assert_eq!(list[0]["url"], "https://b.test/");
        assert!(add_entry(&mut list, "http://jtech.localhost/newtab", "x", 1.0).is_some());
        assert!(add_entry(&mut list, "jtech://newtab", "x", 1.0).is_none());
    }

    #[test]
    fn caps_entries_and_updates_titles() {
        let mut list = Vec::new();
        for i in 0..(MAX_ENTRIES + 5) {
            add_entry(&mut list, &format!("https://s{i}.test/"), "", i as f64 * 60_000.0);
        }
        assert_eq!(list.len(), MAX_ENTRIES);
        assert!(update_title(&mut list, "https://other.test/", "T").is_none());
        let latest = format!("https://s{}.test/", MAX_ENTRIES + 4);
        assert_eq!(update_title(&mut list, &latest, "Title").unwrap()["title"], "Title");
        assert!(update_title(&mut list, &latest, "Title").is_none());
    }
}
