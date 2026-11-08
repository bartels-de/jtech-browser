//! Omnibox input resolution (port of `resolveInput` in src/main/main.js).
//!
//! Decides whether the user typed a URL, a search query or a bang command
//! such as `!yt cloud 9`, and returns the URL to load.

use serde_json::Value;

/// Internal URL of the start page, as used by the Electron app.
pub const NEWTAB: &str = "jtech://newtab";

/// Search and bang configuration taken from the settings.
pub struct SearchConfig<'a> {
    /// Search URL template, `%s` is replaced by the encoded query.
    pub url_template: &'a str,
    /// Custom bangs: `[{ "trigger": "w", "urlTemplate": "https://...%s" }]`.
    pub bangs: &'a [Value],
}

/// Same behaviour as JavaScript's `encodeURIComponent`.
pub fn encode_uri_component(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    for byte in input.bytes() {
        let keep = byte.is_ascii_alphanumeric()
            || matches!(byte, b'-' | b'_' | b'.' | b'!' | b'~' | b'*' | b'\'' | b'(' | b')');
        if keep {
            out.push(byte as char);
        } else {
            out.push_str(&format!("%{byte:02X}"));
        }
    }
    out
}

fn search_url(config: &SearchConfig<'_>, query: &str) -> String {
    let template = if config.url_template.contains("%s") {
        config.url_template
    } else {
        "https://www.google.com/search?q=%s"
    };
    template.replacen("%s", &encode_uri_component(query), 1)
}

fn resolve_bang(config: &SearchConfig<'_>, value: &str) -> Option<String> {
    let rest = value.strip_prefix('!')?;
    let (bang, query) = match rest.find(char::is_whitespace) {
        Some(index) => (&rest[..index], rest[index..].trim()),
        None => (rest, ""),
    };
    if bang.is_empty() {
        return None;
    }
    let bang = bang.to_lowercase();
    let encoded = encode_uri_component(query);

    let custom = config.bangs.iter().find(|entry| {
        entry.get("trigger").and_then(Value::as_str) == Some(bang.as_str())
    });
    if let Some(template) = custom
        .and_then(|entry| entry.get("urlTemplate"))
        .and_then(Value::as_str)
    {
        return Some(template.replacen("%s", &encoded, 1));
    }

    let url = match bang.as_str() {
        "yt" | "youtube" => format!("https://www.youtube.com/results?search_query={encoded}"),
        // Videos uploaded today.
        "yt-d" | "ytd" | "yt-today" => {
            format!("https://www.youtube.com/results?search_query={encoded}&sp=EgIIAQ%3D%3D")
        }
        "g" | "google" => format!("https://www.google.com/search?q={encoded}"),
        "ddg" => format!("https://duckduckgo.com/?q={encoded}"),
        "gh" | "github" => format!("https://github.com/search?q={encoded}"),
        // Unknown bang: fall back to a normal search.
        _ => return None,
    };
    Some(url)
}

/// `^[a-z][a-z0-9+.-]*:` (case-insensitive).
fn has_explicit_scheme(value: &str) -> bool {
    let mut chars = value.chars();
    match chars.next() {
        Some(first) if first.is_ascii_alphabetic() => {}
        _ => return false,
    }
    for ch in chars {
        if ch == ':' {
            return true;
        }
        if !(ch.is_ascii_alphanumeric() || matches!(ch, '+' | '.' | '-')) {
            return false;
        }
    }
    false
}

/// Accepts the rest of the input after a host: `(:\d+)?(/|$)`.
fn port_then_path(rest: &str) -> bool {
    let rest = match rest.strip_prefix(':') {
        Some(after) => {
            let digits = after.chars().take_while(char::is_ascii_digit).count();
            if digits == 0 {
                return false;
            }
            &after[digits..]
        }
        None => rest,
    };
    rest.is_empty() || rest.starts_with('/')
}

/// `^localhost(:\d+)?(\/|$)` (case-insensitive).
fn is_localhost(value: &str) -> bool {
    value.len() >= 9
        && value.is_char_boundary(9)
        && value[..9].eq_ignore_ascii_case("localhost")
        && port_then_path(&value[9..])
}

