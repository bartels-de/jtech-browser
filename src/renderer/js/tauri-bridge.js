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

  /* ------------------------------------------------- Tauri-only UI tweaks */

  // Chrome extensions are not supported in the Tauri build: hide the
  // toolbar menu and the settings section. Electron never runs this file's
  // code, so it keeps them.
  document.documentElement.classList.add('is-tauri');
  const tauriStyle = document.createElement('style');
  tauriStyle.textContent = [
    'html.is-tauri #extensions-menu,',
    'html.is-tauri .settings__nav-btn[data-panel="extensions"],',
    'html.is-tauri .settings__panel[data-panel="extensions"] { display: none !important; }'
  ].join('\n');
  document.head.appendChild(tauriStyle);

  /* ------------------------------------------------------------- Events */

  // Events from Rust, all delivered to local subscribers. The last payload
  // is kept so late subscribers still get the current state.
  const EVENTS = [
    'tabs:state',
    'window:state',
    'window:focus',
    'theme:update',
    'settings:update',
    'history:entry',
    'window:fullscreen',
    'ui:focus-omnibox',
    'ui:open-settings',
    'ui:tab-search',
    'ui:command-palette',
    'ui:task-manager',
    'ui:find-open',
    'ui:toast'
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

  // Settings arrive after every save (as the save result and as
  // settings:update). Answers to older saves must not overwrite what the
  // user is still typing, e.g. "Dein Name" (the saved value is trimmed, so
  // a just-typed space would vanish and later keystrokes get lost).
  const LIVE_FIELDS = [['setting-username', 'ui', 'userName']];

  function keepTypedValues(settings) {
    if (!settings || typeof settings !== 'object') return settings;
    const active = document.activeElement;
    for (const [id, section, key] of LIVE_FIELDS) {
      if (active && active.id === id && settings[section] && typeof settings[section] === 'object') {
        settings = { ...settings, [section]: { ...settings[section], [key]: active.value } };
      }
    }
    return settings;
  }

  function dispatch(name, payload) {
    if (name === 'settings:update') payload = keepTypedValues(payload);
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
    zoom: (action, value) => send('zoom_tab', { action: String(action ?? ''), value: Number.isFinite(value) ? value : null }),
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
    saveSettings: (patch) => invoke('save_settings', { patch: patch ?? {} }).then(keepTypedValues),
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
    // No updater in the Tauri build yet; Rust explains that in the status.
    getUpdateStatus: () => invoke('get_update_status'),
    checkForUpdates: () => invoke('get_update_status'),
    installUpdate: resolved(false),
    resourceAction: resolved(null),

    // Favorites, saved pages, start page shortcuts and bookmarks. Rust
    // returns the new settings (and also sends settings:update).
    addFavorite: (entry) => invoke('favorites_add', { entry: entry ?? {} }).then(keepTypedValues),
    removeFavorite: (id) => invoke('favorites_remove', { id: String(id ?? '') }).then(keepTypedValues),
    addSaved: (entry) => invoke('saved_add', { entry: entry ?? {} }).then(keepTypedValues),
    removeSaved: (id) => invoke('saved_remove', { id: String(id ?? '') }).then(keepTypedValues),
    addShortcut: (entry) => invoke('shortcuts_add', { entry: entry ?? {} }).then(keepTypedValues),
    removeShortcut: (id) => invoke('shortcuts_remove', { id: String(id ?? '') }).then(keepTypedValues),
    addBookmark: (entry) => invoke('bookmarks_add', { entry: entry ?? {} }).then(keepTypedValues),
    removeBookmark: (id) => invoke('bookmarks_remove', { id: String(id ?? '') }).then(keepTypedValues),
    addBookmarkFolder: (name, parentId) =>
      invoke('bookmarks_add_folder', {
        name: String(name ?? ''),
        parentId: typeof parentId === 'string' ? parentId : null
      }).then(keepTypedValues),
    removeBookmarkFolder: (id) => invoke('bookmarks_remove_folder', { id: String(id ?? '') }).then(keepTypedValues),

    onState: (callback) => subscribe('tabs:state', callback),
    onWindowState: (callback) => subscribe('window:state', callback),
    onWindowFocus: (callback) => subscribe('window:focus', callback),
    onFocusOmnibox: (callback) => subscribe('ui:focus-omnibox', callback),
    onTheme: (callback) => subscribe('theme:update', callback),
    onSettings: (callback) => subscribe('settings:update', callback),

    onFullscreen: (callback) => subscribe('window:fullscreen', callback),
    onOpenSettings: (callback) => subscribe('ui:open-settings', callback),
    onOpenTabSearch: (callback) => subscribe('ui:tab-search', callback),
    onOpenCommandPalette: (callback) => subscribe('ui:command-palette', callback),
    onOpenTaskManager: (callback) => subscribe('ui:task-manager', callback),
    onToast: (callback) => subscribe('ui:toast', callback),
    onOpenFind: (callback) => subscribe('ui:find-open', callback),
    onHistoryEntry: (callback) => subscribe('history:entry', callback),

    onUpdateStatus: unsubscribeNoop,
    onResourceEvent: unsubscribeNoop,
    onFindResult: unsubscribeNoop,
    onHistory: unsubscribeNoop,
    onDownloads: unsubscribeNoop,
    onExtensions: unsubscribeNoop
  });
})();
