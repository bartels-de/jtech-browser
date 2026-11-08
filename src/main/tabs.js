'use strict';
/**
 * pro Tab eine WebContentsView, die von main.js positioniert wird.
 */

const { WebContentsView } = require('electron');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Menu, MenuItem, clipboard } = require('electron');

// Hintergründe: Liste für die Validierung, Quelltext für die Startseite.
const BACKGROUNDS = require('../shared/backgrounds');
const BACKGROUNDS_SOURCE = (() => {
  try {
    return fs.readFileSync(path.join(__dirname, '..', 'shared', 'backgrounds.js'), 'utf8');
  } catch {
    return '';
  }
})();

// Der Cursor-Effekt wird als Quelltext in Webseiten und die Startseite injiziert.
const CURSOR_FX_SOURCE = (() => {
  try {
    return fs.readFileSync(path.join(__dirname, '..', 'shared', 'cursor-fx.js'), 'utf8');
  } catch {
    return '';
  }
})();

class TabManager {
  /**
   * @param {import('electron').BrowserWindow} window
   * @param {object} deps
   * @param {(state: object) => void} deps.onState
   * @param {(input: object) => boolean} deps.onInput
   */
  constructor(window, { onState, onInput, getTheme, getSearch, getBangs, getUserName, getShortcuts, onFindResult, onNavigate, getZoomFactor, setZoomFactor, onViewCreated, onTabActivated, getContextMenuItems }) {
    this.window = window;
    this.onState = onState;
    this.onInput = onInput;
    this.getTheme = typeof getTheme === 'function' ? getTheme : () => null;
    this.getSearch = typeof getSearch === 'function' ? getSearch : () => null;
    this.getBangs = typeof getBangs === 'function' ? getBangs : () => [];
    this.getUserName = typeof getUserName === 'function' ? getUserName : () => '';
    this.getShortcuts = typeof getShortcuts === 'function' ? getShortcuts : () => [];
    this.onFindResult = typeof onFindResult === 'function' ? onFindResult : () => {};
    this.onNavigate = typeof onNavigate === 'function' ? onNavigate : () => {};
    this.getZoomFactor = typeof getZoomFactor === 'function' ? getZoomFactor : () => 1;
    this.setZoomFactor = typeof setZoomFactor === 'function' ? setZoomFactor : () => 1;
    // Hooks für die Chrome-Erweiterungs-API (electron-chrome-extensions).
    this.onViewCreated = typeof onViewCreated === 'function' ? onViewCreated : () => {};
    this.onTabActivated = typeof onTabActivated === 'function' ? onTabActivated : () => {};
    this.getContextMenuItems = typeof getContextMenuItems === 'function' ? getContextMenuItems : () => [];

    /** @type {Map<string, object>} */
    this.tabs = new Map();
    this.activeId = null;
    this.closedHistory = [];
    this.bounds = { x: 0, y: 0, width: 0, height: 0 };
    this.overlayOpen = false;
    this.chromeHeight = 0;
    this.dockWidth = 0;
    this.restoring = false;
    this.splitMode = false;
    this.splitLeftId = null;
    this.splitRightId = null;
    this.splitRatio = 0.5;
  }

  get active() {
    return this.activeId ? this.tabs.get(this.activeId) : null;
  }

  create({ url = 'jtech://newtab', activate = true } = {}) {
    const id = randomUUID();

    const tab = {
      id,
      view: null,
      url,
      displayUrl: url === 'jtech://newtab' ? '' : url,
      title: 'Neuer Tab',
      favicon: '',
      loading: false,
      canGoBack: false,
      canGoForward: false,
      isNewTab: url === 'jtech://newtab',
      pinned: false,
      groupId: null,
      muted: false,
      audible: false,
      volume: 1,
      // Nur eine bewusst gesetzte Lautstärke wird beim Laden erneut angewandt.
      volumeExplicit: false,
      mediaActive: false,
      zoom: 1,
      sleeping: false
    };

    this.tabs.set(id, tab);
    this.createView(tab, url);

    if (tab.muted && tab.view) tab.view.webContents.setAudioMuted(true);

    if (activate || !this.activeId) this.activate(id);
    else this.emit();

    return tab;
  }