/// `^\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?(\/|$)`.
fn is_ipv4(value: &str) -> bool {
    let mut rest = value;
    for part in 0..4 {
        if part > 0 {
            match rest.strip_prefix('.') {
                Some(after) => rest = after,
                None => return false,
            }
        }
        let digits = rest.chars().take_while(char::is_ascii_digit).count();
        if digits == 0 || digits > 3 {
            return false;
        }
        rest = &rest[digits..];
    }
    port_then_path(rest)
}

/// `!/\s/.test(value) && /^[^\s/]+\.[^\s/]{2,}/.test(value)`.
fn looks_like_host(value: &str) -> bool {
    if value.chars().any(char::is_whitespace) {
        return false;
    }
    let host: Vec<char> = value.split('/').next().unwrap_or("").chars().collect();
    (1..host.len()).any(|index| host[index] == '.' && host.len() - index - 1 >= 2)
}

/// Turns omnibox input into a URL. Returns `None` for empty input.
///
/// Only `http(s)` URLs and the start page are ever returned, so `javascript:`,
/// `file:` or `data:` input becomes a search instead of being loaded.
pub fn resolve_input(raw: &str, config: &SearchConfig<'_>) -> Option<String> {
    let value = raw.trim();
    if value.is_empty() {
        return None;
    }

    if value.starts_with('!') {
        if let Some(url) = resolve_bang(config, value) {
            return Some(url);
        }
    }

    if value == NEWTAB {
        return Some(NEWTAB.to_string());
    }

    if has_explicit_scheme(value) {
        if let Ok(parsed) = url::Url::parse(value) {
            if matches!(parsed.scheme(), "http" | "https") {
                return Some(parsed.to_string());
            }
        }
        return Some(search_url(config, value));
    }

    if is_localhost(value) || is_ipv4(value) {
        return Some(format!("http://{value}"));
    }

    if looks_like_host(value) {
        Some(format!("https://{value}"))
    } else {
        Some(search_url(config, value))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn resolve(input: &str) -> Option<String> {
        let bangs = vec![json!({ "trigger": "w", "urlTemplate": "https://de.wikipedia.org/w/index.php?search=%s" })];
        let config = SearchConfig {
            url_template: "https://duckduckgo.com/?q=%s",
            bangs: &bangs,
        };
        resolve_input(input, &config)
    }

    #[test]
    fn resolves_inputs_like_electron() {
        assert_eq!(resolve("   "), None);
        assert_eq!(resolve("example.com").unwrap(), "https://example.com");
        assert_eq!(resolve("example.com/a b"), Some("https://duckduckgo.com/?q=example.com%2Fa%20b".into()));
        assert_eq!(resolve("https://Example.com").unwrap(), "https://example.com/");
        assert_eq!(resolve("localhost:3000/x").unwrap(), "http://localhost:3000/x");
        assert_eq!(resolve("192.168.0.1").unwrap(), "http://192.168.0.1");
        assert_eq!(resolve("hello world").unwrap(), "https://duckduckgo.com/?q=hello%20world");
        assert_eq!(resolve("javascript:alert(1)").unwrap(), "https://duckduckgo.com/?q=javascript%3Aalert(1)");
        assert_eq!(resolve("!yt cloud 9").unwrap(), "https://www.youtube.com/results?search_query=cloud%209");
        assert_eq!(resolve("!YT-D x").unwrap(), "https://www.youtube.com/results?search_query=x&sp=EgIIAQ%3D%3D");
        assert_eq!(resolve("!w Rust").unwrap(), "https://de.wikipedia.org/w/index.php?search=Rust");
        assert_eq!(resolve("!nope a").unwrap(), "https://duckduckgo.com/?q=!nope%20a");
        assert_eq!(resolve("a.b"), Some("https://duckduckgo.com/?q=a.b".into()));
        assert_eq!(resolve("jtech://newtab").unwrap(), NEWTAB);
    }
}
