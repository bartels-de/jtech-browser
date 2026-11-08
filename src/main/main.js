'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const os = require('node:os');
const { app, BrowserWindow, protocol, ipcMain, Menu, dialog, session, shell, webContents, clipboard } = require('electron');
let autoUpdater = null;
try { autoUpdater = require('electron-updater').autoUpdater; } catch {}

const {
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
  normalizeExtensions,
  getZoomFactor,
  setZoomFactor,
  buildSearchUrl,
  flushHistory
} = require('./config');
const { compileHotkeys, matchHotkey } = require('./shortcuts');
const { TabManager } = require('./tabs');
const { ResourceManager } = require('./resources');
const { createJobLimiter } = require('./job-limit');
const AdmZip = require('adm-zip');
const { ElectronChromeExtensions } = require('electron-chrome-extensions');

const RENDERER_DIR = path.join(__dirname, '..', 'renderer');
const IS_DEV = process.argv.includes('--dev');

// Fehler landen zusätzlich in einer Datei, da Electron unter Windows keine
// Konsolenausgabe liefert, wenn es über den Explorer/Start-Process gestartet wird.
process.on('uncaughtExceptionMonitor', (error) => {
  try {
    const logFile = path.join(app.getPath('userData'), 'crash.log');
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    fs.appendFileSync(logFile, `[${new Date().toISOString()}]\n${error?.stack || error}\n\n`, 'utf8');
  } catch {
    /* Logging darf den Start nicht verhindern */
  }
});

// Muss vor app.whenReady() registriert werden.
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'jtech',
    privileges: { standard: true, secure: true, supportFetchAPI: true }
  }
]);

let window = null;
let chrome = null;
let tabs = null;
let hotkeys = [];
let settings = null;
let pendingSession = null;
let loadedExtensions = [];
let downloads = [];
let overlayOpen = false;
let adblocker = null;
let chromeExtensions = null;
let resources = null;
let updateState = { state: 'idle', version: null, percent: 0, message: '', lastCheck: 0 };
const jobLimiter = createJobLimiter();
let windowClosing = false;

function createWindow() {
  window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: false,
    backgroundColor: '#05060a',
    titleBarStyle: 'hidden',
    icon: path.join(__dirname, '..', 'renderer', 'assets', 'logo-256.png'),
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true
    }
  });

  chrome = window.webContents;

  tabs = new TabManager(window, {
    onState: (state) => {
      if (chrome && !chrome.isDestroyed()) chrome.send('tabs:state', state);
    },
    onInput: (input) => handleShortcut(input, { source: 'content', tabId: input.tabId }),
    getTheme: () => settings?.theme || null,
    getSearch: () => settings?.search || null,
    getBangs: () => settings?.bangs || [],
    getHistory: () => settings?.history || [],
    getUserName: () => settings?.ui?.userName || '',
    getShortcuts: () => settings?.shortcuts || [],
    onFindResult: (result) => {
      if (chrome && !chrome.isDestroyed()) chrome.send('find:result', result);
    },
    onNavigate: (tab) => {
      if (!tab?.url || !/^https?:\/\//i.test(tab.url)) return;
      const { addHistoryEntry } = require('./config');
      const entry = addHistoryEntry({ url: tab.url, title: tab.title });
      if (entry && chrome && !chrome.isDestroyed()) chrome.send('history:entry', entry);
    },
    getZoomFactor,
    setZoomFactor,
    onViewCreated: (contents) => {
      try { chromeExtensions?.addTab(contents, window); } catch (error) { console.warn('[extensions] addTab:', error.message); }
      resources?.onTabCreated(contents);
    },
    onTabActivated: (contents) => {
      if (!contents || contents.isDestroyed()) return;
      try { chromeExtensions?.selectTab(contents); } catch (error) { console.warn('[extensions] selectTab:', error.message); }
    },
    getContextMenuItems: (contents, params) => chromeExtensions?.getContextMenuItems(contents, params) || []
  });

  chrome.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (handleShortcut(input, { source: 'chrome' })) event.preventDefault();
  });

  chrome.on('did-finish-load', () => {
    tabs.emit();
    chrome.send('window:state', { maximized: window.isMaximized() });
    if (settings) chrome.send('theme:update', settings.theme);
    chrome.send('settings:update', publicSettings());
    chrome.send('extensions:update', loadedExtensions);
    chrome.send('update:status', publicUpdateState());
  });

  // Fenster im Hintergrund (z. B. beim Spielen): Animationen pausieren.
  window.on('focus', () => {
    tabs?.setWindowFocused(true);
    if (chrome && !chrome.isDestroyed()) chrome.send('window:focus', true);
  });
  window.on('blur', () => {
    tabs?.setWindowFocused(false);
    if (chrome && !chrome.isDestroyed()) chrome.send('window:focus', false);
  });
  window.on('maximize', () => chrome.send('window:state', { maximized: true }));
  window.on('unmaximize', () => chrome.send('window:state', { maximized: false }));
  window.on('enter-full-screen', () => { if (chrome && !chrome.isDestroyed()) chrome.send('window:fullscreen', { fullscreen: true }); });
  window.on('leave-full-screen', () => { if (chrome && !chrome.isDestroyed()) chrome.send('window:fullscreen', { fullscreen: false }); });
  window.on('resize', () => tabs.layout(window.getContentBounds()));
  window.on('close', () => {
    windowClosing = true;
    flushHistory();
    if (tabs && settings?.ui?.restoreSession) {
      try {
        fs.writeFileSync(sessionPath(), JSON.stringify(tabs.getState()), 'utf8');
      } catch {}
    }
  });

  window.on('closed', () => {
    resources?.stop();
    resources = null;
    window = null;
    chrome = null;
    tabs = null;
  });

  // Ressourcen-Manager: zentrale Messung, Limits und Prozess-Manager.
  resources = new ResourceManager({
    app,
    os,
    webContents,
    getTabManager: () => tabs,
    getExtensions: () => loadedExtensions,
    getUiContents: () => chrome,
    jobLimiter,
    onEvent: (text) => {
      if (chrome && !chrome.isDestroyed()) chrome.send('resources:event', text);
    }
  });
  resources.applySettings(settings?.performance || {});
  resources.start();

  window.loadFile(path.join(RENDERER_DIR, 'index.html'));
  window.once('ready-to-show', () => window.show());

  if (IS_DEV) {
    chrome.once('did-finish-load', () => chrome.openDevTools({ mode: 'detach' }));
  }

  // Erster Tab, sobald das Chrome-UI bereit ist.
  window.webContents.once('did-finish-load', () => {
    if (tabs && tabs.tabs.size === 0) {
      if (pendingSession?.tabs?.length) {
        // Nur der zuletzt aktive Tab lädt sofort, alle anderen erst beim Anklicken.
        const storedTabs = pendingSession.tabs;
        const storedActive = storedTabs.findIndex((entry) => entry.id && entry.id === pendingSession.activeId);
        const activeIndex = storedActive >= 0 ? storedActive : 0;
        let restoredActive = null;

        storedTabs.forEach((tabState, index) => {
          const url = tabState.url || 'jtech://newtab';
          const tab = index === activeIndex
            ? tabs.create({ url, activate: false })
            : tabs.createLazy({ url, title: tabState.title, favicon: tabState.favicon });
          if (index === activeIndex) restoredActive = tab.id;
          if (tabState.pinned) tabs.setPinned(tab.id, true);
          if (tabState.groupId) tabs.setGroup(tab.id, tabState.groupId);
          if (tabState.muted) tabs.setMuted(tab.id, true);
          if (tabState.zoom && tabState.zoom !== 1) {
            if (tab.sleeping) tab.zoom = tabState.zoom;
            else tabs.zoom('set', tab.id, tabState.zoom);
          }
          // Normale Lautstärken gehören der Website und werden beim Start nicht
          // überschrieben. Nur eine Verstärkung über 100 % wird wiederhergestellt.
          const storedVolume = Number(tabState.volume);
          if (Number.isFinite(storedVolume) && storedVolume > 1.0001) {
            tabs.setVolume(tab.id, storedVolume, true);
          }
        });

        pendingSession = null;

        if (restoredActive && tabs.tabs.has(restoredActive)) tabs.activate(restoredActive);
        else tabs.activate([...tabs.tabs.keys()][0]);
      } else {
        tabs.create();
        chrome.focus();
        chrome.send('ui:focus-omnibox');
      }
    }
  });
}

