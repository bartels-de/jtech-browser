'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { app } = require('electron');

/**
 * Persistente Einstellungen.
 *
 * Die Datei wird beim ersten Start angelegt. Design-Studio und
 * Einstellungs-Menü schreiben ihre Änderungen direkt hierher.
 */

const SEARCH_ENGINES = {
  google: {
    name: 'Google',
    urlTemplate: 'https://www.google.com/search?q=%s'
  },
  duckduckgo: {
    name: 'DuckDuckGo',
    urlTemplate: 'https://duckduckgo.com/?q=%s'
  },
  bing: {
    name: 'Bing',
    urlTemplate: 'https://www.bing.com/search?q=%s'
  },
  ecosia: {
    name: 'Ecosia',
    urlTemplate: 'https://www.ecosia.org/search?q=%s'
  },
  startpage: {
    name: 'Startpage',
    urlTemplate: 'https://www.startpage.com/sp/search?query=%s'
  },
  brave: {
    name: 'Brave',
    urlTemplate: 'https://search.brave.com/search?q=%s'
  },
  custom: {
    name: 'Benutzerdefiniert',
    urlTemplate: ''
  }
};

const TAB_LAYOUTS = ['horizontal', 'vertical'];
const MAX_FAVORITES = 100;
const MAX_EXTENSIONS = 50;

const DEFAULT_SETTINGS = {
  search: {
    engine: 'google',
    // %s wird durch die URL-kodierte Suchanfrage ersetzt.
    urlTemplate: SEARCH_ENGINES.google.urlTemplate
  },
  ui: {
    tabLayout: 'vertical',
    favoritesBar: true,
    sidebarWidth: 252,
    restoreSession: true,
    gamingMode: false,
    userName: '',
    density: 'normal'
  },
  privacy: {
    adblock: true,
    trackingProtection: true
  },
  favorites: [],
  saved: [],
  shortcuts: [],
  bangs: [],
  customThemes: [],
  bookmarks: [],
  bookmarkFolders: [],
  tabGroups: [],
  extensions: [],
  history: [],
  zoom: {},
  theme: {
    // Obsidian-Design: warmer Akzent auf tiefem Anthrazit.
    accent: '#ff6b35',
    accentAlt: '#00d4aa',
    bg: '#0a0a0f',
    text: '#e4e4ec',
    textDim: '#8a8a9a',
    stroke: 8,
    shadow: 35,
    saturation: 180,
    font: 'system',
    fontSize: 100,
    wallpaper: '',
    glass: 0.72,
    blur: 20,
    radius: 10,
    // Stil-Aspekte
    style: 'default',
    bgAnimation: 'aurora',
    animationSpeed: 100,
    animationIntensity: 50,
    glowIntensity: 50,
    transitionSpeed: 100,
    borderStyle: 'default',
    // Cursor-Effekte (Design-Studio)
    cursorEffect: 'none',
    cursorColor: '#ff6b35',
    cursorSize: 16,
    cursorIntensity: 60,
    cursorImage: '',
    cursorPreset: '',
    customCssChrome: '',
    customCssNewtab: ''
  },
  hotkeys: {
    newTab: ['Ctrl+T'],
    closeTab: ['Ctrl+W'],
    reopenTab: ['Ctrl+Shift+T'],
    focusOmnibox: ['Ctrl+L', 'Alt+D'],
    reload: ['Ctrl+R', 'F5'],
    hardReload: ['Ctrl+Shift+R', 'Ctrl+F5'],
    back: ['Alt+Left'],
    forward: ['Alt+Right'],
    nextTab: ['Ctrl+Tab'],
    prevTab: ['Ctrl+Shift+Tab'],
    openSettings: ['Ctrl+,'],
  pictureInPicture: ['Ctrl+Shift+P'],
  splitView: ['Ctrl+\\'],
  commandPalette: ['Ctrl+K'],
  fullscreen: ['F11'],
  print: ['Ctrl+P'],
    tabSearch: ['Ctrl+Shift+A'],
    findInPage: ['Ctrl+F'],
    zoomIn: ['Ctrl+=', 'Ctrl+NumpadAdd'],
    zoomOut: ['Ctrl+-', 'Ctrl+NumpadSubtract'],
    zoomReset: ['Ctrl+0'],
    devTools: ['F12', 'Ctrl+Shift+I']
  }
};