  createView(tab, url) {
    const view = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        spellcheck: true,
        backgroundThrottling: false,
        autoplayPolicy: 'no-user-gesture-required'
      }
    });

    tab.view = view;
    tab.url = url;
    tab.displayUrl = url === 'jtech://newtab' ? '' : url;
    tab.isNewTab = url === 'jtech://newtab';
    tab.title = tab.isNewTab ? 'Neuer Tab' : tab.title;
    tab.zoom = this.getZoomFactor(url);
    tab.sleeping = false;

    const contents = view.webContents;
    this.onViewCreated(contents);
    view.setBackgroundColor('#0b0d12');
    contents.setZoomFactor(tab.zoom);

    contents.on('did-start-loading', () => {
      tab.loading = true;
      this.emit();
    });

    contents.on('did-stop-loading', () => {
      tab.loading = false;
      this.syncNavigationState(tab);
      this.emit();
    });

    contents.on('page-title-updated', (_event, title) => {
      tab.title = title;
      this.emit();
    });

    contents.on('page-favicon-updated', (_event, favicons) => {
      tab.favicon = favicons?.[0] || '';
      this.emit();
    });

    contents.on('audio-state-changed', (_event, audible) => {
      tab.audible = typeof audible === 'boolean' ? audible : contents.isCurrentlyAudible();
      this.emit();
    });

    contents.on('found-in-page', (_event, result) => {
      if (this.activeId === tab.id) this.onFindResult({ tabId: tab.id, ...result });
    });

    contents.on('zoom-changed', (_event, direction) => {
      this.zoom(direction === 'in' ? 'in' : 'out', tab.id);
    });

    contents.on('dom-ready', () => {
      if (!contents.getURL().startsWith('jtech://newtab')) return;
      this.applyThemeTo(tab);
      this.applySearchTo(tab);
      this.applyUserTo(tab);
      this.applyShortcutsTo(tab);
      this.applyCustomCssTo(tab);
      this.applyCursorTo(tab);
      this.applyMediaTo(tab);
    });

    contents.on('did-finish-load', () => {
      if (contents.isDestroyed()) return;
      tab.mediaActive = false;
      this.applyCursorTo(tab);
      this.applyMediaTo(tab);
    });

    contents.on('did-start-navigation', (_event, navUrl, isInPlace, isMainFrame) => {
      if (!isMainFrame || isInPlace || navUrl.startsWith('data:')) return;
      tab.url = navUrl;
      tab.displayUrl = navUrl.startsWith('jtech://') ? '' : navUrl;
      tab.mediaActive = false;
      this.emit();
    });

    contents.on('did-navigate', (_event, navUrl) => {
      if (navUrl.startsWith('data:')) {
        this.emit();
        return;
      }
      tab.url = navUrl;
      tab.displayUrl = navUrl.startsWith('jtech://') ? '' : navUrl;
      tab.isNewTab = navUrl === 'jtech://newtab';
      tab.zoom = this.getZoomFactor(navUrl);
      contents.setZoomFactor(tab.zoom);
      this.syncNavigationState(tab);
      if (/^https?:\/\//i.test(navUrl)) this.onNavigate(tab);
      this.emit();
    });

    contents.on('did-navigate-in-page', (_event, navUrl) => {
      tab.url = navUrl;
      tab.displayUrl = navUrl.startsWith('jtech://') ? '' : navUrl;
      this.syncNavigationState(tab);
      this.emit();
    });

    contents.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown') return;
      if (this.onInput({ ...input, source: 'content', tabId: tab.id })) {
        event.preventDefault();
      }
    });

    contents.on('context-menu', (_event, params) => {
      this.showContextMenu(params, contents);
    });

    contents.on('will-navigate', (event, targetUrl) => {
      if (!/^(https?|jtech|chrome-extension):/i.test(targetUrl)) event.preventDefault();
    });

    contents.setWindowOpenHandler(({ url: target }) => {
      if (/^(https?|chrome-extension):\/\//i.test(target)) {
        this.create({ url: target, activate: true });
      }
      return { action: 'deny' };
    });

    contents.on('did-fail-load', (_event, code, description, failedUrl, isMainFrame) => {
      if (!isMainFrame || code === -3) return;
      tab.title = 'Seite nicht erreichbar';
      tab.loading = false;
      tab.url = failedUrl;
      tab.displayUrl = failedUrl;
      tab.isNewTab = false;
      const errorPage = `data:text/html;charset=utf-8,${encodeURIComponent(renderErrorPage(description, code, failedUrl))}`;
      contents.loadURL(errorPage);
      this.emit();
    });

    contents.on('destroyed', () => {
      // Bewusst entfernte Views (Schlafen, Schließen) lassen den Tab bestehen.
      if (tab.view !== view) return;
      this.tabs.delete(tab.id);
      if (this.activeId === tab.id) this.activeId = null;
    });

    this.load(tab, url);
  }

  load(tab, url) {
    if (!tab.view) return;
    if (url === 'jtech://newtab') {
      tab.isNewTab = true;
      tab.title = 'Neuer Tab';
      tab.favicon = '';
      tab.displayUrl = '';
      tab.view.webContents.loadURL('jtech://newtab').catch(() => {});
    } else {
      tab.isNewTab = false;
      tab.view.webContents.loadURL(url).catch(() => {});
    }
  }

  syncNavigationState(tab) {
    if (!tab.view) return;
    const contents = tab.view.webContents;
    tab.canGoBack = contents.navigationHistory.canGoBack();
    tab.canGoForward = contents.navigationHistory.canGoForward();
  }

  activate(id) {
    const tab = this.tabs.get(id);
    if (!tab) return;

    if (tab.sleeping) this.wake(id);

    // Split-View: Fokus nur wechseln, beide Views bleiben.
    if (this.splitMode && (id === this.splitLeftId || id === this.splitRightId)) {
      this.activeId = id;
      if (tab.view && !this.overlayOpen) tab.view.webContents.focus();
      if (tab.view) this.onTabActivated(tab.view.webContents);
      this.syncBackgroundPause();
      this.emit();
      return;
    }

    // Dritter Tab verlässt den Split-View.
    if (this.splitMode) this.unsplit();

    for (const other of this.tabs.values()) {
      if (other.view && this.window.contentView.children.includes(other.view)) {
        this.window.contentView.removeChildView(other.view);
      }
    }

    if (!this.overlayOpen && tab.view) {
      this.window.contentView.addChildView(tab.view);
      tab.view.setBounds(this.bounds);
      tab.view.webContents.focus();
    }
    this.activeId = id;
    if (tab.view) this.onTabActivated(tab.view.webContents);
    this.syncBackgroundPause();

    if (!tab.loading) this.syncNavigationState(tab);
    this.emit();
  }

  close(id) {
    const tab = this.tabs.get(id);
    if (!tab) return;

    if (this.splitMode && (id === this.splitLeftId || id === this.splitRightId)) {
      this.unsplit();
    }

    const ids = [...this.tabs.keys()];
    const index = ids.indexOf(id);

    if (tab.url && !tab.url.startsWith('jtech://') && !tab.url.startsWith('data:')) {
      this.closedHistory.push(tab.url);
      this.closedHistory = this.closedHistory.slice(-25);
    }

    const view = tab.view;
    tab.view = null;
    this.tabs.delete(id);
    if (view && this.window.contentView.children.includes(view)) {
      this.window.contentView.removeChildView(view);
    }
    if (view && !view.webContents.isDestroyed()) {
      view.webContents.close();
    }

    if (this.tabs.size === 0) {
      this.activeId = null;
      if (!this.restoring) this.create();
      return;
    }

    if (this.activeId === id) {
      const nextIndex = Math.min(index, this.tabs.size - 1);
      this.activate([...this.tabs.keys()][nextIndex]);
    } else {
      this.emit();
    }
  }

  /** Tab zu einem WebContents finden (für die Erweiterungs-API). */
  findByContents(contents) {
    if (!contents) return null;
    for (const tab of this.tabs.values()) {
      if (tab.view && tab.view.webContents === contents) return tab;
    }
    return null;
  }

  activateByContents(contents) {
    const tab = this.findByContents(contents);
    if (tab && tab.id !== this.activeId) this.activate(tab.id);
  }

  closeByContents(contents) {
    const tab = this.findByContents(contents);
    if (tab) this.close(tab.id);
  }

  reopenClosed() {
    const url = this.closedHistory.pop();
    if (url) this.create({ url, activate: true });
    else this.create();
  }

  navigate(url) {
    const tab = this.active;
    if (!tab) return;
    if (tab.sleeping) this.wake(tab.id);
    this.load(tab, url);
  }

  goBack() {
    const tab = this.active;
    if (tab?.view?.webContents.navigationHistory.canGoBack()) {
      tab.view.webContents.navigationHistory.goBack();
    }
  }

  goForward() {
    const tab = this.active;
    if (tab?.view?.webContents.navigationHistory.canGoForward()) {
      tab.view.webContents.navigationHistory.goForward();
    }
  }

  reload(hard = false, id = this.activeId) {
    const tab = this.tabs.get(id);
    if (!tab) return;
    if (tab.sleeping) this.wake(id);
    if (tab.isNewTab) {
      this.load(tab, 'jtech://newtab');
      return;
    }
    if (tab.view?.webContents.getURL().startsWith('data:text/html')) {
      this.load(tab, tab.url);
      return;
    }
    if (hard) tab.view?.webContents.reloadIgnoringCache();
    else tab.view?.webContents.reload();
  }

  reloadAll(hard = false) {
    for (const tab of this.tabs.values()) {
      if (tab.sleeping) this.wake(tab.id);
      if (tab.isNewTab) this.load(tab, 'jtech://newtab');
      else if (hard) tab.view?.webContents.reloadIgnoringCache();
      else tab.view?.webContents.reload();
    }
  }

  togglePictureInPicture() {
    const tab = this.active;
    if (!tab?.view || tab.view.webContents.isDestroyed()) return;
    tab.view.webContents.executeJavaScript(`
      (async () => {
        const video = document.querySelector('video');
        if (!video) return 'no-video';
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
          return 'exited';
        }
        if (video.requestPictureInPicture) {
          await video.requestPictureInPicture();
          return 'entered';
        }
        return 'unsupported';
      })()
    `, true).catch(() => {});
  }

  sleep(id) {
    const tab = this.tabs.get(id);
    if (!tab || tab.sleeping || this.activeId === id) return;
    if (!tab.view) return;

    const view = tab.view;
    tab.view = null;
    tab.sleeping = true;
    if (this.window.contentView.children.includes(view)) {
      this.window.contentView.removeChildView(view);
    }
    if (!view.webContents.isDestroyed()) view.webContents.close();
    tab.audible = false;
    this.emit();
  }

  wake(id) {
    const tab = this.tabs.get(id);
    if (!tab || !tab.sleeping) return;
    this.createView(tab, tab.url || 'jtech://newtab');
    if (tab.muted && tab.view) tab.view.webContents.setAudioMuted(true);
  }

  sleepBackgroundTabs() {
    for (const tab of this.tabs.values()) {
      if (tab.id !== this.activeId && !tab.pinned) this.sleep(tab.id);
    }
  }

  wakeAllTabs() {
    for (const tab of this.tabs.values()) {
      if (tab.sleeping) this.wake(tab.id);
    }
  }

  duplicate(id) {
    const tab = this.tabs.get(id);
    if (!tab) return;
    const url = tab.url && !tab.url.startsWith('data:') ? tab.url : 'jtech://newtab';
    this.create({ url, activate: true });
  }

  setPinned(id, pinned) {
    const tab = this.tabs.get(id);
    if (!tab) return;
    tab.pinned = Boolean(pinned);
    if (tab.pinned) tab.groupId = null;

    const ordered = [...this.tabs.values()].sort((a, b) => Number(b.pinned) - Number(a.pinned));
    this.tabs = new Map(ordered.map((entry) => [entry.id, entry]));
    this.emit();
  }

  setGroup(id, groupId) {
    const tab = this.tabs.get(id);
    if (!tab) return;
    tab.groupId = groupId || null;
    if (tab.groupId) tab.pinned = false;
    this.emit();
  }

  moveTabToGroup(id, groupId) {
    this.setGroup(id, groupId);
  }

  setMuted(id, muted) {
    const tab = this.tabs.get(id);
    if (!tab) return;
    tab.muted = Boolean(muted);
    if (tab.view && !tab.view.webContents.isDestroyed()) {
      tab.view.webContents.setAudioMuted(tab.muted);
    }
    this.emit();
  }

  /**
   * Lautstärke eines Tabs (0–3, Werte über 1 verstärken leise Medien).
   * Electron bietet keine eigene API dafür, daher wird die Lautstärke in der
   * Seite über window.__jtechMedia gesetzt.
   * @param {string} id
   * @param {number} volume
   * @param {boolean} [explicit] true, wenn der Nutzer den Wert bewusst gesetzt hat
   */
  setVolume(id, volume, explicit = true) {
    const tab = this.tabs.get(id);
    if (!tab) return;
    const next = Number(volume);
    if (!Number.isFinite(next)) return;
    tab.volume = Math.round(Math.max(0, Math.min(3, next)) * 100) / 100;
    if (explicit) tab.volumeExplicit = true;
    this.applyMediaTo(tab);
    this.emit();
  }

  /**
   * Sammelt alle abspielbaren Medien aller Tabs für den Media-Hub.
   */
  async listMedia() {
    const results = [];
    let volumeChanged = false;

    await Promise.all([...this.tabs.values()].map(async (tab) => {
      const contents = tab.view?.webContents;
      if (!contents || contents.isDestroyed()) {
        tab.mediaActive = false;
        return;
      }
      try {
        const items = await contents.executeJavaScript(
          'window.__jtechMedia ? window.__jtechMedia.list() : []',
          true
        );
        if (Array.isArray(items) && items.length) {
          tab.mediaActive = items.some((item) => item.playing);

          // Media-Hub und Website teilen sich dieselbe Lautstärke:
          // der tatsächliche Wert aus dem Medium gewinnt.
          const source = items.find((item) => item.playing) || items[0];
          const actual = Math.max(0, Math.min(3, Number(source.volume)));
          if (Number.isFinite(actual) && Math.abs(actual - tab.volume) > 0.005) {
            tab.volume = Math.round(actual * 100) / 100;
            volumeChanged = true;
          }

          for (const item of items) {
            results.push({
              ...item,
              tabId: tab.id,
              tabTitle: tab.title,
              tabFavicon: tab.favicon,
              tabAudible: tab.audible,
              tabMuted: tab.muted
            });
          }
        } else {
          tab.mediaActive = false;
        }
      } catch {
        tab.mediaActive = false;
      }
    }));

    if (volumeChanged) this.emit();

    return results;
  }

  async mediaCommand(payload) {
    if (!payload || typeof payload.tabId !== 'string' || typeof payload.action !== 'string') return [];
    const tab = this.tabs.get(payload.tabId);
    const contents = tab?.view?.webContents;
    if (!contents || contents.isDestroyed()) return [];
    try {
      const items = await contents.executeJavaScript(
        `window.__jtechMedia ? window.__jtechMedia.command(${JSON.stringify(payload.action)}, ${JSON.stringify(payload.mediaId || '')}, ${Number(payload.value) || 0}) : []`,
        true
      );
      return Array.isArray(items) ? items : [];
    } catch {
      return [];
    }
  }

  async pauseAllMedia() {
    await Promise.all([...this.tabs.values()].map(async (tab) => {
      const contents = tab.view?.webContents;
      if (!contents || contents.isDestroyed()) return;
      try {
        await contents.executeJavaScript(
          'window.__jtechMedia ? window.__jtechMedia.pauseAll() : []',
          true
        );
        tab.mediaActive = false;
      } catch {}
    }));
  }

  setDockWidth(width) {
    const next = Math.max(0, Math.round(Number(width) || 0));
    if (next === this.dockWidth) return;
    this.dockWidth = next;
    if (this.overlayOpen) return;
    this.layout(this.window.getContentBounds());
  }

  closeOthers(id) {
    if (!this.tabs.has(id)) return;
    for (const tabId of [...this.tabs.keys()]) {
      if (tabId !== id) this.close(tabId);
    }
  }

  move(id, targetIndex) {
    const tab = this.tabs.get(id);
    if (!tab || !Number.isInteger(targetIndex)) return;

    const ordered = [...this.tabs.values()].filter((entry) => entry.id !== id);
    const pinnedCount = ordered.filter((entry) => entry.pinned).length;
    const min = tab.pinned ? 0 : pinnedCount;
    const max = tab.pinned ? pinnedCount : ordered.length;
    const index = Math.max(min, Math.min(max, targetIndex));

    ordered.splice(index, 0, tab);
    this.tabs = new Map(ordered.map((entry) => [entry.id, entry]));
    this.emit();
  }

  zoom(action, id = this.activeId, value) {
    const tab = this.tabs.get(id);
    if (!tab) return;
    if (tab.sleeping) this.wake(id);

    const levels = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];
    const current = Number(tab.zoom) || 1;
    let next = current;

    if (action === 'reset') next = 1;
    else if (action === 'in') next = levels.find((level) => level > current + 0.01) || levels.at(-1);
    else if (action === 'out') next = [...levels].reverse().find((level) => level < current - 0.01) || levels[0];
    else if (action === 'set') next = Math.max(levels[0], Math.min(levels.at(-1), Number(value) || 1));
    else return;

    tab.zoom = Math.round(next * 100) / 100;
    if (tab.view && !tab.view.webContents.isDestroyed()) {
      tab.view.webContents.setZoomFactor(tab.zoom);
    }
    if (/^https?:\/\//i.test(tab.url)) this.setZoomFactor(tab.url, tab.zoom);
    this.emit();
  }

  find(query, { forward = true, findNext = false } = {}) {
    const contents = this.active?.view?.webContents;
    const text = String(query || '').trim();
    if (!contents || !text) return;
    contents.findInPage(text, { forward: Boolean(forward), findNext: Boolean(findNext) });
  }

  stopFind() {
    this.active?.view?.webContents.stopFindInPage('clearSelection');
  }

  showContextMenu(params, contents) {
    const template = [];

    if (params.linkURL) {
      template.push({
        label: 'Link in neuem Tab öffnen',
        click: () => this.create({ url: params.linkURL, activate: true })
      });
      template.push({
        label: 'Link-Adresse kopieren',
        click: () => clipboard.writeText(params.linkURL)
      });
      template.push({ type: 'separator' });
    }

    if (params.srcURL) {
      template.push({
        label: 'Bild in neuem Tab öffnen',
        click: () => this.create({ url: params.srcURL, activate: true })
      });
      template.push({
        label: 'Bildadresse kopieren',
        click: () => clipboard.writeText(params.srcURL)
      });
      template.push({ type: 'separator' });
    }

    if (params.selectionText) {
      template.push({ label: 'Auswahl kopieren', role: 'copy' });
      template.push({ type: 'separator' });
    }

    if (params.isEditable) {
      template.push(
        { label: 'Rückgängig', role: 'undo' },
        { label: 'Wiederholen', role: 'redo' },
        { label: 'Ausschneiden', role: 'cut' },
        { label: 'Kopieren', role: 'copy' },
        { label: 'Einfügen', role: 'paste' },
        { type: 'separator' }
      );
    }

    template.push(
      {
        label: 'Zurück',
        enabled: contents.navigationHistory.canGoBack(),
        click: () => contents.navigationHistory.goBack()
      },
      {
        label: 'Vorwärts',
        enabled: contents.navigationHistory.canGoForward(),
        click: () => contents.navigationHistory.goForward()
      },
      {
        label: 'Neu laden',
        click: () => contents.reload()
      },
      { type: 'separator' },
      {
        label: 'Seite speichern',
        click: () => {
          const { addSaved, publicSettings } = require('./config');
          const next = addSaved({ title: contents.getTitle(), url: contents.getURL() });
          if (this.window.webContents && !this.window.webContents.isDestroyed()) {
            this.window.webContents.send('settings:update', next);
          }
        }
      },
      {
        label: 'Drucken',
        click: () => contents.print()
      },
      {
        label: 'Entwicklertools',
        click: () => {
          if (contents.isDevToolsOpened()) contents.closeDevTools();
          else contents.openDevTools({ mode: 'detach' });
        }
      }
    );

    const menu = Menu.buildFromTemplate(template);

    // Einträge von Erweiterungen (chrome.contextMenus) oben einfügen.
    let extensionItems = [];
    try { extensionItems = this.getContextMenuItems(contents, params) || []; } catch { extensionItems = []; }
    if (extensionItems.length) {
      extensionItems.forEach((item, index) => menu.insert(index, item));
      menu.insert(extensionItems.length, new MenuItem({ type: 'separator' }));
    }

    menu.popup({ window: this.window });
  }

  setOverlay(open) {
    this.overlayOpen = Boolean(open);
    this.syncBackgroundPause();
    const ids = this.splitMode
      ? [this.splitLeftId, this.splitRightId]
      : [this.activeId];

    for (const id of ids) {
      const tab = id ? this.tabs.get(id) : null;
      if (!tab?.view) continue;
      const isChild = this.window.contentView.children.includes(tab.view);

      if (this.overlayOpen) {
        if (isChild) {
          this.window.contentView.removeChildView(tab.view);
        }
      } else if (!isChild) {
        this.window.contentView.addChildView(tab.view);
        console.log('[tabs] added view, children:', this.window.contentView.children.length);
      }
    }

    if (!this.overlayOpen) {
      this.layout(this.window.getContentBounds());
      const active = this.tabs.get(this.activeId);
      if (active?.view && !this.overlayOpen) active.view.webContents.focus();
    } else {
      // Overlay offen: Layout überspringen, damit die Content-View nicht wieder eingeblendet wird.
    }
  }

  applyThemeTo(tab) {
    const theme = this.getTheme?.();
    if (!theme || !tab || !tab.view || tab.view.webContents.isDestroyed()) return;
    tab.view.webContents.executeJavaScript(buildThemeScript(theme), true).catch(() => {});
    this.syncBackgroundPause();
  }

  /** Animierte Startseiten-Hintergründe nur im sichtbaren Tab laufen lassen. */
  syncBackgroundPause() {
    for (const tab of this.tabs.values()) {
      const contents = tab.view?.webContents;
      if (!contents || contents.isDestroyed() || !contents.getURL().startsWith('jtech://newtab')) continue;
      const shown = tab.id === this.activeId ||
        (this.splitMode && (tab.id === this.splitLeftId || tab.id === this.splitRightId));
      const paused = this.overlayOpen || !shown;
      contents.executeJavaScript(
        `(() => { const c = document.querySelector('.bg')?.__jtechBackground; if (c) c.setPaused(${paused}); })();`,
        true
      ).catch(() => {});
    }
  }

  applyCursorTo(tab) {
    const theme = this.getTheme?.();
    if (!CURSOR_FX_SOURCE || !theme || !tab || !tab.view || tab.view.webContents.isDestroyed()) return;

    const effect = ['none', 'trail', 'sparks', 'comet', 'ripple', 'laser', 'bubbles'].includes(theme.cursorEffect)
      ? theme.cursorEffect
      : 'none';

    const size = Number(theme.cursorSize);
    const intensity = Number(theme.cursorIntensity);

    const options = {
      effect,
      color: typeof theme.cursorColor === 'string' ? theme.cursorColor : theme.accent,
      colorAlt: typeof theme.accentAlt === 'string' ? theme.accentAlt : '#00d4aa',
      size: Number.isFinite(size) ? size : 16,
      intensity: Number.isFinite(intensity) ? intensity : 60
    };

    const script = `(() => {\n${CURSOR_FX_SOURCE}\n;if (window.JTechCursorEffects) window.JTechCursorEffects.apply(${JSON.stringify(options)});\n})();`;
    tab.view.webContents.executeJavaScript(script, true).catch(() => {});
  }

  applyMediaTo(tab) {
    if (!tab || !tab.view || tab.view.webContents.isDestroyed()) return;
    const volume = Number.isFinite(Number(tab.volume)) ? Math.max(0, Math.min(3, Number(tab.volume))) : 1;
    // Eine Lautstärke nur dann aktiv aufdrücken, wenn der Nutzer sie bewusst
    // gesetzt hat. Sonst bleibt die Lautstärke der Website erhalten.
    const apply = Boolean(tab.volumeExplicit) || Math.abs(volume - 1) > 0.0001;
    tab.view.webContents.executeJavaScript(buildMediaScript(volume, apply), true).catch(() => {});
  }

  applyTheme(theme) {
    if (!theme) return;
    for (const tab of this.tabs.values()) {
      const contents = tab.view?.webContents;
      if (!contents || contents.isDestroyed()) continue;
      this.applyCursorTo(tab);
      if (!contents.getURL().startsWith('jtech://newtab')) continue;
      contents.executeJavaScript(buildThemeScript(theme), true).catch(() => {});
      this.applyCustomCssTo(tab);
    }
    this.syncBackgroundPause();
  }

  applySearchTo(tab) {
    const search = this.getSearch?.();
    if (!search || !tab || !tab.view || tab.view.webContents.isDestroyed()) return;
    tab.view.webContents.executeJavaScript(buildSearchScript(search, this.getBangs?.()), true).catch(() => {});
  }

  applyUserTo(tab) {
    const name = this.getUserName?.() || '';
    if (!tab || !tab.view || tab.view.webContents.isDestroyed()) return;
    tab.view.webContents.executeJavaScript(buildUserScript(name), true).catch(() => {});
  }

  applyShortcutsTo(tab) {
    const shortcuts = this.getShortcuts?.() || [];
    if (!tab || !tab.view || tab.view.webContents.isDestroyed()) return;
    tab.view.webContents.executeJavaScript(buildShortcutsScript(shortcuts), true).catch(() => {});
  }

  applySearch(search) {
    if (!search) return;
    for (const tab of this.tabs.values()) {
      const contents = tab.view?.webContents;
      if (!contents || contents.isDestroyed()) continue;
      if (!contents.getURL().startsWith('jtech://newtab')) continue;
      contents.executeJavaScript(buildSearchScript(search, this.getBangs?.()), true).catch(() => {});
    }
  }

  applyUser(name) {
    for (const tab of this.tabs.values()) {
      const contents = tab.view?.webContents;
      if (!contents || contents.isDestroyed()) continue;
      if (!contents.getURL().startsWith('jtech://newtab')) continue;
      contents.executeJavaScript(buildUserScript(name), true).catch(() => {});
    }
  }

  applyShortcuts(shortcuts) {
    for (const tab of this.tabs.values()) {
      const contents = tab.view?.webContents;
      if (!contents || contents.isDestroyed()) continue;
      if (!contents.getURL().startsWith('jtech://newtab')) continue;
      contents.executeJavaScript(buildShortcutsScript(shortcuts || []), true).catch(() => {});
    }
  }

  applyCustomCssTo(tab) {
    const theme = this.getTheme?.();
    if (!theme || !tab || !tab.view || tab.view.webContents.isDestroyed()) return;
    const css = typeof theme.customCssNewtab === 'string' ? theme.customCssNewtab : '';
    tab.view.webContents.executeJavaScript(
      `(() => { let style = document.getElementById('jtech-custom-css'); if (!style) { style = document.createElement('style'); style.id = 'jtech-custom-css'; (document.head || document.documentElement).appendChild(style); } style.textContent = ${JSON.stringify(css)}; })()`,
      true
    ).catch(() => {});
  }

  split(rightId) {
    if (this.splitMode) return;
    const leftId = this.activeId;
    if (!leftId || leftId === rightId || !this.tabs.has(rightId)) return;

    const leftTab = this.tabs.get(leftId);
    const rightTab = this.tabs.get(rightId);
    if (!leftTab || !rightTab) return;

    if (leftTab.sleeping) this.wake(leftId);
    if (rightTab.sleeping) this.wake(rightId);

    this.splitMode = true;
    this.splitLeftId = leftId;
    this.splitRightId = rightId;
    this.splitRatio = 0.5;

    if (!this.overlayOpen) {
      for (const id of [leftId, rightId]) {
        const tab = this.tabs.get(id);
        if (tab?.view && !this.window.contentView.children.includes(tab.view)) {
          this.window.contentView.addChildView(tab.view);
        }
      }
    }

    this.activeId = rightId;
    this.layout(this.window.getContentBounds());
    if (!this.overlayOpen) rightTab.view?.webContents.focus();
    this.emit();
  }

  unsplit() {
    if (!this.splitMode) return;
    const leftId = this.splitLeftId;
    const rightId = this.splitRightId;

    this.splitMode = false;
    this.splitLeftId = null;
    this.splitRightId = null;

    if (rightId) {
      const rightTab = this.tabs.get(rightId);
      if (rightTab?.view && this.window.contentView.children.includes(rightTab.view)) {
        this.window.contentView.removeChildView(rightTab.view);
      }
    }

    if (leftId && this.tabs.has(leftId)) this.activeId = leftId;
    this.layout(this.window.getContentBounds());
    const active = this.active;
    if (active?.view && !this.overlayOpen) active.view.webContents.focus();
    this.emit();
  }

  setSplitRatio(ratio) {
    if (!this.splitMode) return;
    this.splitRatio = Math.max(0.2, Math.min(0.8, Number(ratio) || 0.5));
    this.layout(this.window.getContentBounds());
    this.emit();
  }

  cycle(direction) {
    const ids = [...this.tabs.keys()];
    if (ids.length < 2) return;
    const index = ids.indexOf(this.activeId);
    const next = (index + direction + ids.length) % ids.length;
    this.activate(ids[next]);
  }

  selectAt(index) {
    const ids = [...this.tabs.keys()];
    const target = index >= ids.length ? ids[ids.length - 1] : ids[index];
    if (target) this.activate(target);
  }

  setBounds(bounds) {
    this.bounds = bounds;
    if (this.splitMode) {
      this.layout(this.window.getContentBounds());
      return;
    }
    const tab = this.active;
    if (tab?.view) tab.view.setBounds(bounds);
  }

  layout(windowBounds) {
    const { width, height } = windowBounds;
    const offsetX = this.sidebarWidth || 0;
    const offsetY = this.chromeHeight || 0;
    const dock = this.dockWidth || 0;
    const totalW = Math.max(0, width - offsetX - dock);
    const totalH = Math.max(0, height - offsetY);

    if (this.splitMode && this.splitLeftId && this.splitRightId) {
      const leftTab = this.tabs.get(this.splitLeftId);
      const rightTab = this.tabs.get(this.splitRightId);
      const leftW = Math.max(220, Math.round(totalW * this.splitRatio));
      const rightW = Math.max(220, totalW - leftW);
      if (leftTab?.view) leftTab.view.setBounds({ x: offsetX, y: offsetY, width: leftW, height: totalH });
      if (rightTab?.view) rightTab.view.setBounds({ x: offsetX + leftW, y: offsetY, width: rightW, height: totalH });
      this.bounds = { x: offsetX, y: offsetY, width: totalW, height: totalH };
      return;
    }

    this.setBounds({
      x: offsetX,
      y: offsetY,
      width: totalW,
      height: totalH
    });
  }

  setLayout({ chromeHeight, sidebarWidth } = {}) {
    if (Number.isFinite(chromeHeight)) {
      this.chromeHeight = Math.max(0, Math.round(chromeHeight));
    }
    if (Number.isFinite(sidebarWidth)) {
      this.sidebarWidth = Math.max(0, Math.round(sidebarWidth));
    }
    if (this.overlayOpen) {
      console.log('[tabs] overlay open, skipping setLayout');
      return;
    }
    this.layout(this.window.getContentBounds());
  }

  setChromeHeight(height) {
    this.setLayout({ chromeHeight: height, sidebarWidth: this.sidebarWidth });
  }

  getState() {
    return {
      activeId: this.activeId,
      splitMode: this.splitMode,
      splitLeftId: this.splitLeftId,
      splitRightId: this.splitRightId,
      splitRatio: this.splitRatio,
      tabs: [...this.tabs.values()].map((tab) => ({
        id: tab.id,
        title: tab.title,
        url: tab.displayUrl,
        favicon: tab.favicon,
        loading: tab.loading,
        canGoBack: tab.canGoBack,
        canGoForward: tab.canGoForward,
        isNewTab: tab.isNewTab,
        pinned: tab.pinned,
        groupId: tab.groupId,
        muted: tab.muted,
        audible: tab.audible,
        volume: tab.volume,
        volumeExplicit: tab.volumeExplicit,
        mediaActive: tab.mediaActive,
        zoom: tab.zoom,
        sleeping: tab.sleeping
      }))
    };
  }

  emit() {
    this.onState(this.getState());
  }
}