/** Ermittelt, ob die Eingabe eine URL oder eine Suchanfrage ist. */
function resolveInput(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;

  // JTech CS / JTech Bangs: Bang-Befehle wie "!yt cloud 9" oder "!yt-d cloud 9".
  if (value.startsWith('!')) {
    const match = value.match(/^!(\S+)(?:\s+(.*))?$/);
    if (match) {
      const bang = match[1].toLowerCase();
      const query = (match[2] || '').trim();
      const encoded = encodeURIComponent(query);

      // Benutzerdefinierte Bangs (JTech Bangs).
      const custom = (settings?.bangs || []).find((entry) => entry.trigger === bang);
      if (custom) {
        return custom.urlTemplate.replace('%s', encoded);
      }

      if (bang === 'yt' || bang === 'youtube') {
        return `https://www.youtube.com/results?search_query=${encoded}`;
      }
      if (bang === 'yt-d' || bang === 'ytd' || bang === 'yt-today') {
        // Videos, die heute hochgeladen wurden.
        return `https://www.youtube.com/results?search_query=${encoded}&sp=EgIIAQ%3D%3D`;
      }
      if (bang === 'g' || bang === 'google') {
        return `https://www.google.com/search?q=${encoded}`;
      }
      if (bang === 'ddg') {
        return `https://duckduckgo.com/?q=${encoded}`;
      }
      if (bang === 'gh' || bang === 'github') {
        return `https://github.com/search?q=${encoded}`;
      }
      // Unbekannter Bang -> normale Suche.
    }
  }

  if (value === 'jtech://newtab') return value;

  // Explizites Schema: nur http(s) erlauben (kein javascript:, file:, data:, ...).
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    try {
      const parsed = new URL(value);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.toString();
    } catch {
      /* ungültig -> als Suche behandeln */
    }
    return buildSearchUrl(value);
  }

  if (/^localhost(:\d+)?(\/|$)/i.test(value) ||
      /^\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?(\/|$)/.test(value)) {
    return `http://${value}`;
  }

  const looksLikeHost = !/\s/.test(value) && /^[^\s/]+\.[^\s/]{2,}/.test(value);
  return looksLikeHost ? `https://${value}` : buildSearchUrl(value);
}

function createTab({ url = 'jtech://newtab', focusOmnibox = false } = {}) {
  if (!tabs) return;
  tabs.create({ url });
  if (focusOmnibox) {
    chrome.focus();
    chrome.send('ui:focus-omnibox');
  }
}

function handleShortcut(input, origin) {
  const action = matchHotkey(hotkeys, input);
  if (!action) return false;

  // Während das Design-Studio offen ist, keine Tab-Aktionen auslösen.
  if (overlayOpen && action !== 'devTools') return false;

  switch (action) {
    case 'newTab':
      createTab({ focusOmnibox: true });
      break;
    case 'closeTab':
      if (tabs.activeId) tabs.close(tabs.activeId);
      break;
    case 'reopenTab':
      tabs.reopenClosed();
      break;
    case 'focusOmnibox':
      chrome.focus();
      chrome.send('ui:focus-omnibox');
      break;
    case 'reload':
      tabs.reload(false);
      break;
    case 'hardReload':
      tabs.reload(true);
      break;
    case 'back':
      tabs.goBack();
      break;
    case 'forward':
      tabs.goForward();
      break;
    case 'nextTab':
      tabs.cycle(1);
      break;
    case 'prevTab':
      tabs.cycle(-1);
      break;
    case 'openSettings':
      chrome.focus();
      chrome.send('ui:open-settings');
      break;
    case 'pictureInPicture':
      tabs?.togglePictureInPicture();
      break;
    case 'splitView':
      if (tabs?.splitMode) tabs.unsplit();
      else if (tabs && tabs.tabs.size >= 2) {
        const ids = [...tabs.tabs.keys()];
        const idx = ids.indexOf(tabs.activeId);
        const next = ids[(idx + 1 + ids.length) % ids.length];
        tabs.split(next);
      }
      break;
    case 'commandPalette':
      chrome.focus();
      chrome.send('ui:command-palette');
      break;
    case 'fullscreen':
      if (window) window.setFullScreen(!window.isFullScreen());
      break;
    case 'print':
      tabs?.active?.view.webContents.print();
      break;
    case 'tabSearch':
      chrome.focus();
      chrome.send('ui:tab-search');
      break;
    case 'findInPage':
      chrome.focus();
      chrome.send('ui:find-open');
      break;
    case 'zoomIn':
      tabs.zoom('in');
      break;
    case 'zoomOut':
      tabs.zoom('out');
      break;
    case 'zoomReset':
      tabs.zoom('reset');
      break;
    case 'copyUrl': {
      // Adresse der aktiven Seite kopieren (nicht für die Startseite).
      const url = tabs?.active?.view?.webContents?.getURL() || '';
      const copyable = /^https?:\/\//i.test(url);
      if (copyable) clipboard.writeText(url);
      if (chrome && !chrome.isDestroyed()) {
        chrome.send('ui:toast', copyable ? 'Link kopiert' : 'Diese Seite hat keinen Link zum Kopieren');
      }
      break;
    }
    case 'taskManager':
      chrome.focus();
      chrome.send('ui:task-manager');
      break;
    case 'devTools': {
      const target = origin.source === 'content'
        ? tabs.tabs.get(origin.tabId)?.view.webContents
        : chrome;
      if (target) {
        if (target.isDevToolsOpened()) target.closeDevTools();
        else target.openDevTools({ mode: 'detach' });
      }
      break;
    }
    default:
      return false;
  }

  return true;
}