function mergeDeep(base, override) {
  const result = Array.isArray(base) ? [...base] : { ...base };
  for (const [key, value] of Object.entries(override || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value) &&
        base[key] && typeof base[key] === 'object' && !Array.isArray(base[key])) {
      result[key] = mergeDeep(base[key], value);
    } else if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

/* ---------------------------------------------------------------- Theme */

const HEX_PATTERN = /^#[0-9a-f]{6}$/i;
const SHORT_HEX_PATTERN = /^#[0-9a-f]{3}$/i;

function normalizeHex(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();

  if (HEX_PATTERN.test(trimmed)) return trimmed.toLowerCase();
  if (SHORT_HEX_PATTERN.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toLowerCase();
  }
  return fallback;
}

function clampNumber(value, min, max, fallback) {
  if (value === null || value === undefined || value === '') return fallback;

  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

/**
 * Validiert und begrenzt ein Theme, damit weder CSS-Werte noch die
 * settings.json durch kaputte Eingaben beschädigt werden können.
 */
function normalizeCss(value) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 30000);
}

const ALLOWED_STYLES = ['default', 'clean', 'animated', 'gaming', 'minimal'];
const ALLOWED_BG_ANIMATIONS = ['none', 'orbs', 'particles', 'waves', 'mesh', 'noise', 'aurora', 'grid', 'stars', 'matrix', 'pulse', 'fog'];
const ALLOWED_BORDER_STYLES = ['default', 'thin', 'glow', 'none'];
const ALLOWED_CURSOR_EFFECTS = ['none', 'trail', 'sparks', 'comet', 'ripple', 'laser', 'bubbles'];

function normalizeEnum(value, allowed, fallback) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim().toLowerCase();
  return allowed.includes(trimmed) ? trimmed : fallback;
}

function normalizeTheme(input, fallback = DEFAULT_SETTINGS.theme) {
  const theme = input && typeof input === 'object' ? input : {};
  const base = fallback && typeof fallback === 'object' ? fallback : DEFAULT_SETTINGS.theme;
  const defaults = DEFAULT_SETTINGS.theme;

  return {
    accent: normalizeHex(theme.accent, base.accent),
    accentAlt: normalizeHex(theme.accentAlt, base.accentAlt),
    bg: normalizeHex(theme.bg, base.bg),
    text: normalizeHex(theme.text, base.text ?? defaults.text),
    textDim: normalizeHex(theme.textDim, base.textDim ?? defaults.textDim),
    stroke: Math.round(clampNumber(theme.stroke, 0, 30, base.stroke ?? defaults.stroke)),
    shadow: Math.round(clampNumber(theme.shadow, 0, 80, base.shadow ?? defaults.shadow)),
    saturation: Math.round(clampNumber(theme.saturation, 100, 300, base.saturation ?? defaults.saturation)),
    font: typeof theme.font === 'string' && theme.font ? theme.font : (base.font || defaults.font),
    fontSize: Math.round(clampNumber(theme.fontSize, 80, 125, base.fontSize ?? defaults.fontSize)),
    wallpaper: typeof theme.wallpaper === 'string' ? theme.wallpaper.slice(0, 2000) : (base.wallpaper ?? defaults.wallpaper),
    glass: Math.round(clampNumber(theme.glass, 0.2, 0.95, base.glass) * 100) / 100,
    blur: Math.round(clampNumber(theme.blur, 0, 60, base.blur)),
    radius: Math.round(clampNumber(theme.radius, 0, 28, base.radius)),
    style: normalizeEnum(theme.style, ALLOWED_STYLES, base.style ?? defaults.style),
    bgAnimation: normalizeEnum(theme.bgAnimation, ALLOWED_BG_ANIMATIONS, base.bgAnimation ?? defaults.bgAnimation),
    animationSpeed: Math.round(clampNumber(theme.animationSpeed, 0, 200, base.animationSpeed ?? defaults.animationSpeed)),
    animationIntensity: Math.round(clampNumber(theme.animationIntensity, 0, 100, base.animationIntensity ?? defaults.animationIntensity)),
    glowIntensity: Math.round(clampNumber(theme.glowIntensity, 0, 100, base.glowIntensity ?? defaults.glowIntensity)),
    transitionSpeed: Math.round(clampNumber(theme.transitionSpeed, 0, 200, base.transitionSpeed ?? defaults.transitionSpeed)),
    borderStyle: normalizeEnum(theme.borderStyle, ALLOWED_BORDER_STYLES, base.borderStyle ?? defaults.borderStyle),
    cursorEffect: normalizeEnum(theme.cursorEffect, ALLOWED_CURSOR_EFFECTS, base.cursorEffect ?? defaults.cursorEffect),
    cursorColor: normalizeHex(theme.cursorColor, base.cursorColor ?? defaults.cursorColor),
    cursorSize: Math.round(clampNumber(theme.cursorSize, 2, 40, base.cursorSize ?? defaults.cursorSize)),
    cursorIntensity: Math.round(clampNumber(theme.cursorIntensity, 0, 100, base.cursorIntensity ?? defaults.cursorIntensity)),
    cursorImage: typeof theme.cursorImage === 'string' ? theme.cursorImage.trim().slice(0, 2000) : (base.cursorImage ?? defaults.cursorImage ?? ''),
    cursorPreset: typeof theme.cursorPreset === 'string' ? theme.cursorPreset.trim().slice(0, 60) : (base.cursorPreset ?? defaults.cursorPreset ?? ''),
    customCssChrome: normalizeCss(theme.customCssChrome ?? base.customCssChrome),
    customCssNewtab: normalizeCss(theme.customCssNewtab ?? base.customCssNewtab)
  };
}