function buildUserScript(name) {
  return `(() => {
    window.__JTECH_USER__ = ${JSON.stringify(name || '')};
    const greeting = document.getElementById('greeting');
    if (greeting) greeting.textContent = ${JSON.stringify(name ? `Willkommen, ${name}` : 'Willkommen')};
  })();`;
}

function buildShortcutsScript(shortcuts) {
  return `(() => { window.__JTECH_SHORTCUTS__ = ${JSON.stringify(shortcuts || [])}; if (typeof window.renderShortcuts === 'function') window.renderShortcuts(); })();`;
}

function buildSearchScript(search, bangs) {
  const safeBangs = Array.isArray(bangs) ? bangs : [];
  return `(() => {
    window.__JTECH_SEARCH__ = ${JSON.stringify(search.urlTemplate || 'https://www.google.com/search?q=%s')};
    window.__JTECH_BANGS__ = ${JSON.stringify(safeBangs)};
  })();`;
}

function buildMediaScript(volume, apply) {
  const initial = Number.isFinite(Number(volume)) ? Math.max(0, Math.min(3, Number(volume))) : 1;
  const shouldApply = Boolean(apply);

  return `(() => {
    if (!window.__jtechMedia) {
      const state = {
        base: 1,
        boost: 1,
        explicit: false,
        seq: 0,
        seen: new WeakSet(),
        gains: new WeakMap(),
        lastWritten: new WeakMap(),
        context: null,
        syncScheduled: false
      };

      const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));
      const clamp03 = (value) => Math.min(3, Math.max(0, Number(value) || 0));
      const mediaElements = () => Array.from(document.querySelectorAll('video, audio'));
      const isMedia = (element) => Boolean(element && (element.tagName === 'VIDEO' || element.tagName === 'AUDIO'));

      const ensureId = (element) => {
        let id = element.dataset.jtechMediaId;
        if (!id) {
          state.seq += 1;
          id = 'm' + state.seq;
          element.dataset.jtechMediaId = id;
        }
        return id;
      };

      const boostOf = (element) => {
        const gain = state.gains.get(element);
        return gain ? Math.max(0, gain.gain.value) : 1;
      };

      const writeVolume = (element, value) => {
        try {
          element.volume = value;
          state.lastWritten.set(element, value);
        } catch {}
      };

      const resumeContext = () => {
        if (state.context && state.context.state === 'suspended') {
          state.context.resume().catch(() => {});
        }
      };

      const ensureGain = (element) => {
        let gain = state.gains.get(element);
        if (gain) {
          resumeContext();
          return gain;
        }

        try {
          if (!state.context) {
            const Ctor = window.AudioContext || window.webkitAudioContext;
            if (!Ctor) return null;
            state.context = new Ctor();
          }
          const source = state.context.createMediaElementSource(element);
          gain = state.context.createGain();
          source.connect(gain);
          gain.connect(state.context.destination);
          state.gains.set(element, gain);
          resumeContext();
          return gain;
        } catch {
          return null;
        }
      };

      const setBoost = (element, factor) => {
        if (factor > 1.0001) {
          const gain = ensureGain(element);
          if (gain) {
            gain.gain.value = factor;
            return;
          }
          // Verstärkung nicht möglich: wenigstens volle Element-Lautstärke.
          writeVolume(element, 1);
          return;
        }
        const gain = state.gains.get(element);
        if (gain) gain.gain.value = 1;
      };

      const applyToElement = (element) => {
        if (!isMedia(element)) return;
        writeVolume(element, state.base);
        setBoost(element, state.boost);
      };

      const applyToAll = () => {
        for (const element of mediaElements()) {
          state.seen.add(element);
          applyToElement(element);
        }
      };

      const markAll = () => {
        for (const element of mediaElements()) state.seen.add(element);
      };

      const syncElements = () => {
        for (const element of mediaElements()) {
          if (state.seen.has(element)) continue;
          state.seen.add(element);
          if (state.explicit) applyToElement(element);
        }
      };

      const scheduleSync = () => {
        if (state.syncScheduled) return;
        state.syncScheduled = true;
        setTimeout(() => {
          state.syncScheduled = false;
          syncElements();
        }, 300);
      };

      const describe = (element) => {
        if (!element) return null;
        const duration = Number.isFinite(element.duration) ? element.duration : 0;
        const metadata = navigator.mediaSession && navigator.mediaSession.metadata;
        const title =
          (metadata && (metadata.title || metadata.artist)) ||
          element.title ||
          element.getAttribute('aria-label') ||
          (element.currentSrc || element.src || '').split('/').pop() ||
          document.title ||
          'Medienwiedergabe';
        const boost = boostOf(element);

        return {
          id: ensureId(element),
          title: String(title).slice(0, 160),
          artist: metadata && metadata.artist ? String(metadata.artist).slice(0, 120) : '',
          kind: element.tagName === 'AUDIO' ? 'audio' : 'video',
          src: element.currentSrc || element.src || '',
          paused: Boolean(element.paused),
          ended: Boolean(element.ended),
          playing: !element.paused && !element.ended && element.readyState > 2,
          muted: Boolean(element.muted),
          // Effektive Lautstärke inklusive Verstärkung (0–3).
          volume: Math.round(clamp03(clamp01(element.volume) * boost) * 100) / 100,
          boost: Math.round(boost * 100) / 100,
          currentTime: Number.isFinite(element.currentTime) ? element.currentTime : 0,
          duration
        };
      };

      const setVolume = (value) => {
        const target = clamp03(value);
        state.explicit = true;

        if (target <= 1) {
          state.base = target;
          state.boost = 1;
        } else {
          state.base = 1;
          state.boost = target;
        }

        applyToAll();
        resumeContext();
      };

      const byId = (id) => mediaElements().find((element) => element.dataset.jtechMediaId === id) || null;

      window.__jtechMedia = {
        setVolume,
        debug() {
          return {
            context: state.context ? state.context.state : null,
            base: state.base,
            boost: state.boost,
            explicit: state.explicit
          };
        },
        list() {
          return mediaElements().map(describe).filter(Boolean);
        },
        command(action, id, value) {
          const element = id ? byId(id) : mediaElements()[0];
          if (!element) return [];

          try {
            if (action === 'toggle') {
              if (element.paused) element.play().catch(() => {});
              else element.pause();
            } else if (action === 'play') {
              element.play().catch(() => {});
            } else if (action === 'pause') {
              element.pause();
            } else if (action === 'seek' && Number.isFinite(Number(value))) {
              const target = clamp01(value) * (Number.isFinite(element.duration) ? element.duration : 0);
              element.currentTime = target;
            } else if (action === 'volume' && Number.isFinite(Number(value))) {
              setVolume(value);
            } else if (action === 'mute') {
              element.muted = true;
            } else if (action === 'unmute') {
              element.muted = false;
            }
          } catch {}

          return mediaElements().map(describe).filter(Boolean);
        },
        pauseAll() {
          for (const element of mediaElements()) {
            try {
              if (!element.paused) element.pause();
            } catch {}
          }
          return mediaElements().map(describe).filter(Boolean);
        }
      };

      // Änderungen an der Website-Lautstärke übernehmen, ohne sie zu überschreiben.
      document.addEventListener('volumechange', (event) => {
        const element = event.target;
        if (!isMedia(element)) return;

        const written = state.lastWritten.get(element);
        if (written !== undefined && Math.abs(element.volume - written) < 0.001) return;

        state.base = clamp01(element.volume);
        state.seen.add(element);
      }, true);

      const onPlay = (event) => {
        const element = event.target;
        if (!isMedia(element)) return;
        if (!state.seen.has(element)) {
          state.seen.add(element);
          if (state.explicit) applyToElement(element);
        }
        resumeContext();
      };
      document.addEventListener('play', onPlay, true);
      document.addEventListener('pointerdown', resumeContext, true);

      const observer = new MutationObserver(scheduleSync);
      observer.observe(document.documentElement, { childList: true, subtree: true });

      markAll();
    }

    if (${shouldApply}) window.__jtechMedia.setVolume(${initial});
    return true;
  })();`;
}