// APIs, die Electron für Erweiterungen nicht bereitstellt. Erweiterungen, die
// darauf aufbauen (z. B. uBlock Origin Lite), laden zwar, funktionieren aber nicht.
const UNSUPPORTED_EXTENSION_PERMISSIONS = [
  'declarativeNetRequest',
  'declarativeNetRequestWithHostAccess',
  'declarativeNetRequestFeedback',
  'offscreen',
  'userScripts',
  'sidePanel'
];

function unsupportedPermissions(manifest) {
  const requested = Array.isArray(manifest.permissions) ? manifest.permissions : [];
  return UNSUPPORTED_EXTENSION_PERMISSIONS.filter((permission) => requested.includes(permission));
}

/** Liest das passendste Icon einer Erweiterung als data:-URL (für das UI). */
function extensionIcon(manifest, extPath) {
  const action = manifest.action || manifest.browser_action || {};
  const candidates = [];
  if (typeof action.default_icon === 'string') candidates.push([32, action.default_icon]);
  for (const source of [action.default_icon, manifest.icons]) {
    if (source && typeof source === 'object') {
      for (const [size, file] of Object.entries(source)) candidates.push([Number(size) || 0, file]);
    }
  }
  // Bevorzugt ~32 px, sonst das nächstgrößere bzw. größte Icon.
  candidates.sort((a, b) => Math.abs(a[0] - 32) - Math.abs(b[0] - 32) || b[0] - a[0]);
  for (const [, file] of candidates) {
    if (typeof file !== 'string') continue;
    const filePath = path.resolve(extPath, file.replace(/^\/+/, ''));
    if (!filePath.startsWith(path.resolve(extPath))) continue;
    try {
      const ext = path.extname(filePath).toLowerCase();
      const mime = { '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }[ext];
      if (!mime) continue;
      return `data:${mime};base64,${fs.readFileSync(filePath).toString('base64')}`;
    } catch {
      /* nächstes Icon probieren */
    }
  }
  return '';
}

function extensionMetadata(extension, extPath) {
  const manifest = extension.manifest || {};
  const resolvedPath = extPath || extension.path || '';
  return {
    id: extension.id,
    name: extension.name || manifest.name || extension.id,
    version: extension.version || manifest.version || '',
    path: resolvedPath,
    icon: resolvedPath ? extensionIcon(manifest, resolvedPath) : '',
    hasAction: Boolean(manifest.action || manifest.browser_action),
    unsupported: unsupportedPermissions(manifest)
  };
}

/** Erweiterungsliste inkl. Badge/Titel des aktiven Tabs (chrome.action). */
function extensionsWithActionState() {
  let state = null;
  try { state = chromeExtensions?.api?.browserAction?.getState?.() || null; } catch { state = null; }
  const activeId = tabs?.active?.view?.webContents?.id;
  return loadedExtensions.map((extension) => {
    const action = state?.actions?.find((entry) => entry.id === extension.id);
    const tabState = action && activeId != null ? action.tabs?.[activeId] : null;
    const badge = tabState?.text ?? action?.text ?? '';
    const badgeColor = tabState?.color ?? action?.color ?? '';
    const title = tabState?.title ?? action?.title ?? '';
    return { ...extension, badge: String(badge || ''), badgeColor: typeof badgeColor === 'string' ? badgeColor : '', title: String(title || '') };
  });
}

/** Chrome-Erweiterungs-API (chrome.tabs, chrome.action, Popups, Kontextmenüs). */
function setupChromeExtensions() {
  try {
    chromeExtensions = new ElectronChromeExtensions({
      session: session.defaultSession,
      async createTab(details = {}) {
        if (!tabs || !window) throw new Error('Kein Browserfenster');
        const tab = tabs.create({ url: details.url || 'jtech://newtab', activate: details.active !== false });
        return [tab.view.webContents, window];
      },
      selectTab(contents) {
        tabs?.activateByContents(contents);
      },
      removeTab(contents) {
        if (windowClosing || !tabs || !window || window.isDestroyed()) return;
        tabs.closeByContents(contents);
      },
      async createWindow(details = {}) {
        // JTech Browser hat ein Fenster: neue "Fenster" werden zu Tabs.
        if (!tabs || !window) throw new Error('Kein Browserfenster');
        const urls = Array.isArray(details.url) ? details.url : [details.url || 'jtech://newtab'];
        for (const url of urls) tabs.create({ url, activate: true });
        return window;
      },
      removeWindow() {
        /* Das Hauptfenster wird nicht von Erweiterungen geschlossen. */
      }
    });
  } catch (error) {
    console.warn('[extensions] Chrome-API nicht verfügbar:', error.message);
    chromeExtensions = null;
    return;
  }

  // Im Dev-Modus DevTools für Erweiterungs-Popups öffnen (Popup bleibt dann offen).
  if (IS_DEV) {
    chromeExtensions.on('browser-action-popup-created', (popup) => {
      const contents = popup?.browserWindow?.webContents;
      if (contents && !contents.isDestroyed()) contents.openDevTools({ mode: 'detach' });
    });
  }
}

async function loadExtensionFromPath(extPath) {
  try {
    const extension = await session.defaultSession.extensions.loadExtension(extPath, { allowFileAccess: true });
    const metadata = extensionMetadata(extension, extPath);
    if (!loadedExtensions.some((item) => item.id === metadata.id)) loadedExtensions.push(metadata);
    return metadata;
  } catch (error) {
    console.warn('[extensions] Laden fehlgeschlagen:', extPath, error.message);
    return null;
  }
}

async function loadExtensions(paths) {
  loadedExtensions = [];
  for (const extPath of paths || []) {
    await loadExtensionFromPath(extPath);
  }
  return loadedExtensions;
}

function extractExtensionId(input) {
  const trimmed = String(input || '').trim();
  // Chrome Web Store URL
  const urlMatch = trimmed.match(/chrome\.google\.com\/webstore\/detail\/[^/]*\/([a-p]{32})/i)
    || trimmed.match(/chromewebstore\.google\.com\/detail\/[^/]*\/([a-p]{32})/i);
  if (urlMatch) return urlMatch[1];
  // Bare extension ID
  if (/^[a-p]{32}$/i.test(trimmed)) return trimmed.toLowerCase();
  return null;
}

async function downloadCrx(extensionId) {
  const https = require('node:https');
  const chromeVersion = process.versions.chrome || '142.0.0.0';
  const url = `https://update.googleapis.com/service/update2/crx?response=redirect&prodversion=${chromeVersion}&acceptformat=crx2,crx3&x=id%3D${extensionId}%26uc`;
  return new Promise((resolve, reject) => {
    const headers = { 'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36` };
    https.get(url, { headers }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        https.get(res.headers.location, { headers }, (res2) => {
          const chunks = [];
          res2.on('data', (c) => chunks.push(c));
          res2.on('end', () => resolve(Buffer.concat(chunks)));
          res2.on('error', reject);
        }).on('error', reject);
      } else if (res.statusCode === 200) {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      } else {
        reject(new Error(`HTTP ${res.statusCode}`));
      }
    }).on('error', reject);
  });
}