/* --------------------------------------------------------- Suchmaschine */

function normalizeSearchTemplate(value) {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!/^https?:\/\/[^\s]+$/i.test(trimmed)) return null;
  if (!trimmed.includes('%s')) return null;

  return trimmed;
}

function normalizeSearch(input, fallback = DEFAULT_SETTINGS.search) {
  const search = input && typeof input === 'object' ? input : {};
  const base = fallback && typeof fallback === 'object' ? fallback : DEFAULT_SETTINGS.search;

  let engine = Object.prototype.hasOwnProperty.call(SEARCH_ENGINES, search.engine)
    ? search.engine
    : base.engine;

  if (!Object.prototype.hasOwnProperty.call(SEARCH_ENGINES, engine)) engine = 'google';

  if (engine === 'custom') {
    const fallbackTemplate = base.engine === 'custom'
      ? normalizeSearchTemplate(base.urlTemplate)
      : null;
    const template = normalizeSearchTemplate(search.urlTemplate) || fallbackTemplate;

    if (template) return { engine: 'custom', urlTemplate: template };
    return { engine: 'google', urlTemplate: SEARCH_ENGINES.google.urlTemplate };
  }

  return { engine, urlTemplate: SEARCH_ENGINES[engine].urlTemplate };
}

/* ------------------------------------------------------------- Oberfläche */

function normalizeUi(input, fallback = DEFAULT_SETTINGS.ui) {
  const ui = input && typeof input === 'object' ? input : {};
  const base = fallback && typeof fallback === 'object' ? fallback : DEFAULT_SETTINGS.ui;

  return {
    tabLayout: 'vertical',
    favoritesBar: typeof ui.favoritesBar === 'boolean' ? ui.favoritesBar : base.favoritesBar,
    sidebarWidth: clampNumber(ui.sidebarWidth, 180, 460, base.sidebarWidth ?? 252),
    restoreSession: typeof ui.restoreSession === 'boolean' ? ui.restoreSession : (base.restoreSession ?? true),
    gamingMode: typeof ui.gamingMode === 'boolean' ? ui.gamingMode : (base.gamingMode ?? false),
    userName: typeof ui.userName === 'string' ? ui.userName.trim().slice(0, 60) : (base.userName ?? ''),
    density: ['compact', 'normal', 'comfortable'].includes(ui.density) ? ui.density : (base.density ?? 'normal')
  };
}

/* -------------------------------------------------------------- Favoriten */

