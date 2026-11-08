//! Simple file log so users can send diagnostics.
//!
//! Windows: `%APPDATA%\com.jtech.browser\logs\jtech.log` (next to
//! settings.json). The file is rotated to `jtech.log.1` at 1 MB. Every line
//! also goes to stderr. Panics are logged too.

use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};

const MAX_BYTES: u64 = 1024 * 1024;
const IDENTIFIER: &str = "com.jtech.browser";

static FILE: OnceLock<Mutex<Option<File>>> = OnceLock::new();
static PATH: OnceLock<PathBuf> = OnceLock::new();

/// Writes one line to the log (and stderr): `crate::applog!("x {}", y)`.
#[macro_export]
macro_rules! applog {
    ($($arg:tt)*) => {
        $crate::log::write(&format!($($arg)*))
    };
}

/// Folder of settings.json, the same as Tauri's app_config_dir.
fn config_dir() -> PathBuf {
    #[cfg(windows)]
    let base = std::env::var_os("APPDATA").map(PathBuf::from);
    #[cfg(not(windows))]
    let base = std::env::var_os("XDG_CONFIG_HOME")
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("HOME").map(|home| PathBuf::from(home).join(".config")));
    base.unwrap_or_else(std::env::temp_dir).join(IDENTIFIER)
}

pub fn path() -> Option<&'static Path> {
    PATH.get().map(PathBuf::as_path)
}

/// UTC time as `YYYY-MM-DD hh:mm:ss.mmm` without extra crates.
pub fn timestamp(millis: u128) -> String {
    let secs = (millis / 1000) as i64;
    let (days, rem) = (secs.div_euclid(86_400), secs.rem_euclid(86_400));
    // Civil date from days since 1970-01-01 (Howard Hinnant's algorithm).
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = yoe + era * 400 + i64::from(month <= 2);
    format!(
        "{year:04}-{month:02}-{day:02} {:02}:{:02}:{:02}.{:03}",
        rem / 3600,
        rem % 3600 / 60,
        rem % 60,
        millis % 1000
    )
}

/// Opens the log file and installs a panic hook. Safe to call once at start.
pub fn init() {
    let dir = config_dir().join("logs");
    let file_path = dir.join("jtech.log");
    let file = fs::create_dir_all(&dir).ok().and_then(|_| {
        if fs::metadata(&file_path).map(|m| m.len() > MAX_BYTES).unwrap_or(false) {
            let _ = fs::rename(&file_path, dir.join("jtech.log.1"));
        }
        OpenOptions::new().create(true).append(true).open(&file_path).ok()
    });
    let _ = PATH.set(file_path);
    let _ = FILE.set(Mutex::new(file));

    let previous = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        write(&format!("[panic] {info}"));
        previous(info);
    }));

    write(&format!(
        "[start] JTech Browser {} ({} {})",
        env!("CARGO_PKG_VERSION"),
        std::env::consts::OS,
        std::env::consts::ARCH
    ));
}

pub fn write(message: &str) {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or_default();
    let line = format!("{} {message}", timestamp(millis));
    eprintln!("{line}");
    if let Some(lock) = FILE.get() {
        if let Ok(mut guard) = lock.lock() {
            if let Some(file) = guard.as_mut() {
                let _ = writeln!(file, "{line}");
                let _ = file.flush();
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::timestamp;

    #[test]
    fn formats_utc_timestamps() {
        assert_eq!(timestamp(0), "1970-01-01 00:00:00.000");
        assert_eq!(timestamp(951_782_400_123), "2000-02-29 00:00:00.123");
        assert_eq!(timestamp(1_794_121_445_007), "2026-11-08 07:04:05.007");
    }
}