async function installExtensionFromStore(input) {
  const extensionId = extractExtensionId(input);
  if (!extensionId) {
    console.warn('[extensions] Ungültige Erweiterungs-ID:', input);
    return null;
  }

  try {
    const crx = await downloadCrx(extensionId);
    if (!crx || crx.length < 100) throw new Error('Leere Antwort');

    // CRX3 header parsen
    let offset = 0;
    if (crx.toString('ascii', 0, 4) === 'Cr24') {
      const version = crx.readUInt32LE(4);
      if (version === 3) {
        const headerSize = crx.readUInt32LE(8);
        offset = 12 + headerSize;
      } else if (version === 2) {
        const publicKeySize = crx.readUInt32LE(8);
        const signatureSize = crx.readUInt32LE(12);
        offset = 16 + publicKeySize + signatureSize;
      } else {
        throw new Error(`Unbekanntes CRX-Format: ${version}`);
      }
    }

    const zipBuffer = crx.slice(offset);
    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries();
    if (!entries || entries.length === 0) throw new Error('Keine Dateien im CRX');

    // Bereits installiert: alte Version entladen, bevor die Dateien ersetzt werden.
    const updated = loadedExtensions.some((item) => item.id === extensionId);
    if (updated) {
      try { session.defaultSession.extensions.removeExtension(extensionId); } catch {}
      loadedExtensions = loadedExtensions.filter((item) => item.id !== extensionId);
    }

    const extDir = path.join(app.getPath('userData'), 'extensions', extensionId);
    fs.mkdirSync(extDir, { recursive: true });
    // Alten Inhalt entfernen
    fs.rmSync(extDir, { recursive: true, force: true });
    fs.mkdirSync(extDir, { recursive: true });
    zip.extractAllTo(extDir, true);

    const metadata = await loadExtensionFromPath(extDir);
    if (!metadata) throw new Error('Erweiterung konnte nicht geladen werden');

    const current = loadSettings();
    if (!current.extensions.includes(extDir)) {
      current.extensions.push(extDir);
      current.extensions = normalizeExtensions(current.extensions);
    }
    return { ...metadata, updated };
  } catch (error) {
    console.warn('[extensions] Store-Installation fehlgeschlagen:', error.message);
    return null;
  }
}

/* ------------------------------------------------------------ Auto-Update */

// Updates kommen aus den GitHub Releases (siehe build.publish in package.json).
// Sie werden im Hintergrund geladen und beim nächsten Beenden installiert;
// „Neu starten“ im UI installiert sofort. Kein erzwungener Neustart.
const UPDATE_CHECK_INTERVAL = 4 * 60 * 60 * 1000;

function updatesSupported() {
  return Boolean(autoUpdater) && app.isPackaged;
}

function publicUpdateState() {
  return {
    ...updateState,
    current: app.getVersion(),
    supported: updatesSupported()
  };
}

function setUpdateState(patch) {
  updateState = { ...updateState, ...patch };
  if (chrome && !chrome.isDestroyed()) chrome.send('update:status', publicUpdateState());
}

async function checkForUpdates() {
  if (!updatesSupported()) return publicUpdateState();
  if (updateState.state === 'downloading' || updateState.state === 'ready') return publicUpdateState();
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    setUpdateState({ state: 'error', message: String(error?.message || error).slice(0, 300), lastCheck: Date.now() });
  }
  return publicUpdateState();
}

function setupAutoUpdater() {
  if (!updatesSupported()) return;
  autoUpdater.logger = console;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => setUpdateState({ state: 'checking', message: '' }));
  autoUpdater.on('update-available', (info) => setUpdateState({ state: 'downloading', version: info?.version || null, percent: 0 }));
  autoUpdater.on('update-not-available', () => setUpdateState({ state: 'none', lastCheck: Date.now() }));
  autoUpdater.on('download-progress', (progress) => setUpdateState({ state: 'downloading', percent: Math.round(progress?.percent || 0) }));
  autoUpdater.on('update-downloaded', (info) => setUpdateState({ state: 'ready', version: info?.version || updateState.version, percent: 100, lastCheck: Date.now() }));
  autoUpdater.on('error', (error) => setUpdateState({ state: 'error', message: String(error?.message || error).slice(0, 300), lastCheck: Date.now() }));

  setTimeout(checkForUpdates, 15000).unref?.();
  setInterval(checkForUpdates, UPDATE_CHECK_INTERVAL).unref?.();
}

