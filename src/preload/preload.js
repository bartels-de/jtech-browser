'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Minimale, klar begrenzte API für das Chrome-UI.
 * Kein Node-Zugriff im Renderer, nur diese Kanäle.
 */
contextBridge.exposeInMainWorld('jtech', {
  newTab: (url) => ipcRenderer.send('tabs:new', url),
  closeTab: (id) => ipcRenderer.send('tabs:close', id),
  activateTab: (id) => ipcRenderer.send('tabs:activate', id),
  navigate: (input) => ipcRenderer.send('tabs:navigate', input),
  back: () => ipcRenderer.send('tabs:back'),
  forward: () => ipcRenderer.send('tabs:forward'),
  reload: (hard = false) => ipcRenderer.send('tabs:reload', hard),
  stop: () => ipcRenderer.send('tabs:stop'),
  print: () => ipcRenderer.send('tabs:print'),
  moveTab: (id, index) => ipcRenderer.send('tabs:move', { id, index }),
  splitTab: (id) => ipcRenderer.send('tabs:split', id),
  unsplit: () => ipcRenderer.send('tabs:unsplit'),
  splitResize: (ratio) => ipcRenderer.send('tabs:split-ratio', { ratio }),
  commandTab: (id, command) => ipcRenderer.send('tabs:command', { id, command }),
  setTabGroup: (id, groupId) => ipcRenderer.invoke('tabs:group', { id, groupId }),
  createTabGroup: (name, color) => ipcRenderer.invoke('tabs:create-group', { name, color }),
  updateTabGroup: (groupId, patch) => ipcRenderer.invoke('tabs:update-group', { groupId, patch }),
  removeTabGroup: (groupId) => ipcRenderer.invoke('tabs:remove-group', { groupId }),
  zoom: (action, value) => ipcRenderer.send('tabs:zoom', { action, value }),
  findInPage: (query, forward = true, findNext = false) =>
    ipcRenderer.send('find:start', { query, forward, findNext }),
  stopFind: () => ipcRenderer.send('find:stop'),

  minimize: () => ipcRenderer.send('window:minimize'),
  toggleMaximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  reportChromeHeight: (height) => ipcRenderer.send('ui:chrome-height', height),
  reportLayout: (metrics) => ipcRenderer.send('ui:layout', metrics),
  setDock: (width) => ipcRenderer.send('ui:dock', width),
  focusContent: () => ipcRenderer.send('ui:focus-content'),
  toggleDevTools: () => ipcRenderer.send('ui:devtools'),
  togglePictureInPicture: () => ipcRenderer.send('tabs:picture-in-picture'),
  setOverlay: (open) => ipcRenderer.send('ui:overlay', Boolean(open)),

  listMedia: () => ipcRenderer.invoke('media:list'),
  mediaCommand: (payload) => ipcRenderer.invoke('media:command', payload),
  pauseAllMedia: () => ipcRenderer.invoke('media:pause-all'),
  setTabVolume: (id, volume) => ipcRenderer.invoke('media:volume', { id, volume }),

  saveTheme: (theme) => ipcRenderer.invoke('theme:save', theme),

  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (patch) => ipcRenderer.invoke('settings:save', patch),
  clearHistory: () => ipcRenderer.invoke('history:clear'),
  openDownload: (id) => ipcRenderer.send('downloads:open', id),
  showDownload: (id) => ipcRenderer.send('downloads:show', id),
  cancelDownload: (id) => ipcRenderer.send('downloads:cancel', id),
  listExtensions: () => ipcRenderer.invoke('extensions:list'),
  loadExtension: () => ipcRenderer.invoke('extensions:load'),
  installExtensionFromStore: (input) => ipcRenderer.invoke('extensions:install-from-store', input),
  removeExtension: (id) => ipcRenderer.invoke('extensions:remove', id),
  openExtensionPopup: (extensionId, anchorRect) => ipcRenderer.invoke('extensions:open-popup', { extensionId, anchorRect }),
  listDownloads: () => ipcRenderer.invoke('downloads:list'),
  getMetrics: () => ipcRenderer.invoke('system:metrics'),
  getResources: () => ipcRenderer.invoke('resources:snapshot'),
  getUpdateStatus: () => ipcRenderer.invoke('update:get'),
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  resourceAction: (payload) => ipcRenderer.invoke('resources:action', payload),
  addFavorite: (entry) => ipcRenderer.invoke('favorites:add', entry),
  removeFavorite: (id) => ipcRenderer.invoke('favorites:remove', id),
  addSaved: (entry) => ipcRenderer.invoke('saved:add', entry),
  removeSaved: (id) => ipcRenderer.invoke('saved:remove', id),
  addShortcut: (entry) => ipcRenderer.invoke('shortcuts:add', entry),
  removeShortcut: (id) => ipcRenderer.invoke('shortcuts:remove', id),
  addBookmark: (entry) => ipcRenderer.invoke('bookmarks:add', entry),
  removeBookmark: (id) => ipcRenderer.invoke('bookmarks:remove', id),
  addBookmarkFolder: (name, parentId) => ipcRenderer.invoke('bookmarks:addFolder', name, parentId),
  removeBookmarkFolder: (id) => ipcRenderer.invoke('bookmarks:removeFolder', id),

  onState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('tabs:state', listener);
    return () => ipcRenderer.removeListener('tabs:state', listener);
  },

  onWindowState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('window:state', listener);
    return () => ipcRenderer.removeListener('window:state', listener);
  },

  onFullscreen: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('window:fullscreen', listener);
    return () => ipcRenderer.removeListener('window:fullscreen', listener);
  },

  onFocusOmnibox: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('ui:focus-omnibox', listener);
    return () => ipcRenderer.removeListener('ui:focus-omnibox', listener);
  },

  onOpenSettings: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('ui:open-settings', listener);
    return () => ipcRenderer.removeListener('ui:open-settings', listener);
  },

  onOpenTabSearch: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('ui:tab-search', listener);
    return () => ipcRenderer.removeListener('ui:tab-search', listener);
  },

  onOpenCommandPalette: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('ui:command-palette', listener);
    return () => ipcRenderer.removeListener('ui:command-palette', listener);
  },

  onOpenTaskManager: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('ui:task-manager', listener);
    return () => ipcRenderer.removeListener('ui:task-manager', listener);
  },

  onHistoryEntry: (callback) => {
    const listener = (_event, entry) => callback(entry);
    ipcRenderer.on('history:entry', listener);
    return () => ipcRenderer.removeListener('history:entry', listener);
  },

  onWindowFocus: (callback) => {
    const listener = (_event, focused) => callback(focused);
    ipcRenderer.on('window:focus', listener);
    return () => ipcRenderer.removeListener('window:focus', listener);
  },

  onToast: (callback) => {
    const listener = (_event, text) => callback(text);
    ipcRenderer.on('ui:toast', listener);
    return () => ipcRenderer.removeListener('ui:toast', listener);
  },

  onUpdateStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('update:status', listener);
    return () => ipcRenderer.removeListener('update:status', listener);
  },

  onResourceEvent: (callback) => {
    const listener = (_event, text) => callback(text);
    ipcRenderer.on('resources:event', listener);
    return () => ipcRenderer.removeListener('resources:event', listener);
  },

  onOpenFind: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('ui:find-open', listener);
    return () => ipcRenderer.removeListener('ui:find-open', listener);
  },

  onFindResult: (callback) => {
    const listener = (_event, result) => callback(result);
    ipcRenderer.on('find:result', listener);
    return () => ipcRenderer.removeListener('find:result', listener);
  },

  onTheme: (callback) => {
    const listener = (_event, theme) => callback(theme);
    ipcRenderer.on('theme:update', listener);
    return () => ipcRenderer.removeListener('theme:update', listener);
  },

  onSettings: (callback) => {
    const listener = (_event, settings) => callback(settings);
    ipcRenderer.on('settings:update', listener);
    return () => ipcRenderer.removeListener('settings:update', listener);
  },

  onHistory: (callback) => {
    const listener = (_event, history) => callback(history);
    ipcRenderer.on('history:update', listener);
    return () => ipcRenderer.removeListener('history:update', listener);
  },

  onDownloads: (callback) => {
    const listener = (_event, downloads) => callback(downloads);
    ipcRenderer.on('downloads:update', listener);
    return () => ipcRenderer.removeListener('downloads:update', listener);
  },

  onExtensions: (callback) => {
    const listener = (_event, extensions) => callback(extensions);
    ipcRenderer.on('extensions:update', listener);
    return () => ipcRenderer.removeListener('extensions:update', listener);
  }
});
