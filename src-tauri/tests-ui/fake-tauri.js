'use strict';

/*
 * Fake window.__TAURI__ for UI tests: behaves like the Rust side of
 * src-tauri (async invoke with delays, settings:update after each save,
 * trimmed userName, tab updates). Injected with page.addInitScript.
 * window.__fakeTauri.calls records every invoked command.
 */
function fakeTauri() {
  const listeners = new Map();
  const calls = [];
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const emit = (name, payload) => {
    for (const cb of listeners.get(name) || []) cb({ event: name, payload: structuredClone(payload) });
  };
  const settings = {
    search: { engine: 'google', urlTemplate: 'https://www.google.com/search?q=%s' },
    ui: { tabLayout: 'vertical', favoritesBar: true, sidebarWidth: 252, restoreSession: true, gamingMode: false, userName: '', density: 'normal', autoSleepMinutes: 30 },
    favorites: [], saved: [], shortcuts: [], bangs: [], bookmarks: [], bookmarkFolders: [],
    tabGroups: [], extensions: [], privacy: { adblock: true, trackingProtection: true },
    performance: { enabled: false, cpuLimit: 50, ramLimit: 0, hardCap: true, lowPriority: false },
    hotkeys: {}, customThemes: [], history: []
  };
  const tab = { id: 't1', title: 'Neuer Tab', url: '', favicon: '', loading: false, canGoBack: false, canGoForward: false, isNewTab: true, pinned: false, groupId: null, muted: false, audible: false, volume: 1, volumeExplicit: false, mediaActive: false, zoom: 1, sleeping: false };
  const state = { activeId: 't1', splitMode: false, splitLeftId: null, splitRightId: null, splitRatio: 0.5, tabs: [tab] };

  async function invoke(cmd, args = {}) {
    calls.push(cmd);
    await delay(15 + Math.random() * 40);
    switch (cmd) {
      case 'chrome_ready':
        emit('window:state', { maximized: false });
        emit('settings:update', settings);
        emit('tabs:state', state);
        return null;
      case 'get_settings':
        return structuredClone(settings);
      case 'save_settings': {
        const patch = args.patch || {};
        // Same as normalize_ui in settings.rs: the name is trimmed.
        if (patch.ui) settings.ui = { ...settings.ui, ...patch.ui, userName: String(patch.ui.userName ?? settings.ui.userName).trim().slice(0, 60) };
        // Rust answers and also emits settings:update.
        setTimeout(() => emit('settings:update', settings), 5 + Math.random() * 30);
        return structuredClone(settings);
      }
      case 'get_update_status':
        return { state: 'idle', supported: false, current: '0.0.0' };
      default:
        return null;
    }
  }
  async function listen(name, cb) {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name).add(cb);
    return () => listeners.get(name).delete(cb);
  }
  // A loading page keeps sending tab updates (title, favicon, loading).
  setInterval(() => {
    tab.title = 'Seite ' + Math.round(Math.random() * 100);
    emit('tabs:state', state);
  }, 90);
  window.__TAURI__ = { core: { invoke }, event: { listen } };
  window.__fakeTauri = { calls, settings, emit };
}

module.exports = { fakeTauri };