function broadcastDownloads() {
  if (chrome && !chrome.isDestroyed()) {
    chrome.send('downloads:update', downloads.map(({ item, ...rest }) => rest));
  }
}

// Filterlisten ändern sich laufend (z. B. für YouTube). Der Cache wird daher
// höchstens einen Tag verwendet und im Hintergrund erneuert.
const ADBLOCK_MAX_AGE = 24 * 60 * 60 * 1000;
let adblockRefreshTimer = null;

function adblockCachePath() {
  return path.join(app.getPath('userData'), 'adblocker-engine.bin');
}

async function adblockCacheIsStale() {
  try {
    const stats = await fs.promises.stat(adblockCachePath());
    return Date.now() - stats.mtimeMs > ADBLOCK_MAX_AGE;
  } catch {
    return true;
  }
}

/** Frische Filterliste laden und als Cache speichern; null bei Fehler. */
async function downloadAdblockEngine() {
  try {
    const { ElectronBlocker } = require('@ghostery/adblocker-electron');
    const blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
    await fs.promises.writeFile(adblockCachePath(), Buffer.from(blocker.serialize()));
    return blocker;
  } catch (error) {
    console.warn('[adblock] Filterliste konnte nicht aktualisiert werden:', error.message);
    return null;
  }
}

async function enableAdblock() {
  if (adblocker) return;
  try {
    const { ElectronBlocker } = require('@ghostery/adblocker-electron');
    let blocker = (await adblockCacheIsStale()) ? await downloadAdblockEngine() : null;
    if (!blocker) {
      // Aktueller Cache oder Download fehlgeschlagen: vorhandene Liste verwenden.
      blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch, {
        path: adblockCachePath(),
        read: async (filePath) => fs.promises.readFile(filePath),
        write: async (filePath, buffer) => fs.promises.writeFile(filePath, buffer)
      });
    }
    adblocker = blocker;
    adblocker.enableBlockingInSession(session.defaultSession);
  } catch (error) {
    console.warn('[adblock] Aktivierung fehlgeschlagen:', error.message);
    adblocker = null;
  }

  if (!adblockRefreshTimer) {
    adblockRefreshTimer = setInterval(refreshAdblock, 6 * 60 * 60 * 1000);
    adblockRefreshTimer.unref?.();
  }
}

async function refreshAdblock() {
  if (!adblocker || !(await adblockCacheIsStale())) return;
  const fresh = await downloadAdblockEngine();
  if (!fresh || !adblocker) return;
  try { adblocker.disableBlockingInSession(session.defaultSession); } catch {}
  adblocker = fresh;
  adblocker.enableBlockingInSession(session.defaultSession);
}

function disableAdblock() {
  if (!adblocker) return;
  try {
    adblocker.disableBlockingInSession(session.defaultSession);
  } catch {}
  adblocker = null;
}

async function updateAdblock(enabled) {
  if (enabled) await enableAdblock();
  else disableAdblock();
}

function applySettingsUpdate(next) {
  hotkeys = compileHotkeys(settings.hotkeys);
  tabs?.applySearch(settings.search);
  tabs?.applyUser(settings.ui?.userName || '');
  tabs?.applyShortcuts(settings.shortcuts || []);
  if (settings.ui.gamingMode) tabs?.sleepBackgroundTabs();
  else tabs?.wakeAllTabs();
  updateAdblock(!!settings.privacy?.adblock);
  resources?.applySettings(settings.performance || {});
  if (chrome && !chrome.isDestroyed()) chrome.send('settings:update', next);
  return next;
}