function normalizeFavoriteUrl(value) {
  if (typeof value !== 'string') return null;

  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeFavicon(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return /^(https?:\/\/|data:image\/)/i.test(trimmed) ? trimmed : '';
}

function favoriteTitle(value, url) {
  const title = typeof value === 'string' ? value.trim() : '';
  if (title) return title.slice(0, 120);

  try {
    return new URL(url).hostname.replace(/^www\./i, '') || url;
  } catch {
    return url;
  }
}

function normalizeFavorites(input) {
  if (!Array.isArray(input)) return [];

  const seen = new Set();
  const result = [];

  for (const entry of input) {
    if (!entry || typeof entry !== 'object') continue;

    const url = normalizeFavoriteUrl(entry.url);
    if (!url || seen.has(url)) continue;

    seen.add(url);
    result.push({
      id: typeof entry.id === 'string' && entry.id ? entry.id : randomUUID(),
      title: favoriteTitle(entry.title, url),
      url,
      favicon: normalizeFavicon(entry.favicon)
    });

    if (result.length >= MAX_FAVORITES) break;
  }

  return result;
}

/* --------------------------------------------------------------- Hotkeys */

function normalizeAccelerator(value) {
  if (typeof value !== 'string') return null;
  const accelerator = value.trim();
  if (!accelerator || accelerator.length > 64 || /\s/.test(accelerator)) return null;
  return accelerator;
}

/** Nur bekannte Aktionen und bereinigte Accelerator-Arrays werden gespeichert. */
function normalizeHotkeys(input, fallback = DEFAULT_SETTINGS.hotkeys) {
  const hotkeys = input && typeof input === 'object' ? input : {};
  const base = fallback && typeof fallback === 'object' ? fallback : DEFAULT_SETTINGS.hotkeys;
  const result = {};

  for (const action of Object.keys(DEFAULT_SETTINGS.hotkeys)) {
    const source = Object.prototype.hasOwnProperty.call(hotkeys, action)
      ? hotkeys[action]
      : base[action];
    const fallbackList = Array.isArray(base[action]) ? base[action] : DEFAULT_SETTINGS.hotkeys[action];
    const list = Array.isArray(source) ? source : fallbackList;
    const seen = new Set();

    result[action] = list
      .map(normalizeAccelerator)
      .filter((accelerator) => {
        if (!accelerator) return false;
        const key = accelerator.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 4);
  }

  return result;
}

function normalizeExtensions(input) {
  if (!Array.isArray(input)) return [];

  const seen = new Set();
  const result = [];

  for (const entry of input) {
    if (typeof entry !== 'string') continue;
    const extPath = entry.trim();
    if (!extPath || seen.has(extPath)) continue;

    try {
      if (!fs.statSync(extPath).isDirectory()) continue;
    } catch {
      continue;
    }

    seen.add(extPath);
    result.push(extPath);
    if (result.length >= MAX_EXTENSIONS) break;
  }

  return result;
}

let cached = null;

function settingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function legacySettingsPath() {
  // Vor dem Rename lag die Datei unter %APPDATA%\Pulse.
  return path.join(app.getPath('appData'), 'Pulse', 'settings.json');
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function normalizeHistory(input) {
  if (!Array.isArray(input)) return [];

  const result = [];
  const seen = new Set();

  for (const entry of input) {
    if (!entry || typeof entry !== 'object') continue;
    const url = normalizeFavoriteUrl(entry.url);
    if (!url) continue;

    const timestamp = Number.isFinite(Number(entry.timestamp)) ? Number(entry.timestamp) : Date.now();
    const key = `${url}|${Math.floor(timestamp / 1000)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    result.push({
      id: typeof entry.id === 'string' && entry.id ? entry.id : randomUUID(),
      url,
      title: favoriteTitle(entry.title, url).slice(0, 200),
      timestamp
    });

    if (result.length >= 2000) break;
  }

  return result.sort((a, b) => b.timestamp - a.timestamp);
}

function normalizeZoom(input) {
  if (!input || typeof input !== 'object') return {};

  const result = {};
  let count = 0;

  for (const [host, value] of Object.entries(input)) {
    if (!host || typeof host !== 'string' || count >= 500) break;
    const factor = Number(value);
    if (!Number.isFinite(factor)) continue;
    const clamped = Math.min(5, Math.max(0.25, Math.round(factor * 100) / 100));
    if (Math.abs(clamped - 1) < 0.01) continue;
    result[host.toLowerCase().trim()] = clamped;
    count += 1;
  }

  return result;
}

function getZoomFactor(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const zoom = loadSettings().zoom || {};
    return Number(zoom[host]) || 1;
  } catch {
    return 1;
  }
}

function setZoomFactor(url, factor) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const current = loadSettings();
    const clamped = Math.min(5, Math.max(0.25, Math.round(Number(factor) * 100) / 100));
    if (Math.abs(clamped - 1) < 0.01) delete current.zoom[host];
    else current.zoom[host] = clamped;
    current.zoom = normalizeZoom(current.zoom);
    persist();
    return clamped;
  } catch {
    return 1;
  }
}

function normalizePrivacy(input, fallback = DEFAULT_SETTINGS.privacy) {
  const privacy = input && typeof input === 'object' ? input : {};
  const base = fallback && typeof fallback === 'object' ? fallback : DEFAULT_SETTINGS.privacy;
  return {
    adblock: typeof privacy.adblock === 'boolean' ? privacy.adblock : base.adblock,
    trackingProtection: typeof privacy.trackingProtection === 'boolean' ? privacy.trackingProtection : base.trackingProtection
  };
}

function normalizeSaved(input) {
  if (!Array.isArray(input)) return [];
  return normalizeFavorites(input).slice(0, 200);
}

function normalizeShortcuts(input) {
  if (!Array.isArray(input)) return [];
  return normalizeFavorites(input).slice(0, 30);
}

function normalizeBangs(input) {
  if (!Array.isArray(input)) return [];
  const result = [];
  const seen = new Set();
  for (const entry of input) {
    if (!entry || typeof entry !== 'object') continue;
    const trigger = typeof entry.trigger === 'string' ? entry.trigger.trim().toLowerCase().replace(/^!/, '') : '';
    if (!trigger || trigger.length > 32 || /\s/.test(trigger)) continue;
    if (seen.has(trigger)) continue;
    let urlTemplate = typeof entry.urlTemplate === 'string' ? entry.urlTemplate.trim() : '';
    if (!/^https?:\/\//i.test(urlTemplate)) continue;
    if (!urlTemplate.includes('%s')) urlTemplate += (urlTemplate.includes('?') ? '&' : '?') + 'q=%s';
    seen.add(trigger);
    result.push({ trigger, urlTemplate });
    if (result.length >= 100) break;
  }
  return result;
}

function normalizeBookmarkFolders(input) {
  if (!Array.isArray(input)) return [];
  const result = [];
  const seen = new Set();
  for (const entry of input) {
    if (!entry || typeof entry !== 'object') continue;
    const name = typeof entry.name === 'string' ? entry.name.trim().slice(0, 60) : '';
    if (!name) continue;
    const id = typeof entry.id === 'string' && entry.id ? entry.id : randomUUID();
    if (seen.has(id)) continue;
    seen.add(id);
    result.push({
      id,
      name,
      parentId: typeof entry.parentId === 'string' ? entry.parentId : null
    });
    if (result.length >= 200) break;
  }
  return result;
}

function normalizeCustomThemes(input) {
  if (!Array.isArray(input)) return [];
  const result = [];
  const seen = new Set();
  for (const entry of input) {
    if (!entry || typeof entry !== 'object') continue;
    const name = typeof entry.name === 'string' ? entry.name.trim().slice(0, 40) : '';
    if (!name) continue;
    const id = typeof entry.id === 'string' && entry.id ? entry.id : 'custom-' + Math.random().toString(36).slice(2, 8);
    if (seen.has(id)) continue;
    seen.add(id);
    result.push({ id, name, theme: entry.theme && typeof entry.theme === 'object' ? entry.theme : {} });
    if (result.length >= 50) break;
  }
  return result;
}

const GROUP_COLORS = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink', 'gray'];

function normalizeTabGroups(input) {
  if (!Array.isArray(input)) return [];
  const result = [];
  const seen = new Set();
  for (const entry of input) {
    if (!entry || typeof entry !== 'object') continue;
    const name = typeof entry.name === 'string' ? entry.name.trim().slice(0, 40) : '';
    if (!name) continue;
    const id = typeof entry.id === 'string' && entry.id ? entry.id : randomUUID();
    if (seen.has(id)) continue;
    seen.add(id);
    const color = GROUP_COLORS.includes(entry.color) ? entry.color : 'blue';
    result.push({
      id,
      name,
      color,
      collapsed: typeof entry.collapsed === 'boolean' ? entry.collapsed : false,
      order: Number.isFinite(Number(entry.order)) ? Number(entry.order) : result.length
    });
    if (result.length >= 100) break;
  }
  return result.sort((a, b) => a.order - b.order);
}

function normalizeBookmarks(input) {
  if (!Array.isArray(input)) return [];
  const result = [];
  const seen = new Set();
  for (const entry of input) {
    if (!entry || typeof entry !== 'object') continue;
    const url = normalizeFavoriteUrl(entry.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    result.push({
      id: typeof entry.id === 'string' && entry.id ? entry.id : randomUUID(),
      title: favoriteTitle(entry.title, url),
      url,
      favicon: normalizeFavicon(entry.favicon),
      folderId: typeof entry.folderId === 'string' ? entry.folderId : null,
      tags: Array.isArray(entry.tags) ? entry.tags.map((t) => String(t).trim().slice(0, 30)).filter(Boolean).slice(0, 10) : [],
      createdAt: Number.isFinite(Number(entry.createdAt)) ? Number(entry.createdAt) : Date.now()
    });
    if (result.length >= 500) break;
  }
  return result;
}

function persist() {
  try {
    const dir = path.dirname(settingsPath());
    fs.mkdirSync(dir, { recursive: true });
    const tmp = settingsPath() + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(cached, null, 2), 'utf8');
    // Atomares Ersetzen: verhindert halb geschriebene/kaputte settings.json.
    try { fs.renameSync(tmp, settingsPath()); }
    catch {
      // Fallback für Windows (Ziel existiert): überschreiben.
      fs.copyFileSync(tmp, settingsPath());
      try { fs.unlinkSync(tmp); } catch {}
    }
  } catch (error) {
    console.warn('[config] Einstellungen konnten nicht gespeichert werden:', error.message);
  }
}

function loadSettings() {
  if (cached) return cached;

  let stored = readJson(settingsPath());
  if (stored === null && fs.existsSync(settingsPath())) {
    // Datei vorhanden, aber nicht lesbar (z. B. halb geschrieben): Backup anlegen,
    // damit keine Daten stillschweigend verloren gehen, und versuchen, aus .tmp
    // oder dem letzten Backup wiederherzustellen.
    try {
      fs.copyFileSync(settingsPath(), settingsPath() + '.corrupt-' + Date.now());
    } catch {}
    const fromTmp = readJson(settingsPath() + '.tmp');
    if (fromTmp) stored = fromTmp;
  }
  if (stored === null) stored = readJson(legacySettingsPath());
  if (stored === null || typeof stored !== 'object') stored = {};

  // Ältere Versionen kannten keinen Suchmaschinen-Schlüssel und nutzten
  // DuckDuckGo. Ohne gespeicherte Engine starten wir mit Google.
  const hasStoredEngine = stored.search &&
    typeof stored.search === 'object' &&
    typeof stored.search.engine === 'string';

  cached = mergeDeep(DEFAULT_SETTINGS, stored);

  if (!hasStoredEngine) {
    cached.search = { ...DEFAULT_SETTINGS.search };
  }

  cached.search = normalizeSearch(cached.search);
  cached.ui = normalizeUi(cached.ui);
  cached.favorites = normalizeFavorites(cached.favorites);
  cached.saved = normalizeSaved(cached.saved);
  cached.shortcuts = normalizeShortcuts(cached.shortcuts);
  cached.bangs = normalizeBangs(cached.bangs);
  cached.customThemes = normalizeCustomThemes(cached.customThemes);
  cached.bookmarks = normalizeBookmarks(cached.bookmarks);
  cached.bookmarkFolders = normalizeBookmarkFolders(cached.bookmarkFolders);
  cached.tabGroups = normalizeTabGroups(cached.tabGroups);
  cached.extensions = normalizeExtensions(cached.extensions);
  cached.history = normalizeHistory(cached.history);
  cached.zoom = normalizeZoom(cached.zoom);
  cached.privacy = normalizePrivacy(cached.privacy);
  cached.theme = normalizeTheme(cached.theme);
  cached.hotkeys = normalizeHotkeys(cached.hotkeys);
  persist();

  return cached;
}

function publicSettings() {
  const current = loadSettings();

  return {
    search: { ...current.search },
    ui: { ...current.ui },
    favorites: current.favorites.map((favorite) => ({ ...favorite })),
    saved: current.saved.map((entry) => ({ ...entry })),
    shortcuts: current.shortcuts.map((entry) => ({ ...entry })),
    bangs: current.bangs.map((entry) => ({ ...entry })),
    bookmarks: current.bookmarks.map((entry) => ({ ...entry, tags: [...entry.tags] })),
    bookmarkFolders: current.bookmarkFolders.map((folder) => ({ ...folder })),
    tabGroups: current.tabGroups.map((group) => ({ ...group })),
    extensions: [...current.extensions],
    history: current.history.map((entry) => ({ ...entry })),
    privacy: { ...current.privacy },
    hotkeys: Object.fromEntries(
      Object.entries(current.hotkeys).map(([action, accelerators]) => [action, [...accelerators]])
    ),
    customThemes: current.customThemes.map((entry) => ({ ...entry, theme: { ...entry.theme } }))
  };
}

function updateTheme(input) {
  const current = loadSettings();
  current.theme = normalizeTheme(input, current.theme);
  persist();
  return current.theme;
}

function updateSettings(patch) {
  const current = loadSettings();

  if (patch && typeof patch === 'object') {
    if (patch.search) current.search = normalizeSearch(patch.search, current.search);
    if (patch.ui) current.ui = normalizeUi(patch.ui, current.ui);
    if (patch.favorites) current.favorites = normalizeFavorites(patch.favorites);
    if (patch.saved) current.saved = normalizeSaved(patch.saved);
    if (patch.shortcuts) current.shortcuts = normalizeShortcuts(patch.shortcuts);
    if (patch.bangs) current.bangs = normalizeBangs(patch.bangs);
    if (patch.customThemes) current.customThemes = normalizeCustomThemes(patch.customThemes);
    if (patch.bookmarks) current.bookmarks = normalizeBookmarks(patch.bookmarks);
    if (patch.bookmarkFolders) current.bookmarkFolders = normalizeBookmarkFolders(patch.bookmarkFolders);
    if (patch.tabGroups) current.tabGroups = normalizeTabGroups(patch.tabGroups);
    if (patch.extensions) current.extensions = normalizeExtensions(patch.extensions);
    if (patch.history) current.history = normalizeHistory(patch.history);
    if (patch.zoom) current.zoom = normalizeZoom(patch.zoom);
    if (patch.privacy) current.privacy = normalizePrivacy(patch.privacy, current.privacy);
    if (patch.hotkeys) current.hotkeys = normalizeHotkeys(patch.hotkeys, current.hotkeys);
  }

  persist();
  return publicSettings();
}

function addFavorite(entry) {
  const current = loadSettings();
  const url = normalizeFavoriteUrl(entry?.url);
  if (!url) return publicSettings();

  const existing = current.favorites.find((favorite) => favorite.url === url);

  if (existing) {
    if (entry.title) existing.title = favoriteTitle(entry.title, url);
    if (entry.favicon) existing.favicon = normalizeFavicon(entry.favicon);
  } else {
    current.favorites.push({
      id: randomUUID(),
      title: favoriteTitle(entry?.title, url),
      url,
      favicon: normalizeFavicon(entry?.favicon)
    });
    current.favorites = normalizeFavorites(current.favorites);
  }

  persist();
  return publicSettings();
}

function removeFavorite(id) {
  const current = loadSettings();
  current.favorites = current.favorites.filter((favorite) => favorite.id !== id);
  persist();
  return publicSettings();
}

function addHistoryEntry({ url, title } = {}) {
  const normalized = normalizeFavoriteUrl(url);
  if (!normalized) return publicSettings();

  const current = loadSettings();
  const now = Date.now();
  const last = current.history[0];

  if (last && last.url === normalized && now - Number(last.timestamp || 0) < 30000) {
    last.title = favoriteTitle(title, normalized);
    last.timestamp = now;
  } else {
    current.history.unshift({
      id: randomUUID(),
      url: normalized,
      title: favoriteTitle(title, normalized),
      timestamp: now
    });
  }

  current.history = normalizeHistory(current.history);
  persist();
  return publicSettings();
}
function addSaved(entry) {
  const current = loadSettings();
  const url = normalizeFavoriteUrl(entry?.url);
  if (!url) return publicSettings();

  const existing = current.saved.find((item) => item.url === url);
  if (existing) {
    if (entry.title) existing.title = favoriteTitle(entry.title, url);
    if (entry.favicon) existing.favicon = normalizeFavicon(entry.favicon);
  } else {
    current.saved.unshift({
      id: randomUUID(),
      title: favoriteTitle(entry?.title, url),
      url,
      favicon: normalizeFavicon(entry?.favicon)
    });
    current.saved = normalizeSaved(current.saved);
  }

  persist();
  return publicSettings();
}

function removeSaved(id) {
  const current = loadSettings();
  current.saved = current.saved.filter((item) => item.id !== id);
  persist();
  return publicSettings();
}
function addShortcut(entry) {
  const current = loadSettings();
  const url = normalizeFavoriteUrl(entry?.url);
  if (!url) return publicSettings();

  const existing = current.shortcuts.find((item) => item.url === url);
  if (existing) {
    if (entry.title) existing.title = favoriteTitle(entry.title, url);
    if (entry.favicon) existing.favicon = normalizeFavicon(entry.favicon);
  } else {
    current.shortcuts.unshift({
      id: randomUUID(),
      title: favoriteTitle(entry?.title, url),
      url,
      favicon: normalizeFavicon(entry?.favicon)
    });
    current.shortcuts = normalizeShortcuts(current.shortcuts);
  }

  persist();
  return publicSettings();
}

function removeShortcut(id) {
  const current = loadSettings();
  current.shortcuts = current.shortcuts.filter((item) => item.id !== id);
  persist();
  return publicSettings();
}

function addBookmark(entry) {
  const current = loadSettings();
  const url = normalizeFavoriteUrl(entry?.url);
  if (!url) return publicSettings();

  const existing = current.bookmarks.find((b) => b.url === url);
  if (existing) {
    if (entry.title) existing.title = favoriteTitle(entry.title, url);
    if (entry.favicon) existing.favicon = normalizeFavicon(entry.favicon);
    if (entry.folderId) existing.folderId = entry.folderId;
    if (entry.tags) existing.tags = Array.isArray(entry.tags) ? entry.tags.map((t) => String(t).trim().slice(0, 30)).filter(Boolean).slice(0, 10) : existing.tags;
  } else {
    current.bookmarks.unshift({
      id: randomUUID(),
      title: favoriteTitle(entry?.title, url),
      url,
      favicon: normalizeFavicon(entry?.favicon),
      folderId: typeof entry?.folderId === 'string' ? entry.folderId : null,
      tags: Array.isArray(entry?.tags) ? entry.tags.map((t) => String(t).trim().slice(0, 30)).filter(Boolean).slice(0, 10) : [],
      createdAt: Date.now()
    });
    current.bookmarks = normalizeBookmarks(current.bookmarks);
  }

  persist();
  return publicSettings();
}

function removeBookmark(id) {
  const current = loadSettings();
  current.bookmarks = current.bookmarks.filter((b) => b.id !== id);
  persist();
  return publicSettings();
}

function addBookmarkFolder(name, parentId = null) {
  const current = loadSettings();
  const folderName = typeof name === 'string' ? name.trim().slice(0, 60) : '';
  if (!folderName) return publicSettings();
  current.bookmarkFolders.push({
    id: randomUUID(),
    name: folderName,
    parentId: typeof parentId === 'string' ? parentId : null
  });
  current.bookmarkFolders = normalizeBookmarkFolders(current.bookmarkFolders);
  persist();
  return publicSettings();
}

function removeBookmarkFolder(id) {
  const current = loadSettings();
  // Move bookmarks in this folder to root
  for (const b of current.bookmarks) {
    if (b.folderId === id) b.folderId = null;
  }
  // Remove subfolders recursively
  const toRemove = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of current.bookmarkFolders) {
      if (f.parentId && toRemove.has(f.parentId) && !toRemove.has(f.id)) {
        toRemove.add(f.id);
        changed = true;
      }
    }
  }
  current.bookmarkFolders = current.bookmarkFolders.filter((f) => !toRemove.has(f.id));
  persist();
  return publicSettings();
}

function addTabGroup(name, color = 'blue') {
  const current = loadSettings();
  const groupName = typeof name === 'string' ? name.trim().slice(0, 40) : '';
  if (!groupName) return publicSettings();
  const safeColor = GROUP_COLORS.includes(color) ? color : 'blue';
  const maxOrder = current.tabGroups.reduce((max, g) => Math.max(max, g.order || 0), -1);
  current.tabGroups.push({
    id: randomUUID(),
    name: groupName,
    color: safeColor,
    collapsed: false,
    order: maxOrder + 1
  });
  current.tabGroups = normalizeTabGroups(current.tabGroups);
  persist();
  return publicSettings();
}

function updateTabGroup(id, patch) {
  const current = loadSettings();
  const group = current.tabGroups.find((g) => g.id === id);
  if (!group) return publicSettings();
  if (patch && typeof patch === 'object') {
    if (typeof patch.name === 'string' && patch.name.trim()) group.name = patch.name.trim().slice(0, 40);
    if (GROUP_COLORS.includes(patch.color)) group.color = patch.color;
    if (typeof patch.collapsed === 'boolean') group.collapsed = patch.collapsed;
    if (Number.isFinite(Number(patch.order))) group.order = Number(patch.order);
  }
  current.tabGroups = normalizeTabGroups(current.tabGroups);
  persist();
  return publicSettings();
}

function removeTabGroup(id) {
  const current = loadSettings();
  current.tabGroups = current.tabGroups.filter((g) => g.id !== id);
  current.tabGroups = normalizeTabGroups(current.tabGroups);
  persist();
  return publicSettings();
}

function buildSearchUrl(query) {
  const template = loadSettings().search.urlTemplate;
  return template.replace('%s', encodeURIComponent(query));
}

module.exports = {
  loadSettings,
  publicSettings,
  updateTheme,
  updateSettings,
  addFavorite,
  removeFavorite,
  addSaved,
  removeSaved,
  addShortcut,
  removeShortcut,
  addBookmark,
  removeBookmark,
  addBookmarkFolder,
  removeBookmarkFolder,
  addTabGroup,
  updateTabGroup,
  removeTabGroup,
  addHistoryEntry,
  normalizeTheme,
  normalizeSearch,
  normalizeUi,
  normalizeFavorites,
  normalizeSaved,
  normalizeExtensions,
  normalizeHistory,
  normalizeZoom,
  normalizePrivacy,
  normalizeHotkeys,
  getZoomFactor,
  setZoomFactor,
  buildSearchUrl,
  settingsPath,
  SEARCH_ENGINES,
  TAB_LAYOUTS,
  DEFAULT_SETTINGS
};