function buildThemeScript(theme) {
  const glass = Number(theme.glass) || 0.58;
  const panelAlpha = Math.max(0.02, Math.min(0.25, glass * 0.1)).toFixed(3);
  const radius = Math.round(Number(theme.radius) || 13);
  const blur = Math.round(Number(theme.blur) || 18);
  const stroke = Math.round(Number(theme.stroke) || 8);
  const shadow = Math.round(Number(theme.shadow) || 35);
  const saturation = Math.round(Number(theme.saturation) || 180);
  const fontSize = Math.round(Number(theme.fontSize) || 100);
  const font = theme.font === 'mono' ? 'monospace' : 'system-ui, -apple-system, sans-serif';
  const text = theme.text || '#e4e4ec';
  const textDim = theme.textDim || '#8a8a9a';
  const glowIntensity = Math.round(Number(theme.glowIntensity) || 50);
  const animSpeed = Math.max(0.1, (Number(theme.animationSpeed) || 100) / 100);
  const animIntensity = Math.round(Number(theme.animationIntensity) || 50);
  const transitionSpeed = Math.max(0.1, (Number(theme.transitionSpeed) || 100) / 100);
  const bgAnimation = BACKGROUNDS.IDS.includes(theme.bgAnimation) ? theme.bgAnimation : BACKGROUNDS.DEFAULT_ID;
  const borderStyle = ['default', 'thin', 'glow', 'none'].includes(theme.borderStyle) ? theme.borderStyle : 'default';
  const style = ['default', 'clean', 'animated', 'gaming', 'minimal'].includes(theme.style) ? theme.style : 'default';
  const wallpaper = typeof theme.wallpaper === 'string' ? theme.wallpaper : '';
  const backgroundOptions = {
    id: bgAnimation,
    accent: theme.accent,
    accentAlt: theme.accentAlt,
    bg: theme.bg,
    text,
    intensity: animIntensity / 100,
    glow: glowIntensity / 100,
    speed: Math.min(2, animSpeed),
    hidden: Boolean(wallpaper),
    fps: 30
  };

  // Hintergrund-Modul einmalig in die Startseite laden.
  const backgroundsLoader = BACKGROUNDS_SOURCE ? `if (!window.JTechBackgrounds) {\n${BACKGROUNDS_SOURCE}\n}\n` : '';

  return `${backgroundsLoader}(() => {
    const style = document.documentElement.style;
    style.setProperty('--accent', ${JSON.stringify(theme.accent)});
    style.setProperty('--accent-alt', ${JSON.stringify(theme.accentAlt)});
    style.setProperty('--bg', ${JSON.stringify(theme.bg)});
    style.setProperty('--text', ${JSON.stringify(text)});
    style.setProperty('--text-dim', ${JSON.stringify(textDim)});
    style.setProperty('--text-faint', ${JSON.stringify(textDim + '80')});
    style.setProperty('--blur', '${blur}px');
    style.setProperty('--radius-lg', '${Math.round(radius * 1.6)}px');
    style.setProperty('--panel', 'rgba(255, 255, 255, ${panelAlpha})');
    style.setProperty('--stroke', 'rgba(255, 255, 255, ${(stroke / 100).toFixed(3)})');
    style.setProperty('--shadow-soft', '0 20px 60px rgba(0,0,0,${(shadow / 100).toFixed(3)})');
    style.setProperty('--shadow-glow', '0 0 ${Math.max(20, 30 * glowIntensity / 50)}px color-mix(in srgb, var(--accent) ${Math.min(50, glowIntensity)}%, transparent)');
    style.setProperty('--glow-intensity', '${glowIntensity}');
    style.setProperty('--font', '${font}');
    style.setProperty('--font-scale', '${fontSize / 100}');
    style.setProperty('--anim-speed', '${animSpeed}');
    style.setProperty('--anim-intensity', '${animIntensity}');
    style.setProperty('--transition-normal', '${Math.max(0.08, 0.2 * transitionSpeed).toFixed(3)}s cubic-bezier(0.2, 0.7, 0.2, 1)');
    style.setProperty('--transition-fast', '${Math.max(0.05, 0.12 * transitionSpeed).toFixed(3)}s ease');
    document.documentElement.style.filter = 'saturate(${saturation}%)';
    const cursorValue = ${JSON.stringify(theme.cursorImage || '')} || '';
    document.documentElement.style.cursor = cursorValue;
    let cursorStyle = document.getElementById('jtech-cursor-style');
    if (!cursorStyle) {
      cursorStyle = document.createElement('style');
      cursorStyle.id = 'jtech-cursor-style';
      (document.head || document.documentElement).appendChild(cursorStyle);
    }
    cursorStyle.textContent = cursorValue ? ('* { cursor: ' + cursorValue + ' !important; }') : '';
    // Hintergrund (Canvas, src/shared/backgrounds.js) für die Startseite
    const body = document.body;
    const bg = document.querySelector('.bg');
    const wallpaper = ${JSON.stringify(wallpaper)};
    if (bg) {
      bg.style.backgroundImage = wallpaper ? 'url(' + JSON.stringify(wallpaper) + ')' : '';
      bg.style.backgroundSize = wallpaper ? 'cover' : '';
      bg.style.backgroundPosition = wallpaper ? 'center' : '';
      body.classList.toggle('has-wallpaper', Boolean(wallpaper));
      if (window.JTechBackgrounds) {
        window.JTechBackgrounds.attach(bg, ${JSON.stringify(backgroundOptions)});
      }
    }
    body.classList.remove('style-default', 'style-clean', 'style-animated', 'style-gaming', 'style-minimal');
    body.classList.add('style-' + ${JSON.stringify(style)});
    body.classList.remove('border-default', 'border-thin', 'border-glow', 'border-none');
    body.classList.add('border-' + ${JSON.stringify(borderStyle)});

    // Stil-Regeln der Startseite
    let animStyle = document.getElementById('jtech-bg-anim-css');
    if (!animStyle) {
      animStyle = document.createElement('style');
      animStyle.id = 'jtech-bg-anim-css';
      (document.head || document.documentElement).appendChild(animStyle);
    }
    animStyle.textContent = \`
      .has-wallpaper .bg { background-size: cover; background-position: center; }
      body.style-gaming .search { border-color: color-mix(in srgb, var(--accent) calc(var(--glow-intensity) * 1%), transparent); box-shadow: 0 0 40px color-mix(in srgb, var(--accent) calc(var(--glow-intensity) * 0.4%), transparent), 0 24px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08); }
      body.style-animated .search { transition: all var(--transition-normal); }
      body.style-animated .search:focus-within { box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 12%, transparent), 0 0 54px color-mix(in srgb, var(--accent) calc(var(--glow-intensity) * 0.5%), transparent), inset 0 1px 0 rgba(255,255,255,0.06); }
      body.style-minimal .search { border-radius: 0; }
      body.border-thin .search { border-width: 1px; }
      body.border-glow .search { border-color: color-mix(in srgb, var(--accent) calc(var(--glow-intensity) * 0.8%), transparent); }
      body.border-none .search { border-color: transparent; }
    \`;
  })();`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderErrorPage(description, code, url) {
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><title>Seite nicht erreichbar</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; min-height:100vh; display:grid; place-items:center; font-family: system-ui, sans-serif;
         background: radial-gradient(circle at 30% 20%, #1b2140, #07080d 70%); color:#e8ecf7; }
  .card { max-width: 520px; padding: 40px; border-radius: 24px; background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.12); backdrop-filter: blur(20px); }
  h1 { margin: 0 0 12px; font-size: 22px; }
  p { color:#a7b0c8; line-height:1.5; margin: 0 0 16px; }
  code { display:block; padding:12px; border-radius:12px; background: rgba(0,0,0,.35); color:#7ee7f5;
         word-break: break-all; font-size: 13px; }
  small { color:#6f7891; }
</style></head>
<body><div class="card">
  <h1>Diese Seite konnte nicht geladen werden</h1>
  <p>${escapeHtml(description || 'Unbekannter Fehler')} <small>(Fehlercode ${escapeHtml(code)})</small></p>
  <code>${escapeHtml(url)}</code>
</div></body></html>`;

}
module.exports = { TabManager };