function registerIpc() {
  ipcMain.on('tabs:new', (_event, url) => {
    const target = url ? resolveInput(url) : 'jtech://newtab';
    createTab({ url: target || 'jtech://newtab', focusOmnibox: !url });
  });

  ipcMain.on('tabs:close', (_event, id) => {
    if (typeof id === 'string') tabs.close(id);
  });

  ipcMain.on('tabs:activate', (_event, id) => {
    if (typeof id === 'string') tabs.activate(id);
  });

  ipcMain.on('tabs:navigate', (_event, raw) => {
    const url = resolveInput(raw);
    if (!url) return;
    tabs.navigate(url);
    tabs.active?.view.webContents.focus();
  });

  ipcMain.on('tabs:back', () => tabs.goBack());
  ipcMain.on('tabs:forward', () => tabs.goForward());
  ipcMain.on('tabs:reload', (_event, hard) => tabs.reload(Boolean(hard)));
  ipcMain.on('tabs:stop', () => tabs.stop());

  ipcMain.on('tabs:picture-in-picture', () => tabs?.togglePictureInPicture());

  ipcMain.on('tabs:split', (_event, id) => {
    if (typeof id === 'string') tabs.split(id);
  });

  ipcMain.on('tabs:unsplit', () => tabs.unsplit());

  ipcMain.on('tabs:split-ratio', (_event, payload) => {
    if (payload && typeof payload.ratio === 'number') tabs.setSplitRatio(payload.ratio);
  });

  ipcMain.on('tabs:print', () => tabs?.active?.view.webContents.print());

  ipcMain.on('tabs:move', (_event, payload) => {
    if (!payload || typeof payload.id !== 'string') return;
    tabs.move(payload.id, payload.index);
  });

  ipcMain.on('tabs:command', (_event, payload) => {
    if (!payload || typeof payload.id !== 'string' || !tabs.tabs.has(payload.id)) return;

    switch (payload.command) {
      case 'reload': tabs.reload(false, payload.id); break;
      case 'duplicate': tabs.duplicate(payload.id); break;
      case 'pin': tabs.setPinned(payload.id, true); break;
      case 'unpin': tabs.setPinned(payload.id, false); break;
      case 'mute': tabs.setMuted(payload.id, true); break;
      case 'unmute': tabs.setMuted(payload.id, false); break;
      case 'close-others': tabs.closeOthers(payload.id); break;
      default: break;
    }
  });

  ipcMain.handle('tabs:group', (_event, payload) => {
    if (!payload || typeof payload.id !== 'string' || !tabs.tabs.has(payload.id)) return publicSettings();
    tabs.setGroup(payload.id, payload.groupId);
    return publicSettings();
  });

  ipcMain.handle('tabs:create-group', (_event, payload) => {
    if (!payload || typeof payload.name !== 'string') return publicSettings();
    return applySettingsUpdate(addTabGroup(payload.name, payload.color));
  });

  ipcMain.handle('tabs:update-group', (_event, payload) => {
    if (!payload || typeof payload.groupId !== 'string') return publicSettings();
    return applySettingsUpdate(updateTabGroup(payload.groupId, payload.patch));
  });

  ipcMain.handle('tabs:remove-group', (_event, payload) => {
    if (!payload || typeof payload.groupId !== 'string') return publicSettings();
    for (const tab of tabs.tabs.values()) {
      if (tab.groupId === payload.groupId) tab.groupId = null;
    }
    tabs?.emit();
    return applySettingsUpdate(removeTabGroup(payload.groupId));
  });

  ipcMain.on('tabs:zoom', (_event, payload) => {
    if (!payload || typeof payload.action !== 'string') return;
    tabs.zoom(payload.action, tabs.activeId, payload.value);
  });

  ipcMain.on('find:start', (_event, payload) => {
    if (!payload || typeof payload.query !== 'string') return;
    tabs.find(payload.query, payload);
  });

  ipcMain.on('find:stop', () => tabs.stopFind());

  ipcMain.on('window:minimize', () => window?.minimize());
  ipcMain.on('window:maximize', () => {
    if (!window) return;
    if (window.isMaximized()) window.unmaximize();
    else window.maximize();
  });
  ipcMain.on('window:close', () => window?.close());

  ipcMain.on('ui:chrome-height', (_event, height) => {
    if (typeof height === 'number' && Number.isFinite(height)) {
      tabs?.setChromeHeight(height);
    }
  });

  ipcMain.on('ui:layout', (_event, metrics) => {
    if (!metrics || typeof metrics !== 'object') return;
    tabs?.setLayout(metrics);
  });

  ipcMain.on('ui:focus-content', () => {
    tabs?.active?.view.webContents.focus();
  });

  ipcMain.on('ui:devtools', () => {
    const contents = tabs?.active?.view.webContents;
    if (!contents) return;
    if (contents.isDevToolsOpened()) contents.closeDevTools();
    else contents.openDevTools({ mode: 'detach' });
  });

  ipcMain.on('ui:overlay', (_event, open) => {
    overlayOpen = Boolean(open);
    tabs?.setOverlay(overlayOpen);
    if (overlayOpen) chrome?.focus();
  });

  ipcMain.on('ui:toggle-webview', (_event, visible) => {
    if (!tabs) return;
    const tab = tabs.active;
    if (!tab?.view) return;
    const view = tab.view;
    const isChild = tabs.window.contentView.children.includes(view);
    if (visible && !isChild) {
      tabs.window.contentView.addChildView(view);
      tabs.layout(tabs.window.getContentBounds());
    } else if (!visible && isChild) {
      tabs.window.contentView.removeChildView(view);
    }
  });

  ipcMain.on('ui:dock', (_event, width) => {
    if (typeof width === 'number' && Number.isFinite(width)) {
      tabs?.setDockWidth(width);
    }
  });

  ipcMain.handle('media:list', () => tabs?.listMedia() ?? []);

  ipcMain.handle('media:command', (_event, payload) => tabs?.mediaCommand(payload) ?? []);

  ipcMain.handle('media:pause-all', async () => {
    await tabs?.pauseAllMedia();
    return true;
  });

  ipcMain.handle('media:volume', (_event, payload) => {
    if (!payload || typeof payload.id !== 'string') return false;
    tabs?.setVolume(payload.id, payload.volume);
    return true;
  });

  ipcMain.handle('settings:get', () => publicSettings());
  ipcMain.handle('extensions:list', () => extensionsWithActionState());

  ipcMain.handle('theme:save', (_event, input) => {
    const theme = updateTheme(input);
    if (settings) settings.theme = theme;
    tabs?.applyTheme(theme);
    if (chrome && !chrome.isDestroyed()) chrome.send('theme:update', theme);
    return theme;
  });

  ipcMain.handle('settings:save', (_event, patch) => applySettingsUpdate(updateSettings(patch)));

  ipcMain.handle('extensions:install-from-store', async (_event, input) => {
    const metadata = await installExtensionFromStore(input);
    if (metadata) {
      if (chrome && !chrome.isDestroyed()) chrome.send('extensions:update', loadedExtensions);
      applySettingsUpdate(updateSettings({ extensions: loadSettings().extensions }));
    }
    // Ergebnis explizit melden: eine Neuinstallation ändert die Länge der Liste nicht.
    return {
      ok: Boolean(metadata),
      updated: Boolean(metadata?.updated),
      id: metadata?.id || null,
      extensions: loadedExtensions
    };
  });

  ipcMain.handle('extensions:load', async () => {
    const result = await dialog.showOpenDialog(window, {
      title: 'Erweiterung laden',
      properties: ['openFile', 'openDirectory'],
      filters: [
        { name: 'Erweiterungen', extensions: ['crx', 'zip'] },
        { name: 'Alle Dateien', extensions: ['*'] }
      ]
    });

    if (result.canceled || !result.filePaths?.length) {
      return { ok: false, canceled: true, id: null, extensions: loadedExtensions };
    }

    const selectedPath = result.filePaths[0];
    let extPath = selectedPath;

    // .crx oder .zip entpacken
    if (/\.crx$/i.test(selectedPath) || /\.zip$/i.test(selectedPath)) {
      try {
        const data = fs.readFileSync(selectedPath);
        let zipBuffer = data;
        if (/\.crx$/i.test(selectedPath)) {
          let offset = 0;
          if (data.toString('ascii', 0, 4) === 'Cr24') {
            const version = data.readUInt32LE(4);
            if (version === 3) {
              const headerSize = data.readUInt32LE(8);
              offset = 12 + headerSize;
            } else if (version === 2) {
              const publicKeySize = data.readUInt32LE(8);
              const signatureSize = data.readUInt32LE(12);
              offset = 16 + publicKeySize + signatureSize;
            }
          }
          zipBuffer = data.slice(offset);
        }

        const zip = new AdmZip(zipBuffer);
        const entries = zip.getEntries();
        if (!entries || entries.length === 0) throw new Error('Keine Dateien im Archiv');

        const baseName = path.basename(selectedPath, path.extname(selectedPath));
        const extDir = path.join(app.getPath('userData'), 'extensions', `${baseName}-${Date.now()}`);
        fs.mkdirSync(extDir, { recursive: true });
        zip.extractAllTo(extDir, true);
        extPath = extDir;
      } catch (error) {
        console.warn('[extensions] Entpacken fehlgeschlagen:', error.message);
        return { ok: false, canceled: false, id: null, extensions: loadedExtensions };
      }
    }

    const metadata = await loadExtensionFromPath(extPath);

    if (metadata) {
      const current = loadSettings();
      const nextExtensions = current.extensions.includes(extPath)
        ? current.extensions
        : [...current.extensions, extPath];
      settings = loadSettings();
      applySettingsUpdate(updateSettings({ extensions: nextExtensions }));
    }

    if (chrome && !chrome.isDestroyed()) chrome.send('extensions:update', loadedExtensions);
    return { ok: Boolean(metadata), canceled: false, id: metadata?.id || null, extensions: loadedExtensions };
  });

  ipcMain.handle('extensions:open-popup', (_event, payload) => {
    if (!payload || typeof payload.extensionId !== 'string') return false;
    if (!loadedExtensions.some((item) => item.id === payload.extensionId)) return false;
    const browserAction = chromeExtensions?.api?.browserAction;
    const activeContents = tabs?.active?.view?.webContents;
    if (!browserAction || !activeContents || activeContents.isDestroyed()) return false;

    const rect = payload.anchorRect || {};
    const anchorRect = {
      x: Number(rect.x) || 0,
      y: Number(rect.y) || 0,
      width: Number(rect.width) || 32,
      height: Number(rect.height) || 32
    };

    try {
      // Echtes Erweiterungs-Popup (inkl. chrome.*-APIs) oder chrome.action.onClicked.
      browserAction.activateClick({
        eventType: 'click',
        extensionId: payload.extensionId,
        tabId: activeContents.id,
        anchorRect
      });
      return true;
    } catch (error) {
      console.warn('[extensions] Popup fehlgeschlagen:', error.message);
      return false;
    }
  });

  ipcMain.handle('extensions:remove', (_event, id) => {
    if (typeof id !== 'string') return loadedExtensions;
    const extension = loadedExtensions.find((item) => item.id === id);
    if (!extension) return loadedExtensions;

    try { session.defaultSession.extensions.removeExtension(id); } catch {}
    loadedExtensions = loadedExtensions.filter((item) => item.id !== id);

    settings = loadSettings();
    settings.extensions = settings.extensions.filter((extPath) => extPath !== extension.path);
    const { updateSettings } = require('./config');
    applySettingsUpdate(updateSettings({ extensions: settings.extensions }));
    tabs?.reloadAll(true);
    if (chrome && !chrome.isDestroyed()) chrome.send('extensions:update', loadedExtensions);
    return loadedExtensions;
  });

  ipcMain.handle('update:get', () => publicUpdateState());
  ipcMain.handle('update:check', () => checkForUpdates());
  ipcMain.handle('update:install', () => {
    if (!updatesSupported() || updateState.state !== 'ready') return false;
    // isSilent = false (Installer kurz sichtbar), isForceRunAfter = true (danach starten)
    setImmediate(() => autoUpdater.quitAndInstall(false, true));
    return true;
  });

  // Schnappschuss des Ressourcen-Managers (misst selbst alle 2 s).
  ipcMain.handle('resources:snapshot', () => resources?.snapshot() || null);

  ipcMain.handle('resources:action', (_event, payload) => {
    if (!payload || typeof payload.type !== 'string') return false;
    return resources?.action({
      type: payload.type,
      pid: Number.isInteger(payload.pid) ? payload.pid : null,
      tabId: typeof payload.tabId === 'string' ? payload.tabId : null
    }) || false;
  });

  // Kompatibel zum alten HUD: liest den letzten Schnappschuss statt neu zu messen.
  ipcMain.handle('system:metrics', () => (resources?.snapshot()?.processes || [])
    .filter((row) => row.pid)
    .map((row) => ({ pid: row.pid, cpu: row.cpu, memory: row.memory, tabId: row.tabId })));

  ipcMain.on('downloads:open', (_event, id) => {
    const download = downloads.find((entry) => entry.id === id);
    if (download?.path) shell.openPath(download.path);
  });

  ipcMain.on('downloads:show', (_event, id) => {
    const download = downloads.find((entry) => entry.id === id);
    if (download?.path) shell.showItemInFolder(download.path);
  });

  ipcMain.on('downloads:cancel', (_event, id) => {
    const download = downloads.find((entry) => entry.id === id);
    if (download?.item && download.state === 'progressing') download.item.cancel();
  });

  ipcMain.handle('downloads:list', () => downloads.map(({ item, ...rest }) => rest));

  ipcMain.handle('favorites:add', (_event, entry) => applySettingsUpdate(addFavorite(entry)));

  ipcMain.handle('favorites:remove', (_event, id) => {
    if (typeof id !== 'string') return publicSettings();
    return applySettingsUpdate(removeFavorite(id));
  });

  ipcMain.handle('saved:add', (_event, entry) => applySettingsUpdate(addSaved(entry)));

  ipcMain.handle('saved:remove', (_event, id) => {
    if (typeof id !== 'string') return publicSettings();
    return applySettingsUpdate(removeSaved(id));
  });

  ipcMain.handle('shortcuts:add', (_event, entry) => applySettingsUpdate(addShortcut(entry)));

  ipcMain.handle('shortcuts:remove', (_event, id) => {
    if (typeof id !== 'string') return publicSettings();
    return applySettingsUpdate(removeShortcut(id));
  });

  ipcMain.handle('bookmarks:add', (_event, entry) => applySettingsUpdate(addBookmark(entry)));

  ipcMain.handle('bookmarks:remove', (_event, id) => {
    if (typeof id !== 'string') return publicSettings();
    return applySettingsUpdate(removeBookmark(id));
  });

  ipcMain.handle('bookmarks:addFolder', (_event, name, parentId) => applySettingsUpdate(addBookmarkFolder(name, parentId)));

  ipcMain.handle('bookmarks:removeFolder', (_event, id) => {
    if (typeof id !== 'string') return publicSettings();
    return applySettingsUpdate(removeBookmarkFolder(id));
  });

  ipcMain.handle('history:clear', () => applySettingsUpdate(updateSettings({ history: [] })));

}

