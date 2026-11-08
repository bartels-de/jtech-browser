/**
 * Tauri bridge: provides `window.jtech` (same API as src/preload/preload.js)
 * on top of Tauri's invoke/listen. The Rust side owns all state; this file
 * only forwards calls and events.
 *
 * In Electron the preload already defined `window.jtech` and there is no
 * `window.__TAURI__`, so this file does nothing there.
 */
(() => {
  'use strict';

  const tauri = window.__TAURI__;
  if (!tauri || !tauri.core || !tauri.event || window.jtech) return;

  const { invoke } = tauri.core;
  const { listen } = tauri.event;

  /* ------------------------------------------------------------- Events */

  // Events from Rust, all delivered to local subscribers. The last payload
  // is kept so late subscribers still get the current state.
  const EVENTS = [
    'tabs:state',
    'window:state',
    'window:focus',
    'theme:update',
    'settings:update',
    'ui:focus-omnibox'
  ];
  const subscribers = new Map(EVENTS.map((name) => [name, new Set()]));
  const lastPayload = new Map();
  const REPLAY = new Set(['tabs:state', 'window:state', 'theme:update', 'settings:update']);

  function subscribe(name, callback) {
    if (typeof callback !== 'function') return () => {};
    let set = subscribers.get(name);
    if (!set) {
      set = new Set();
      subscribers.set(name, set);
    }
    set.add(callback);
    if (REPLAY.has(name) && lastPayload.has(name)) {
      const payload = lastPayload.get(name);
      queueMicrotask(() => {
        if (set.has(callback)) callback(payload);
      });
    }
    return () => set.delete(callback);
  }

  function dispatch(name, payload) {
    if (REPLAY.has(name)) lastPayload.set(name, payload);
    for (const callback of subscribers.get(name) || []) {
      try {
        callback(payload);
      } catch (error) {
        console.error(`[tauri-bridge] ${name} handler failed:`, error);
      }
    }
  }

  // Listen first, then tell Rust the UI is ready (it then sends the initial
  // state and opens the first tab), so no event gets lost.
  Promise.all(EVENTS.map((name) => listen(name, (event) => dispatch(name, event.payload))))
    .then(() => invoke('chrome_ready'))
    .catch((error) => console.error('[tauri-bridge] start failed:', error));

  /* -------------------------------------------------------------- Calls */

  // Fire-and-forget like ipcRenderer.send.
  function send(command, args) {
    invoke(command, args).catch((error) => console.error(`[tauri-bridge] ${command} failed:`, error));
  }

  const resolved = (value) => () => Promise.resolve(value);
  const noop = () => {};
  const unsubscribeNoop = () => () => {};

  /* ---------------------------------------------- Window drag (frameless) */

  // Electron uses CSS `-webkit-app-region: drag`. WebView2 does not move the
  // window for it, so start the drag from Rust instead.
  function appRegion(element) {
    for (let node = element; node && node.nodeType === 1; node = node.parentElement) {
      const style = getComputedStyle(node);
      const region = style.getPropertyValue('-webkit-app-region') || style.webkitAppRegion || '';
      if (region === 'drag' || region === 'no-drag') return region;
    }
    return 'none';
  }

  const INTERACTIVE = 'button, a, input, textarea, select, [contenteditable], [role="button"]';

  window.addEventListener('mousedown', (event) => {
    if (event.button !== 0 || event.defaultPrevented) return;
    const target = event.target;
    if (!(target instanceof Element) || target.closest(INTERACTIVE)) return;
    if (appRegion(target) !== 'drag') return;
    if (event.detail === 2) {
      send('window_toggle_maximize');
    } else {
      send('window_start_dragging');
    }
  });

  /* ---------------------------------------------------------------- API */

  window.jtech = Object.freeze({
    newTab: (url) => send('new_tab', { url: typeof url === 'string' ? url : null }),
    closeTab: (id) => send('close_tab', { id }),
    activateTab: (id) => send('activate_tab', { id }),
    navigate: (input) => send('navigate', { input: String(input ?? '') }),
    back: () => send('go_back'),
    forward: () => send('go_forward'),
    reload: (hard = false) => send('reload_tab', { hard: Boolean(hard) }),
    stop: () => send('stop_tab'),
    print: () => send('print_tab'),

    // Not ported yet (split view, groups, zoom, find).
    moveTab: noop,
    splitTab: noop,
    unsplit: noop,
    splitResize: noop,
    commandTab: (id, command) => {
      if (command === 'close') send('close_tab', { id });
      else if (command === 'reload') send('reload_tab', { hard: false });
    },
    setTabGroup: () => invoke('get_settings'),
    createTabGroup: () => invoke('get_settings'),
    updateTabGroup: () => invoke('get_settings'),
    removeTabGroup: () => invoke('get_settings'),
    zoom: noop,
    findInPage: noop,
    stopFind: noop,

    minimize: () => send('window_minimize'),
    toggleMaximize: () => send('window_toggle_maximize'),
    close: () => send('window_close'),

    reportChromeHeight: (height) => {
      if (Number.isFinite(height)) send('set_layout', { chromeHeight: height, sidebarWidth: null });
    },
    reportLayout: (metrics) => {
      if (!metrics || typeof metrics !== 'object') return;
      const chromeHeight = Number.isFinite(metrics.chromeHeight) ? metrics.chromeHeight : null;
      const sidebarWidth = Number.isFinite(metrics.sidebarWidth) ? metrics.sidebarWidth : null;
      send('set_layout', { chromeHeight, sidebarWidth });
    },
    setDock: (width) => {
      if (Number.isFinite(width)) send('set_dock', { width });
    },
    focusContent: () => send('focus_content'),
    toggleDevTools: noop,
    togglePictureInPicture: noop,
    setOverlay: (open) => send('set_overlay', { open: Boolean(open) }),
    toggleWebview: (visible) => send('toggle_webview', { visible: Boolean(visible) }),

    listMedia: resolved([]),
    mediaCommand: resolved([]),
    pauseAllMedia: resolved([]),
    setTabVolume: resolved([]),

    saveTheme: (theme) => invoke('save_theme', { theme: theme ?? {} }),

    getSettings: () => invoke('get_settings'),
    saveSettings: (patch) => invoke('save_settings', { patch: patch ?? {} }),
    clearHistory: () => invoke('save_settings', { patch: { history: [] } }),
    openDownload: noop,
    showDownload: noop,
    cancelDownload: noop,

    // Chrome extensions are not supported in the Tauri build.
    listExtensions: resolved([]),
    loadExtension: resolved(null),
    installExtensionFromStore: resolved(null),
    removeExtension: resolved([]),
    openExtensionPopup: resolved(null),

    listDownloads: resolved([]),
    getMetrics: resolved([]),
    getResources: resolved(null),
    getUpdateStatus: resolved({ state: 'idle', supported: false }),
    checkForUpdates: resolved({ state: 'idle', supported: false }),
    installUpdate: resolved(false),
    resourceAction: resolved(null),

    // Favorites, bookmarks etc. are not ported yet: return current settings.
    addFavorite: () => invoke('get_settings'),
    removeFavorite: () => invoke('get_settings'),
    addSaved: () => invoke('get_settings'),
    removeSaved: () => invoke('get_settings'),
    addShortcut: () => invoke('get_settings'),
    removeShortcut: () => invoke('get_settings'),
    addBookmark: () => invoke('get_settings'),
    removeBookmark: () => invoke('get_settings'),
    addBookmarkFolder: () => invoke('get_settings'),
    removeBookmarkFolder: () => invoke('get_settings'),

    onState: (callback) => subscribe('tabs:state', callback),
    onWindowState: (callback) => subscribe('window:state', callback),
    onWindowFocus: (callback) => subscribe('window:focus', callback),
    onFocusOmnibox: (callback) => subscribe('ui:focus-omnibox', callback),
    onTheme: (callback) => subscribe('theme:update', callback),
    onSettings: (callback) => subscribe('settings:update', callback),

    onFullscreen: unsubscribeNoop,
    onOpenSettings: unsubscribeNoop,
    onOpenTabSearch: unsubscribeNoop,
    onOpenCommandPalette: unsubscribeNoop,
    onOpenTaskManager: unsubscribeNoop,
    onHistoryEntry: unsubscribeNoop,
    onToast: unsubscribeNoop,
    onUpdateStatus: unsubscribeNoop,
    onResourceEvent: unsubscribeNoop,
    onOpenFind: unsubscribeNoop,
    onFindResult: unsubscribeNoop,
    onHistory: unsubscribeNoop,
    onDownloads: unsubscribeNoop,
    onExtensions: unsubscribeNoop
  });
})();
