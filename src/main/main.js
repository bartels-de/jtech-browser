'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const { app, BrowserWindow, protocol, ipcMain, Menu, dialog, session, shell } = require('electron');
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
  buildSearchUrl
} = require('./config');
const { compileHotkeys, matchHotkey } = require('./shortcuts');
const { TabManager } = require('./tabs');
const AdmZip = require('adm-zip');

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
    getUserName: () => settings?.ui?.userName || '',
    getShortcuts: () => settings?.shortcuts || [],
    onFindResult: (result) => {
      if (chrome && !chrome.isDestroyed()) chrome.send('find:result', result);
    },
    onNavigate: (tab) => {
      if (!tab?.url || !/^https?:\/\//i.test(tab.url)) return;
      const { addHistoryEntry } = require('./config');
      addHistoryEntry({ url: tab.url, title: tab.title });
      if (chrome && !chrome.isDestroyed()) chrome.send('history:update', loadSettings().history);
    },
    getZoomFactor,
    setZoomFactor
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
  });

  window.on('maximize', () => chrome.send('window:state', { maximized: true }));
  window.on('unmaximize', () => chrome.send('window:state', { maximized: false }));
  window.on('enter-full-screen', () => { if (chrome && !chrome.isDestroyed()) chrome.send('window:fullscreen', { fullscreen: true }); });
  window.on('leave-full-screen', () => { if (chrome && !chrome.isDestroyed()) chrome.send('window:fullscreen', { fullscreen: false }); });
  window.on('resize', () => tabs.layout(window.getContentBounds()));
  window.on('close', () => {
    if (tabs && settings?.ui?.restoreSession) {
      try {
        fs.writeFileSync(sessionPath(), JSON.stringify(tabs.getState()), 'utf8');
      } catch {}
    }
  });

  window.on('closed', () => {
    window = null;
    chrome = null;
    tabs = null;
  });

  window.loadFile(path.join(RENDERER_DIR, 'index.html'));
  window.once('ready-to-show', () => window.show());

  if (IS_DEV) {
    chrome.once('did-finish-load', () => chrome.openDevTools({ mode: 'detach' }));
  }

  // Erster Tab, sobald das Chrome-UI bereit ist.
  window.webContents.once('did-finish-load', () => {
    if (tabs && tabs.tabs.size === 0) {
      if (pendingSession?.tabs?.length) {
        for (const tabState of pendingSession.tabs) {
          const tab = tabs.create({ url: tabState.url || 'jtech://newtab', activate: false });
          if (tabState.pinned) tabs.setPinned(tab.id, true);
          if (tabState.groupId) tabs.setGroup(tab.id, tabState.groupId);
          if (tabState.muted) tabs.setMuted(tab.id, true);
          if (tabState.zoom && tabState.zoom !== 1) tabs.zoom('set', tab.id, tabState.zoom);
          // Normale Lautstärken gehören der Website und werden beim Start nicht
          // überschrieben. Nur eine Verstärkung über 100 % wird wiederhergestellt.
          const storedVolume = Number(tabState.volume);
          if (Number.isFinite(storedVolume) && storedVolume > 1.0001) {
            tabs.setVolume(tab.id, storedVolume, true);
          }
        }

        const activeId = pendingSession.activeId;
        pendingSession = null;

        if (activeId && tabs.tabs.has(activeId)) tabs.activate(activeId);
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

function extensionMetadata(extension, extPath) {
  const manifest = extension.manifest || {};
  return {
    id: extension.id,
    name: extension.name || manifest.name || extension.id,
    version: extension.version || manifest.version || '',
    path: extPath || extension.path || ''
  };
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
  const url = `https://update.googleapis.com/service/update2/crx?response=redirect&prodversion=130.0.0.0&acceptformat=crx2,crx3&x=id%3D${extensionId}%26uc`;
  return new Promise((resolve, reject) => {
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' };
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
    return metadata;
  } catch (error) {
    console.warn('[extensions] Store-Installation fehlgeschlagen:', error.message);
    return null;
  }
}

function broadcastDownloads() {
  if (chrome && !chrome.isDestroyed()) {
    chrome.send('downloads:update', downloads.map(({ item, ...rest }) => rest));
  }
}

async function enableAdblock() {
  if (adblocker) return;
  try {
    const { ElectronBlocker } = require('@ghostery/adblocker-electron');
    adblocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch, {
      path: path.join(app.getPath('userData'), 'adblocker-engine.bin'),
      read: async (filePath) => fs.promises.readFile(filePath),
      write: async (filePath, buffer) => fs.promises.writeFile(filePath, buffer)
    });
    adblocker.enableBlockingInSession(session.defaultSession);
  } catch (error) {
    console.warn('[adblock] Aktivierung fehlgeschlagen:', error.message);
    adblocker = null;
  }
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
  ipcMain.handle('extensions:list', () => loadedExtensions);

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
    return loadedExtensions;
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

    if (result.canceled || !result.filePaths?.length) return loadedExtensions;

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
        return loadedExtensions;
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
    return loadedExtensions;
  });

  ipcMain.handle('extensions:open-popup', (_event, payload) => {
    if (!payload || typeof payload.extensionId !== 'string') return false;
    const extension = loadedExtensions.find((item) => item.id === payload.extensionId);
    if (!extension) return false;

    // Manifest lesen, um den Popup-Pfad zu finden
    let popupPath = null;
    try {
      const manifest = JSON.parse(fs.readFileSync(path.join(extension.path, 'manifest.json'), 'utf8'));
      popupPath = manifest?.action?.default_popup || manifest?.browser_action?.default_popup || null;
    } catch {}

    if (!popupPath) return false;

    const popupUrl = path.join(extension.path, popupPath);
    if (!fs.existsSync(popupUrl)) return false;

    const popupWindow = new BrowserWindow({
      width: 400,
      height: 600,
      show: false,
      frame: true,
      resizable: true,
      alwaysOnTop: true,
      skipTaskbar: false,
      webPreferences: {
        preload: path.join(__dirname, '..', '..', 'node_modules', 'electron-chrome-extensions', 'dist', 'chrome-extension-api.preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        session: session.defaultSession
      }
    });

    popupWindow.loadFile(popupUrl);
    popupWindow.once('ready-to-show', () => {
      popupWindow.show();
      popupWindow.focus();
      popupWindow.setAlwaysOnTop(true, 'screen-saver');
    });
    return true;
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

  ipcMain.handle('system:metrics', () => {
    const metrics = app.getAppMetrics();
    const tabByPid = new Map();
    for (const tab of tabs?.tabs?.values() || []) {
      if (tab.view && !tab.view.webContents.isDestroyed()) {
        tabByPid.set(tab.view.webContents.getOSProcessId(), tab.id);
      }
    }
    return metrics.map((metric) => ({
      pid: metric.pid,
      cpu: Math.round(metric.cpu.percentCPUUsage),
      memory: Math.round(metric.memory.workingSetSize / 1024),
      tabId: tabByPid.get(metric.pid) || null
    }));
  });

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
    Menu.setApplicationMenu(null);

    settings = loadSettings();
    hotkeys = compileHotkeys(settings.hotkeys);
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

    // Auto-Update (nur in der gepackten App).
    if (autoUpdater && app.isPackaged) {
      autoUpdater.logger = console;
      autoUpdater.on('update-available', () => console.log('[updater] Update verfügbar'));
      autoUpdater.on('update-downloaded', () => {
        console.log('[updater] Update heruntergeladen, wird beim Neustart installiert');
        try { autoUpdater.quitAndInstall(); } catch {}
      });
      autoUpdater.checkForUpdatesAndNotify().catch((e) => console.warn('[updater]', e.message));
    }

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
  if (!tabs) return;
  for (const tab of tabs.tabs.values()) {
    if (!tab.view.webContents.isDestroyed()) tab.view.webContents.close();
  }
});