function sessionPath() {
  return path.join(app.getPath('userData'), 'session.json');
}

function readSession() {
  try {
    return JSON.parse(fs.readFileSync(sessionPath(), 'utf8'));
  } catch {
    return null;
  }
}
function registerProtocol() {
  protocol.handle('jtech', async (request) => {
    const url = new URL(request.url);

    if (url.hostname === 'changelog') {
      try {
        const html = fs.readFileSync(path.join(RENDERER_DIR, 'changelog.html'), 'utf8');
        return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
      } catch (error) {
        return new Response('Changelog fehlt.', { status: 404 });
      }
    }

    if (url.hostname === 'newtab') {
      const relativePath = decodeURIComponent(url.pathname || '/')
        .replace(/^\/+/, '')
        .replace(/\\/g, '/');

      // Statische Dateien der Startseite (z. B. Logo) ausliefern.
      if (relativePath && relativePath.startsWith('assets/')) {
        const filePath = path.resolve(RENDERER_DIR, relativePath);
        if (filePath.startsWith(RENDERER_DIR + path.sep)) {
          try {
            const data = fs.readFileSync(filePath);
            const extension = path.extname(filePath).toLowerCase();
            const mimeType = {
              '.png': 'image/png',
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.svg': 'image/svg+xml',
              '.webp': 'image/webp',
              '.ico': 'image/x-icon'
            }[extension] || 'application/octet-stream';

            return new Response(data, {
              headers: { 'content-type': mimeType, 'cache-control': 'public, max-age=31536000, immutable' }
            });
          } catch (error) {
            return new Response(`Datei fehlt: ${error.message}`, { status: 404 });
          }
        }
      }

      try {
        const html = fs.readFileSync(path.join(RENDERER_DIR, 'newtab.html'), 'utf8');
        return new Response(html, {
          headers: { 'content-type': 'text/html; charset=utf-8' }
        });
      } catch (error) {
        return new Response(`Startseite fehlt: ${error.message}`, { status: 500 });
      }
    }

    return new Response('Nicht gefunden', { status: 404 });
  });
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!window) return;
    if (window.isMinimized()) window.restore();
    window.focus();
  });

  app.whenReady().then(async () => {
    app.setName('JTech Browser');

    // Wie ein normales Chrome melden: Electron- und App-Kennung entfernen.
    // Manche Seiten (z. B. Google-Dienste) behandeln unbekannte Browser anders.
    app.userAgentFallback = app.userAgentFallback
      .replace(/\s*Electron\/[\d.]+/i, '')
      .replace(/\(KHTML, like Gecko\) .*? Chrome\//, '(KHTML, like Gecko) Chrome/');

    // Inaktive Tabs nach der eingestellten Zeit schlafen legen.
    setInterval(() => {
      const minutes = Number(settings?.ui?.autoSleepMinutes) || 0;
      const count = tabs?.sleepIdleTabs(minutes * 60 * 1000) || 0;
      if (count) resources?.addEvent(`${count} inaktive${count === 1 ? 'r Tab' : ' Tabs'} schlafen gelegt (nach ${minutes} Min.)`);
    }, 60 * 1000).unref?.();
    Menu.setApplicationMenu(null);

    settings = loadSettings();
    hotkeys = compileHotkeys(settings.hotkeys);
    // Muss vor dem Laden der Erweiterungen eingerichtet sein.
    setupChromeExtensions();
    await loadExtensions(settings.extensions);

    if (settings?.privacy?.adblock) {
      enableAdblock().catch((e) => console.warn('[adblock]', e.message));
    }

    session.defaultSession.on('will-download', (event, item) => {
      const download = {
        id: randomUUID(),
        item,
        filename: item.getFilename(),
        url: item.getURL(),
        path: item.getSavePath(),
        totalBytes: item.getTotalBytes(),
        receivedBytes: 0,
        state: 'progressing',
        startTime: Date.now()
      };
      downloads.unshift(download);
      if (downloads.length > 100) downloads = downloads.slice(0, 100);

      item.on('updated', (_event, state) => {
        download.receivedBytes = item.getReceivedBytes();
        download.totalBytes = item.getTotalBytes();
        download.path = item.getSavePath();
        download.state = state === 'interrupted' ? 'interrupted' : 'progressing';
        broadcastDownloads();
      });

      item.on('done', (_event, state) => {
        download.receivedBytes = item.getReceivedBytes();
        download.totalBytes = item.getTotalBytes();
        download.path = item.getSavePath();
        download.state = state;
        broadcastDownloads();
      });

      broadcastDownloads();
    });

    registerProtocol();
    registerIpc();
    createWindow();

    // Changelog nach einem Update einmalig anzeigen.
    try {
      const versionFile = path.join(app.getPath('userData'), 'last-version.txt');
      let previous = '';
      try { previous = fs.readFileSync(versionFile, 'utf8').trim(); } catch {}
      const current = app.getVersion();
      if (previous && previous !== current) {
        const changelogWindow = new BrowserWindow({ width: 720, height: 640, title: 'JTech Browser - Changelog' });
        changelogWindow.loadFile(path.join(__dirname, '..', 'renderer', 'changelog.html'));
      }
      fs.writeFileSync(versionFile, current, 'utf8');
    } catch (error) {
      console.warn('[changelog]', error.message);
    }

    setupAutoUpdater();

    if (settings?.ui?.restoreSession) {
      const savedSession = readSession();
      if (savedSession?.tabs?.length) {
        pendingSession = savedSession;
      }
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  windowClosing = true;
  flushHistory();
  if (!tabs) return;
  for (const tab of tabs.tabs.values()) {
    if (tab.view && !tab.view.webContents.isDestroyed()) tab.view.webContents.close();
  }
});
