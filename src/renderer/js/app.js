'use strict';

const api = window.jtech;

const els = {
  chrome: document.getElementById('chrome'),
  tabstrip: document.getElementById('tabstrip'),
  tabs: document.getElementById('tabs'),
  newTab: document.getElementById('new-tab'),
  tabSearchOpen: document.getElementById('tab-search-open'),
  sidebar: document.getElementById('sidebar'),
  sidebarBurger: document.getElementById('sidebar-burger'),
  sidebarTabs: document.getElementById('sidebar-tabs'),
  sidebarResize: document.getElementById('sidebar-resize'),
  sidebarHome: document.getElementById('sidebar-home'),
  sidebarNewTab: document.getElementById('sidebar-new-tab'),
  sidebarFavorites: document.getElementById('sidebar-favorites'),
  sidebarProfile: document.getElementById('sidebar-profile'),
  sidebarAvatar: document.getElementById('sidebar-avatar'),
  sidebarProfileName: document.getElementById('sidebar-profile-name'),
  newTabSidebar: document.getElementById('new-tab-sidebar'),
  sidebarSettings: document.getElementById('sidebar-settings'),
  back: document.getElementById('back'),
  forward: document.getElementById('forward'),
  reload: document.getElementById('reload'),
  omnibox: document.getElementById('omnibox'),
  omniboxForm: document.getElementById('omnibox-form'),
  omniboxSuggestions: document.getElementById('omnibox-suggestions'),
  promptModal: document.getElementById('prompt-modal'),
  promptTitle: document.getElementById('prompt-title'),
  promptInput: document.getElementById('prompt-input'),
  promptOk: document.getElementById('prompt-ok'),
  promptCancel: document.getElementById('prompt-cancel'),  badge: document.getElementById('security-badge'),
  zoomReset: document.getElementById('zoom-reset'),
  devtools: document.getElementById('devtools'),
  extensionsMenu: document.getElementById('extensions-menu'),
  extensionsMenuToggle: document.getElementById('extensions-menu-toggle'),
  extensionsMenuPanel: document.getElementById('extensions-menu-panel'),
  extensionsMenuList: document.getElementById('extensions-menu-list'),
  extensionsMenuEmpty: document.getElementById('extensions-menu-empty'),
  pipButton: document.getElementById('picture-in-picture'),
  winMin: document.getElementById('win-min'),
  winMax: document.getElementById('win-max'),
  winClose: document.getElementById('win-close'),

  favoriteToggle: document.getElementById('favorite-toggle'),
  favorites: document.getElementById('favorites'),
  favoritesList: document.getElementById('favorites-list'),
  favoritesManage: document.getElementById('favorites-manage'),
  splitControl: document.getElementById('split-control'),
  splitLeftTitle: document.getElementById('split-left-title'),
  splitRightTitle: document.getElementById('split-right-title'),
  splitNarrower: document.getElementById('split-narrower'),
  splitWider: document.getElementById('split-wider'),
  splitClose: document.getElementById('split-close'),

  studio: document.getElementById('studio'),
  studioOpen: document.getElementById('studio-open'),
  studioClose: document.getElementById('studio-close'),
  presetGrid: document.getElementById('preset-grid'),
  customThemeGrid: document.getElementById('custom-theme-grid'),
  customThemeEmpty: document.getElementById('custom-theme-empty'),
  saveCustomTheme: document.getElementById('save-custom-theme'),
  themeSaveForm: document.getElementById('theme-save-form'),
  themeSaveName: document.getElementById('theme-save-name'),
  themeSaveCancel: document.getElementById('theme-save-cancel'),
  themeStatus: document.getElementById('theme-status'),
  themeReset: document.getElementById('theme-reset'),
  themeTabs: document.getElementById('theme-tabs'),
  themeTabButtons: [...document.querySelectorAll('.ds-tab')],
  themeTabPanels: [...document.querySelectorAll('.ds-panel')],
  previewBackground: document.getElementById('ds-preview-bg'),
  bgGallery: document.getElementById('bg-gallery'),
  wallpaperField: document.getElementById('wallpaper-field'),
  animationControls: document.getElementById('animation-controls'),

  themeAccent: document.getElementById('theme-accent'),
  themeAccentHex: document.getElementById('theme-accent-hex'),
  themeAccentAlt: document.getElementById('theme-accent-alt'),
  themeAccentAltHex: document.getElementById('theme-accent-alt-hex'),
  themeBg: document.getElementById('theme-bg'),
  themeBgHex: document.getElementById('theme-bg-hex'),
  themeText: document.getElementById('theme-text'),
  themeTextHex: document.getElementById('theme-text-hex'),
  themeCursorColor: document.getElementById('theme-cursor-color'),
  themeCursorColorHex: document.getElementById('theme-cursor-color-hex'),
  themeWallpaper: document.getElementById('theme-wallpaper'),
  themeStyle: document.getElementById('theme-style'),
  themeFont: document.getElementById('theme-font'),
  themeBorderStyle: document.getElementById('theme-border-style'),
  themeCursorEffect: document.getElementById('theme-cursor-effect'),
  themeCursorImage: document.getElementById('theme-cursor-image'),
  themeCssChrome: document.getElementById('theme-css-chrome'),
  themeCssNewtab: document.getElementById('theme-css-newtab'),
  themeExport: document.getElementById('theme-export'),
  themeImport: document.getElementById('theme-import'),
  themeImportInput: document.getElementById('theme-import-input'),
  themeRandomize: document.getElementById('theme-randomize'),

  settings: document.getElementById('settings'),
  settingsOpen: document.getElementById('settings-open'),
  settingsClose: document.getElementById('settings-close'),
  settingsDone: document.getElementById('settings-done'),
  settingsStatus: document.getElementById('settings-status'),
  settingsNavButtons: [...document.querySelectorAll('.settings__nav-btn')],
  settingsPanels: [...document.querySelectorAll('.settings__panel')],
  searchEngine: document.getElementById('setting-search-engine'),
  username: document.getElementById('setting-username'),
  searchCustom: document.getElementById('setting-search-custom'),
  searchTemplate: document.getElementById('setting-search-template'),
  densityButtons: [...document.querySelectorAll('#setting-density .segmented__btn')],
  favoritesBarToggle: document.getElementById('setting-favorites-bar'),
  gamingModeToggle: document.getElementById('setting-gaming-mode'),
  autoSleep: document.getElementById('setting-auto-sleep'),
  gamingModeButton: document.getElementById('gaming-mode-toggle'),
  resourceHudToggle: document.getElementById('resource-hud-toggle'),
  resPanel: document.getElementById('res-panel'),
  resPanelClose: document.getElementById('res-panel-close'),
  resCpuValue: document.getElementById('res-cpu-value'),
  resRamValue: document.getElementById('res-ram-value'),
  resRamSub: document.getElementById('res-ram-sub'),
  resCpuLimitLabel: document.getElementById('res-cpu-limit-label'),
  resRamLimitLabel: document.getElementById('res-ram-limit-label'),
  resCpuChart: document.getElementById('res-cpu-chart'),
  resRamChart: document.getElementById('res-ram-chart'),
  resMeta: document.getElementById('res-meta'),
  resLimits: document.getElementById('res-limits'),
  resEnabled: document.getElementById('res-enabled'),
  resCpuLimit: document.getElementById('res-cpu-limit'),
  resCpuLimitValue: document.getElementById('res-cpu-limit-value'),
  resRamLimit: document.getElementById('res-ram-limit'),
  resRamLimitValue: document.getElementById('res-ram-limit-value'),
  resHardCap: document.getElementById('res-hard-cap'),
  resHardCapNote: document.getElementById('res-hard-cap-note'),
  resLowPriority: document.getElementById('res-low-priority'),
  resEventsSection: document.getElementById('res-events-section'),
  resEvents: document.getElementById('res-events'),
  resProcTitle: document.getElementById('res-proc-title'),
  resProcs: document.getElementById('res-procs'),
  resSortButtons: [...document.querySelectorAll('.res-sort__btn')],
  mediaHub: document.getElementById('media-hub'),
  mediaHubToggle: document.getElementById('media-hub-toggle'),
  mediaHubClose: document.getElementById('media-hub-close'),
  mediaHubList: document.getElementById('media-hub-list'),
  mediaHubEmpty: document.getElementById('media-hub-empty'),
  mediaHubStatus: document.getElementById('media-hub-status'),
  mediaPauseAll: document.getElementById('media-pause-all'),
  mediaRefresh: document.getElementById('media-refresh'),
  mediaMixerList: document.getElementById('media-mixer-list'),
  mediaMixerEmpty: document.getElementById('media-mixer-empty'),
  settingsOpenStudio: document.getElementById('settings-open-studio'),
  settingsAddCurrent: document.getElementById('settings-add-current'),
  settingsFavoritesList: document.getElementById('settings-favorites-list'),
  settingsFavoritesEmpty: document.getElementById('settings-favorites-empty'),
  shortcutsAddCurrent: document.getElementById('shortcuts-add-current'),
  shortcutList: document.getElementById('shortcut-list'),
  shortcutsEmpty: document.getElementById('shortcuts-empty'),
  bangsAdd: document.getElementById('bangs-add'),
  bangsList: document.getElementById('bangs-list'),
  bangsEmpty: document.getElementById('bangs-empty'),
  bangsForm: document.getElementById('bangs-form'),
  bangsTrigger: document.getElementById('bangs-trigger'),
  bangsUrl: document.getElementById('bangs-url'),
  bangsSave: document.getElementById('bangs-save'),
  bangsCancel: document.getElementById('bangs-cancel'),  bookmarksAddCurrent: document.getElementById('bookmarks-add-current'),
  bookmarksAddFolder: document.getElementById('bookmarks-add-folder'),
  bookmarksExport: document.getElementById('bookmarks-export'),
  bookmarksImport: document.getElementById('bookmarks-import'),
  bookmarksSearch: document.getElementById('bookmarks-search'),
  bookmarkTree: document.getElementById('bookmark-tree'),
  bookmarksEmpty: document.getElementById('bookmarks-empty'),
  historySearch: document.getElementById('history-search'),
  historyList: document.getElementById('history-list'),
  historyEmpty: document.getElementById('history-empty'),
  historyClear: document.getElementById('history-clear'),
  downloadList: document.getElementById('download-list'),
  downloadsEmpty: document.getElementById('downloads-empty'),
  restoreSessionToggle: document.getElementById('setting-restore-session'),
  adblockToggle: document.getElementById('setting-adblock'),
  trackingToggle: document.getElementById('setting-tracking'),
  extensionsLoad: document.getElementById('extensions-load'),
  extensionStoreInput: document.getElementById('extension-store-input'),
  extensionStoreInstall: document.getElementById('extension-store-install'),
  extensionList: document.getElementById('extension-list'),
  extensionsEmpty: document.getElementById('extensions-empty'),
  extensionsStatus: document.getElementById('extensions-status'),
  hotkeyList: document.getElementById('hotkey-list'),
  hotkeyConflict: document.getElementById('hotkey-conflict'),
  hotkeysReset: document.getElementById('hotkeys-reset'),

  findbar: document.getElementById('findbar'),
  findInput: document.getElementById('find-input'),
  findCount: document.getElementById('find-count'),
  findPrev: document.getElementById('find-prev'),
  findNext: document.getElementById('find-next'),
  findClose: document.getElementById('find-close'),

  tabSearch: document.getElementById('tab-search'),
  tabSearchInput: document.getElementById('tab-search-input'),
  tabSearchResults: document.getElementById('tab-search-results'),
  tabSearchEmpty: document.getElementById('tab-search-empty'),
  commandPalette: document.getElementById('command-palette'),
  commandPaletteInput: document.getElementById('command-palette-input'),
  commandPaletteResults: document.getElementById('command-palette-results'),
  commandPaletteEmpty: document.getElementById('command-palette-empty'),
  contextMenu: document.getElementById('context-menu')
};

const state = { tabs: [], activeId: null, splitMode: false, splitLeftId: null, splitRightId: null, splitRatio: 0.5 };
const tabNodes = new Map();
const groupNodes = new Map();
const GROUP_COLORS = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
  teal: '#14b8a6',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  pink: '#ec4899',
  gray: '#6b7280'
};
const GROUP_COLOR_ORDER = ['blue', 'purple', 'green', 'orange', 'red', 'pink', 'teal', 'yellow', 'gray'];

let omniboxDirty = false;
let downloads = [];

const getActive = () => state.tabs.find((tab) => tab.id === state.activeId) || null;

let draggedTabId = null;

function clearDropIndicators() {
  for (const node of tabNodes.values()) {
    node.classList.remove('is-drop-before', 'is-drop-after');
    delete node.dataset.dropAfter;
  }
}

function finishTabDrag() {
  draggedTabId = null;
  for (const node of tabNodes.values()) node.classList.remove('is-dragging');
  clearDropIndicators();
}

function closeContextMenu() {
  els.contextMenu.hidden = true;
  els.contextMenu.replaceChildren();
  updateOverlayState();
}

function openTabContextMenu(id, x, y) {
  const tab = state.tabs.find((entry) => entry.id === id);
  if (!tab) return;

  const groups = (appSettings.tabGroups || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));

  const items = [
    { label: 'Neu laden', command: 'reload' },
    { label: 'Tab duplizieren', command: 'duplicate' },
    { label: tab.pinned ? 'Tab lösen' : 'Tab anheften', command: tab.pinned ? 'unpin' : 'pin' },
    { label: tab.muted ? 'Stummschaltung aufheben' : 'Tab stummschalten', command: tab.muted ? 'unmute' : 'mute' }
  ];

  if (state.splitMode) {
    items.push({ label: 'Split-View beenden', command: 'unsplit' });
  } else if (state.tabs.length >= 2 && !tab.pinned) {
    items.push({ label: 'In Split-View öffnen', command: 'split' });
  }

  items.push({ separator: true });

  if (!tab.pinned) {
    items.push({ label: 'Neue Gruppe…', command: 'new-group' });
    if (tab.groupId) {
      items.push({ label: 'Aus Gruppe entfernen', command: 'remove-from-group' });
    }
    for (const group of groups) {
      if (group.id === tab.groupId) continue;
      items.push({
        label: group.name,
        command: 'move-to-group',
        groupId: group.id,
        color: getGroupColor(group)
      });
    }
    items.push({ separator: true });
  }

  items.push({ label: 'Andere Tabs schließen', command: 'close-others', disabled: state.tabs.length < 2 });
  items.push({ label: 'Tab schließen', command: 'close', danger: true });

  const fragment = document.createDocumentFragment();
  for (const item of items) {
    if (item.separator) {
      const separator = document.createElement('div');
      separator.className = 'context-menu__separator';
      fragment.appendChild(separator);
      continue;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'context-menu__item';
    button.disabled = Boolean(item.disabled);
    button.setAttribute('role', 'menuitem');
    if (item.danger) button.classList.add('is-danger');

    if (item.color) {
      button.innerHTML = `<span class="context-menu__dot" style="background:${item.color};box-shadow:0 0 8px ${item.color}80"></span><span>${escapeHtml(item.label)}</span>`;
    } else {
      button.textContent = item.label;
    }

    button.addEventListener('click', async () => {
      if (item.command === 'close') api.closeTab(id);
      else if (item.command === 'split') api.splitTab(id);
      else if (item.command === 'unsplit') api.unsplit();
      else if (item.command === 'new-group') {
        const name = prompt('Name der neuen Gruppe:');
        if (name) {
          const result = await api.createTabGroup(name, getNextGroupColor());
          if (result?.tabGroups?.length) {
            const created = result.tabGroups[result.tabGroups.length - 1];
            await api.setTabGroup(id, created.id);
          }
        }
      } else if (item.command === 'remove-from-group') {
        api.setTabGroup(id, null);
      } else if (item.command === 'move-to-group') {
        api.setTabGroup(id, item.groupId);
      } else {
        api.commandTab(id, item.command);
      }
      closeContextMenu();
    });
    fragment.appendChild(button);
  }

  els.contextMenu.replaceChildren(fragment);
  els.contextMenu.hidden = false;
  const rect = els.contextMenu.getBoundingClientRect();
  els.contextMenu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - rect.width - 8))}px`;
  els.contextMenu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - rect.height - 8))}px`;
  updateOverlayState();
}

function openGroupContextMenu(groupId, x, y) {
  const group = (appSettings.tabGroups || []).find((g) => g.id === groupId);
  if (!group) return;

  const items = [
    { label: 'Gruppe umbenennen', command: 'rename' },
    { label: group.collapsed ? 'Gruppe ausklappen' : 'Gruppe einklappen', command: 'toggle-collapse' },
    { separator: true },
    { label: 'Gruppe auflösen', command: 'remove', danger: true }
  ];

  const fragment = document.createDocumentFragment();
  for (const item of items) {
    if (item.separator) {
      const separator = document.createElement('div');
      separator.className = 'context-menu__separator';
      fragment.appendChild(separator);
      continue;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'context-menu__item';
    button.textContent = item.label;
    button.setAttribute('role', 'menuitem');
    if (item.danger) button.classList.add('is-danger');
    button.addEventListener('click', async () => {
      if (item.command === 'rename') {
        const name = prompt('Neuer Name der Gruppe:', group.name);
        if (name) api.updateTabGroup(group.id, { name });
      } else if (item.command === 'toggle-collapse') {
        api.updateTabGroup(group.id, { collapsed: !group.collapsed });
      } else if (item.command === 'remove') {
        if (confirm(`Gruppe „${group.name}" auflösen? Die Tabs bleiben erhalten.`)) {
          api.removeTabGroup(group.id);
        }
      }
      closeContextMenu();
    });
    fragment.appendChild(button);
  }

  els.contextMenu.replaceChildren(fragment);
  els.contextMenu.hidden = false;
  const rect = els.contextMenu.getBoundingClientRect();
  els.contextMenu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - rect.width - 8))}px`;
  els.contextMenu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - rect.height - 8))}px`;
  updateOverlayState();
}

function askText(title, defaultValue = '') {
  return new Promise((resolve) => {
    const modal = els.promptModal;
    if (!modal) { resolve(null); return; }
    els.promptTitle.textContent = title;
    els.promptInput.value = defaultValue;
    modal.hidden = false;
    els.promptInput.focus();
    const cleanup = (value) => {
      modal.hidden = true;
      els.promptOk.removeEventListener('click', okHandler);
      els.promptCancel.removeEventListener('click', cancelHandler);
      els.promptInput.removeEventListener('keydown', keyHandler);
      resolve(value);
    };
    const okHandler = () => cleanup(els.promptInput.value.trim());
    const cancelHandler = () => cleanup(null);
    const keyHandler = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); cleanup(els.promptInput.value.trim()); }
      if (e.key === 'Escape') { e.preventDefault(); cleanup(null); }
    };
    els.promptOk.addEventListener('click', okHandler);
    els.promptCancel.addEventListener('click', cancelHandler);
    els.promptInput.addEventListener('keydown', keyHandler);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/* ---------------------------------------------------------------- Tabs */

function createTabNode(tab) {
  const node = document.createElement('div');
  node.className = 'tab';
  node.dataset.id = tab.id;
  node.setAttribute('role', 'tab');
  node.setAttribute('aria-selected', 'false');
  node.draggable = true;
  node.innerHTML = `
    <img class="tab__favicon" alt="" draggable="false" hidden />
    <span class="tab__fallback" aria-hidden="true"></span>
    <span class="tab__spinner" aria-hidden="true"></span>
    <span class="tab__title"></span>
    <button class="tab__audio" type="button" aria-label="Tab stummschalten" title="Tab stummschalten" hidden>
      <svg class="tab__audio-on" viewBox="0 0 20 20" width="13" height="13" aria-hidden="true">
        <path d="M4 8v4h3l4 3V5L7 8H4zM14 7.5a4 4 0 0 1 0 5M15.8 5.5a6.5 6.5 0 0 1 0 9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <svg class="tab__audio-off" viewBox="0 0 20 20" width="13" height="13" aria-hidden="true">
        <path d="M4 8v4h3l4 3V5L7 8H4zM14 8l4 4M18 8l-4 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <button class="tab__close" type="button" aria-label="Tab schließen" title="Tab schließen">
      <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
        <path d="M3 3l6 6M9 3L3 9" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
      </svg>
    </button>
  `;

  node.addEventListener('click', (event) => {
    if (event.target.closest('.tab__close')) {
      api.closeTab(tab.id);
      return;
    }
    if (event.target.closest('.tab__audio')) {
      event.stopPropagation();
      const current = state.tabs.find((entry) => entry.id === tab.id);
      api.commandTab(tab.id, current?.muted ? 'unmute' : 'mute');
      return;
    }
    api.activateTab(tab.id);
  });

  node.addEventListener('auxclick', (event) => {
    if (event.button === 1) {
      event.preventDefault();
      api.closeTab(tab.id);
    }
  });

  node.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    openTabContextMenu(tab.id, event.clientX, event.clientY);
  });

  node.addEventListener('dragstart', (event) => {
    if (event.target.closest('button')) {
      event.preventDefault();
      return;
    }
    draggedTabId = tab.id;
    node.classList.add('is-dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', tab.id);
  });

  node.addEventListener('dragover', (event) => {
    if (!draggedTabId || draggedTabId === tab.id) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    clearDropIndicators();
    const rect = node.getBoundingClientRect();
    const after = document.body.dataset.tabLayout === 'vertical'
      ? event.clientY > rect.top + rect.height / 2
      : event.clientX > rect.left + rect.width / 2;
    node.classList.add(after ? 'is-drop-after' : 'is-drop-before');
    node.dataset.dropAfter = String(after);
  });

  node.addEventListener('drop', (event) => {
    event.preventDefault();
    if (!draggedTabId || draggedTabId === tab.id) return;

    const dragged = state.tabs.find((entry) => entry.id === draggedTabId);
    const target = state.tabs.find((entry) => entry.id === tab.id);
    if (target && dragged && target.groupId !== dragged.groupId && !target.pinned) {
      api.setTabGroup(draggedTabId, target.groupId);
    }

    const after = node.dataset.dropAfter === 'true';
    const remaining = state.tabs.filter((entry) => entry.id !== draggedTabId);
    const targetIndex = remaining.findIndex((entry) => entry.id === tab.id);
    if (targetIndex >= 0) api.moveTab(draggedTabId, targetIndex + (after ? 1 : 0));
    finishTabDrag();
  });

  node.addEventListener('dragend', finishTabDrag);

  return node;
}

function updateTabNode(node, tab) {
  const active = tab.id === state.activeId;
  node.classList.toggle('is-active', active);
  node.classList.toggle('is-loading', Boolean(tab.loading));
  node.classList.toggle('is-pinned', Boolean(tab.pinned));
  node.setAttribute('aria-selected', String(active));
  node.title = tab.title || 'Neuer Tab';

  node.querySelector('.tab__title').textContent = tab.title || 'Neuer Tab';

  const audio = node.querySelector('.tab__audio');
  audio.hidden = !tab.audible && !tab.muted;
  audio.classList.toggle('is-muted', Boolean(tab.muted));
  audio.title = tab.muted ? 'Stummschaltung aufheben' : 'Tab stummschalten';
  audio.setAttribute('aria-label', audio.title);

  const icon = tab.favicon && /^(https?:|data:image\/)/i.test(tab.favicon) ? tab.favicon : '';
  const img = node.querySelector('.tab__favicon');
  const fallback = node.querySelector('.tab__fallback');

  if (icon) {
    if (img.getAttribute('src') !== icon) img.setAttribute('src', icon);
    img.hidden = false;
    fallback.hidden = true;
  } else {
    img.hidden = true;
    img.removeAttribute('src');
    fallback.hidden = false;
    const title = (tab.title || 'J').trim();
    fallback.textContent = title ? title[0].toUpperCase() : 'J';
  }
}

function getGroupColor(group) {
  return GROUP_COLORS[group?.color] || GROUP_COLORS.blue;
}

function getNextGroupColor() {
  const groups = appSettings.tabGroups || [];
  const counts = {};
  for (const g of groups) counts[g.color] = (counts[g.color] || 0) + 1;
  return GROUP_COLOR_ORDER.sort((a, b) => (counts[a] || 0) - (counts[b] || 0))[0] || 'blue';
}

function createGroupHeader(group, tabCount) {
  const node = document.createElement('div');
  node.className = 'tab-group';
  node.dataset.groupId = group.id;
  node.draggable = false;
  node.innerHTML = `
    <button class="tab-group__toggle" type="button" aria-label="Gruppe einklappen">
      <svg class="tab-group__chevron" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
        <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <span class="tab-group__dot" aria-hidden="true"></span>
    <span class="tab-group__name"></span>
    <span class="tab-group__count" aria-hidden="true"></span>
    <button class="tab-group__menu" type="button" aria-label="Gruppen-Menü">
      <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
        <circle cx="8" cy="4" r="1.4" fill="currentColor" />
        <circle cx="8" cy="8" r="1.4" fill="currentColor" />
        <circle cx="8" cy="12" r="1.4" fill="currentColor" />
      </svg>
    </button>
  `;

  const dot = node.querySelector('.tab-group__dot');
  dot.style.backgroundColor = getGroupColor(group);
  dot.style.boxShadow = `0 0 10px color-mix(in srgb, ${getGroupColor(group)} 60%, transparent)`;

  node.querySelector('.tab-group__name').textContent = group.name;
  node.querySelector('.tab-group__count').textContent = String(tabCount);

  node.classList.toggle('is-collapsed', Boolean(group.collapsed));

  node.querySelector('.tab-group__toggle').addEventListener('click', () => {
    const current = (appSettings.tabGroups || []).find((g) => g.id === group.id);
    api.updateTabGroup(group.id, { collapsed: !(current?.collapsed) });
  });

  node.querySelector('.tab-group__menu').addEventListener('click', (event) => {
    event.stopPropagation();
    openGroupContextMenu(group.id, event.clientX, event.clientY);
  });

  node.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    openGroupContextMenu(group.id, event.clientX, event.clientY);
  });

  node.addEventListener('dragover', (event) => {
    if (!draggedTabId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    node.classList.add('is-drop-target');
  });

  node.addEventListener('dragleave', () => {
    node.classList.remove('is-drop-target');
  });

  node.addEventListener('drop', (event) => {
    event.preventDefault();
    node.classList.remove('is-drop-target');
    if (!draggedTabId) return;
    api.setTabGroup(draggedTabId, group.id);
    finishTabDrag();
  });

  return node;
}

function updateGroupHeader(node, group, tabCount) {
  node.classList.toggle('is-collapsed', Boolean(group.collapsed));
  node.querySelector('.tab-group__name').textContent = group.name;
  node.querySelector('.tab-group__count').textContent = String(tabCount);
  const dot = node.querySelector('.tab-group__dot');
  dot.style.backgroundColor = getGroupColor(group);
  dot.style.boxShadow = `0 0 10px color-mix(in srgb, ${getGroupColor(group)} 60%, transparent)`;
}

function renderTabs() {
  const seenTabs = new Set();
  const seenGroups = new Set();

  // Gruppen-Definitionen aktualisieren
  const groups = (appSettings.tabGroups || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));

  state.tabs.forEach((tab) => {
    seenTabs.add(tab.id);
    let node = tabNodes.get(tab.id);

    if (!node) {
      node = createTabNode(tab);
      tabNodes.set(tab.id, node);
    }

    updateTabNode(node, tab);
  });

  for (const [id, node] of tabNodes) {
    if (!seenTabs.has(id)) {
      node.remove();
      tabNodes.delete(id);
    }
  }

  for (const [id, node] of groupNodes) {
    if (!groups.some((g) => g.id === id)) {
      node.remove();
      groupNodes.delete(id);
    }
  }

  // Sichtbare Reihenfolge aufbauen: angepinnt → Gruppen → ungruppiert
  const pinned = state.tabs.filter((t) => t.pinned);
  const ungrouped = state.tabs.filter((t) => !t.pinned && !t.groupId);

  const orderedNodes = [];

  for (const tab of pinned) {
    orderedNodes.push({ type: 'tab', id: tab.id });
  }

  for (const group of groups) {
    const groupTabs = state.tabs.filter((t) => !t.pinned && t.groupId === group.id);
    if (groupTabs.length === 0) continue;
    seenGroups.add(group.id);
    orderedNodes.push({ type: 'group', id: group.id, tabCount: groupTabs.length });
    if (!group.collapsed) {
      for (const tab of groupTabs) {
        orderedNodes.push({ type: 'tab', id: tab.id });
      }
    }
  }

  for (const tab of ungrouped) {
    orderedNodes.push({ type: 'tab', id: tab.id });
  }

  // DOM-Elemente in der berechneten Reihenfolge einfügen
  let currentIndex = 0;
  for (const item of orderedNodes) {
    if (item.type === 'group') {
      let node = groupNodes.get(item.id);
      const group = groups.find((g) => g.id === item.id);
      if (!node) {
        node = createGroupHeader(group, item.tabCount);
        groupNodes.set(item.id, node);
        els.tabs.appendChild(node);
      } else {
        updateGroupHeader(node, group, item.tabCount);
      }
      const current = els.tabs.children[currentIndex];
      if (current !== node) els.tabs.insertBefore(node, current || null);
      currentIndex++;
    } else {
      const node = tabNodes.get(item.id);
      if (!node) continue;
      const current = els.tabs.children[currentIndex];
      if (current !== node) els.tabs.insertBefore(node, current || null);
      currentIndex++;
    }
  }

  // Tabs in eingeklappten Gruppen ausblenden
  for (const tab of state.tabs) {
    const node = tabNodes.get(tab.id);
    if (!node) continue;
    const group = groups.find((g) => g.id === tab.groupId);
    const collapsed = Boolean(group?.collapsed);
    node.hidden = collapsed;
    node.classList.toggle('is-collapsed-group', collapsed);
  }
}

/* ------------------------------------------------------------- Toolbar */

function renderToolbar() {
  const active = getActive();

  els.back.disabled = !active?.canGoBack;
  els.forward.disabled = !active?.canGoForward;
  els.reload.classList.toggle('is-loading', Boolean(active?.loading));
  els.reload.title = active?.loading ? 'Laden stoppen' : 'Neu laden (Ctrl+R)';
  els.reload.setAttribute('aria-label', active?.loading ? 'Laden stoppen' : 'Neu laden');

  const zoom = Number(active?.zoom) || 1;
  els.zoomReset.hidden = Math.abs(zoom - 1) < 0.01;
  els.zoomReset.textContent = `${Math.round(zoom * 100)} %`;
  updateFavoriteToggle();
}

function updateBadge(url) {
  if (!url) {
    els.badge.className = 'omnibox__badge is-hidden';
    return;
  }

  if (url.startsWith('https://')) {
    els.badge.className = 'omnibox__badge';
    els.badge.title = 'Sichere Verbindung (HTTPS)';
  } else if (url.startsWith('http://')) {
    els.badge.className = 'omnibox__badge is-insecure';
    els.badge.title = 'Unverschlüsselte Verbindung (HTTP)';
  } else {
    els.badge.className = 'omnibox__badge is-hidden';
  }
}

function syncOmnibox(force = false) {
  if (!force && document.activeElement === els.omnibox && omniboxDirty) return;

  const active = getActive();
  const url = active?.url || '';
  els.omnibox.value = url;
  updateBadge(url);
}

function render(forceOmnibox = false) {
  renderTabs();
  renderToolbar();
  syncOmnibox(forceOmnibox);
}

/* ---------------------------------------------------------------- Theme */

const DEFAULT_THEME = {
  accent: '#7c6cff',
  accentAlt: '#22d3ee',
  bg: '#0b0d17',
  text: '#e7e9f5',
  textDim: '#8b90ab',
  stroke: 9,
  shadow: 34,
  saturation: 160,
  font: 'system',
  fontSize: 100,
  wallpaper: '',
  glass: 0.7,
  blur: 22,
  radius: 12,
  style: 'default',
  bgAnimation: 'constellation',
  animationSpeed: 100,
  animationIntensity: 55,
  glowIntensity: 50,
  transitionSpeed: 100,
  borderStyle: 'default',
  cursorEffect: 'none',
  cursorColor: '#7c6cff',
  cursorSize: 16,
  cursorIntensity: 60,
  cursorImage: '',
  cursorPreset: '',
  customCssChrome: '',
  customCssNewtab: ''
};

const THEME_STYLES = ['default', 'clean', 'animated', 'gaming', 'minimal'];
const THEME_FONTS = ['system', 'mono'];
const BORDER_STYLES = ['default', 'thin', 'glow', 'none'];
const CURSOR_EFFECTS = ['none', 'trail', 'sparks', 'comet', 'ripple', 'laser', 'bubbles'];

// Hintergründe kommen aus src/shared/backgrounds.js (eine Quelle für UI, Startseite und Validierung).
const BG_ANIMATIONS = window.JTechBackgrounds?.LIST || [{ id: 'none', name: 'Ruhig', description: '' }];

// Presets setzen alle Werte außer eigenem CSS und Cursor-Bild.
const preset = (id, name, overrides) => ({ id, name, theme: { ...DEFAULT_THEME, ...overrides } });

const PRESETS = [
  preset('nova', 'Nova', {}),
  preset('synthwave', 'Synthwave', {
    accent: '#ff3d9a', accentAlt: '#ffb86b', bg: '#140a24', text: '#f6e9ff', textDim: '#a98fc0',
    style: 'gaming', bgAnimation: 'synthwave', glowIntensity: 75, glass: 0.66, blur: 20, radius: 10,
    borderStyle: 'glow', saturation: 180, animationIntensity: 60, cursorEffect: 'trail', cursorColor: '#ff3d9a'
  }),
  preset('toxic', 'Toxic', {
    accent: '#39ff88', accentAlt: '#00e5ff', bg: '#060d0a', text: '#e6fff1', textDim: '#7fa894',
    style: 'gaming', bgAnimation: 'hexgrid', glowIntensity: 70, radius: 6, borderStyle: 'glow',
    animationIntensity: 60, cursorEffect: 'sparks', cursorColor: '#39ff88'
  }),
  preset('inferno', 'Inferno', {
    accent: '#ff5a1f', accentAlt: '#ffc23d', bg: '#100806', text: '#fdeee6', textDim: '#a8877a',
    style: 'animated', bgAnimation: 'embers', glowIntensity: 60, radius: 10, animationIntensity: 60,
    cursorColor: '#ff5a1f'
  }),
  preset('hyperdrive', 'Hyperdrive', {
    accent: '#4cc9ff', accentAlt: '#c77dff', bg: '#05060d', text: '#e8f3ff', textDim: '#8494ad',
    style: 'gaming', bgAnimation: 'hyperdrive', glowIntensity: 65, radius: 8, borderStyle: 'glow',
    cursorEffect: 'comet', cursorColor: '#4cc9ff'
  }),
  preset('abyss', 'Abyss', {
    accent: '#00e0c6', accentAlt: '#3aa0ff', bg: '#04121a', text: '#e2f6f7', textDim: '#7fa2aa',
    bgAnimation: 'flowfield', glowIntensity: 45, radius: 14, animationIntensity: 50, cursorColor: '#00e0c6'
  }),
  preset('sakura', 'Sakura', {
    accent: '#ff8fb8', accentAlt: '#b69cff', bg: '#150d14', text: '#fbeef4', textDim: '#ab8f9f',
    style: 'clean', bgAnimation: 'nebula', glowIntensity: 40, radius: 16, animationIntensity: 55,
    cursorColor: '#ff8fb8'
  }),
  preset('forest', 'Forest', {
    accent: '#6fcf97', accentAlt: '#d4e79e', bg: '#0a120e', text: '#e8f2ea', textDim: '#8aa394',
    style: 'clean', bgAnimation: 'ribbons', glowIntensity: 30, radius: 14, animationSpeed: 70,
    animationIntensity: 45, cursorColor: '#6fcf97'
  }),
  preset('graphite', 'Graphite', {
    accent: '#a5b4cb', accentAlt: '#6b7a90', bg: '#101113', text: '#e4e6ea', textDim: '#878b94',
    style: 'minimal', bgAnimation: 'none', glowIntensity: 15, radius: 8, glass: 0.8, blur: 16,
    borderStyle: 'thin', shadow: 20, saturation: 120, transitionSpeed: 80, cursorColor: '#a5b4cb'
  }),
  preset('paper', 'Paper', {
    accent: '#3b5bfd', accentAlt: '#12b5a6', bg: '#eef0f5', text: '#1b1f2a', textDim: '#5d6475',
    style: 'clean', bgAnimation: 'constellation', glowIntensity: 20, radius: 12, glass: 0.72, blur: 18,
    stroke: 12, shadow: 14, saturation: 130, animationIntensity: 35, cursorColor: '#3b5bfd'
  }),
  preset('daylight', 'Daylight', {
    accent: '#e4572e', accentAlt: '#f3a712', bg: '#f6efe5', text: '#2a2118', textDim: '#6f6253',
    bgAnimation: 'ribbons', glowIntensity: 20, radius: 14, glass: 0.74, stroke: 12, shadow: 16,
    saturation: 130, animationIntensity: 35, animationSpeed: 70, cursorColor: '#e4572e'
  })
];

// Diese Werte gehören dem Nutzer und bleiben beim Wechsel des Presets erhalten.
const PERSONAL_THEME_KEYS = ['customCssChrome', 'customCssNewtab', 'cursorImage'];

const COLOR_CONTROLS = [
  { key: 'accent', swatch: 'themeAccent', hex: 'themeAccentHex' },
  { key: 'accentAlt', swatch: 'themeAccentAlt', hex: 'themeAccentAltHex' },
  { key: 'bg', swatch: 'themeBg', hex: 'themeBgHex' },
  { key: 'text', swatch: 'themeText', hex: 'themeTextHex' },
  { key: 'cursorColor', swatch: 'themeCursorColor', hex: 'themeCursorColorHex' }
];

// Regler: Wert im Theme <-> Wert des Range-Inputs (glass wird in % angezeigt).
const THEME_SLIDERS = [
  { key: 'animationSpeed', input: 'theme-animation-speed', output: 'animation-speed-value', min: 0, max: 200, unit: '%' },
  { key: 'animationIntensity', input: 'theme-animation-intensity', output: 'animation-intensity-value', min: 0, max: 100, unit: '%' },
  { key: 'glass', input: 'theme-glass', output: 'glass-value', min: 20, max: 95, unit: '%', scale: 100 },
  { key: 'blur', input: 'theme-blur', output: 'blur-value', min: 0, max: 60, unit: 'px' },
  { key: 'radius', input: 'theme-radius', output: 'radius-value', min: 0, max: 28, unit: 'px' },
  { key: 'glowIntensity', input: 'theme-glow-intensity', output: 'glow-intensity-value', min: 0, max: 100, unit: '%' },
  { key: 'fontSize', input: 'theme-font-size', output: 'font-size-value', min: 80, max: 125, unit: '%' },
  { key: 'cursorIntensity', input: 'theme-cursor-intensity', output: 'cursor-intensity-value', min: 0, max: 100, unit: '%' },
  { key: 'cursorSize', input: 'theme-cursor-size', output: 'cursor-size-value', min: 2, max: 40, unit: 'px' },
  { key: 'stroke', input: 'theme-stroke', output: 'stroke-value', min: 0, max: 30, unit: '%' },
  { key: 'shadow', input: 'theme-shadow', output: 'shadow-value', min: 0, max: 80, unit: '%' },
  { key: 'saturation', input: 'theme-saturation', output: 'saturation-value', min: 100, max: 300, unit: '%' },
  { key: 'transitionSpeed', input: 'theme-transition-speed', output: 'transition-speed-value', min: 0, max: 200, unit: '%' }
].map((slider) => ({
  ...slider,
  inputEl: document.getElementById(slider.input),
  outputEl: document.getElementById(slider.output)
}));

const THEME_SEGMENTS = [
  { key: 'style', el: 'themeStyle', allowed: THEME_STYLES },
  { key: 'font', el: 'themeFont', allowed: THEME_FONTS },
  { key: 'borderStyle', el: 'themeBorderStyle', allowed: BORDER_STYLES }
];

const clamp = (value, min, max, fallback) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

function normalizeHex(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toLowerCase();
  }
  return null;
}

function hexToRgb(hex) {
  const normalized = normalizeHex(hex) || DEFAULT_THEME.bg;
  return [
    parseInt(normalized.slice(1, 3), 16),
    parseInt(normalized.slice(3, 5), 16),
    parseInt(normalized.slice(5, 7), 16)
  ];
}

function lighten(rgb, amount) {
  return rgb.map((channel) => Math.round(channel + (255 - channel) * amount));
}

let theme = { ...DEFAULT_THEME };

function applyTheme(input) {
  if (!input || typeof input !== 'object') return;

  const accent = normalizeHex(input.accent) || DEFAULT_THEME.accent;
  const accentAlt = normalizeHex(input.accentAlt) || DEFAULT_THEME.accentAlt;
  const bg = normalizeHex(input.bg) || DEFAULT_THEME.bg;
  const text = normalizeHex(input.text) || DEFAULT_THEME.text;
  const textDim = normalizeHex(input.textDim) || DEFAULT_THEME.textDim;
  const glass = Math.round(clamp(input.glass, 0.2, 0.95, DEFAULT_THEME.glass) * 100) / 100;
  const blur = Math.round(clamp(input.blur, 0, 60, DEFAULT_THEME.blur));
  const radius = Math.round(clamp(input.radius, 0, 28, DEFAULT_THEME.radius));
  const stroke = Math.round(clamp(input.stroke, 0, 30, DEFAULT_THEME.stroke));
  const shadow = Math.round(clamp(input.shadow, 0, 80, DEFAULT_THEME.shadow));
  const saturation = Math.round(clamp(input.saturation, 100, 300, DEFAULT_THEME.saturation));
  const font = typeof input.font === 'string' && input.font ? input.font : DEFAULT_THEME.font;
  const fontSize = Math.round(clamp(input.fontSize, 80, 125, DEFAULT_THEME.fontSize));
  const wallpaper = typeof input.wallpaper === 'string' ? input.wallpaper : DEFAULT_THEME.wallpaper;

  // Neue Stil-Aspekte
  const style = typeof input.style === 'string' && input.style ? input.style : DEFAULT_THEME.style;
  const bgAnimation = typeof input.bgAnimation === 'string' && input.bgAnimation ? input.bgAnimation : DEFAULT_THEME.bgAnimation;
  const animationSpeed = Math.round(clamp(input.animationSpeed, 0, 200, DEFAULT_THEME.animationSpeed));
  const animationIntensity = Math.round(clamp(input.animationIntensity, 0, 100, DEFAULT_THEME.animationIntensity));
  const glowIntensity = Math.round(clamp(input.glowIntensity, 0, 100, DEFAULT_THEME.glowIntensity));
  const transitionSpeed = Math.round(clamp(input.transitionSpeed, 0, 200, DEFAULT_THEME.transitionSpeed));
  const borderStyle = typeof input.borderStyle === 'string' && input.borderStyle ? input.borderStyle : DEFAULT_THEME.borderStyle;

  const rootStyle = document.documentElement.style;
  const rgb = hexToRgb(bg);
  const lightBg = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255 > 0.55;
  // Helle Themes nur leicht abdunkeln, sonst wird die Titelleiste grau.
  const darker = rgb.map((channel) => Math.round(channel * (lightBg ? 0.95 : 0.7)));
  const textRgb = hexToRgb(text);

  rootStyle.setProperty('--accent', accent);
  rootStyle.setProperty('--accent-alt', accentAlt);
  rootStyle.setProperty('--bg', bg);
  rootStyle.setProperty('--text', text);
  rootStyle.setProperty('--text-dim', textDim);
  rootStyle.setProperty('--text-faint', `rgba(${textRgb.join(', ')}, 0.5)`);

  rootStyle.setProperty('--glass', `rgba(${rgb.join(', ')}, ${glass})`);
  rootStyle.setProperty('--glass-strong', `rgba(${rgb.join(', ')}, ${Math.min(0.96, glass + 0.14).toFixed(3)})`);
  rootStyle.setProperty('--chrome-top', `rgba(${lighten(rgb, 0.12).join(', ')}, ${Math.min(0.94, glass + 0.14).toFixed(3)})`);
  rootStyle.setProperty('--chrome-bottom', `rgba(${darker.join(', ')}, ${Math.min(0.97, glass + 0.24).toFixed(3)})`);
  rootStyle.setProperty('--panel', `rgba(${textRgb.join(', ')}, ${Math.max(0.03, glass * 0.06).toFixed(3)})`);
  rootStyle.setProperty('--panel-hover', `rgba(${textRgb.join(', ')}, ${Math.max(0.06, glass * 0.09).toFixed(3)})`);
  rootStyle.setProperty('--glass-hover', `rgba(${textRgb.join(', ')}, ${Math.max(0.04, glass * 0.07).toFixed(3)})`);
  rootStyle.setProperty('--glass-active', `rgba(${textRgb.join(', ')}, ${Math.max(0.07, glass * 0.11).toFixed(3)})`);

  rootStyle.setProperty('--stroke', `rgba(${textRgb.join(', ')}, ${(stroke / 100).toFixed(3)})`);
  rootStyle.setProperty('--stroke-strong', `rgba(${textRgb.join(', ')}, ${Math.min(0.35, stroke / 100 + 0.08).toFixed(3)})`);
  rootStyle.setProperty('--stroke-accent', `color-mix(in srgb, var(--accent) ${Math.min(80, stroke + 30)}%, transparent)`);

  rootStyle.setProperty('--blur', `${blur}px`);
  rootStyle.setProperty('--radius', `${radius}px`);
  rootStyle.setProperty('--radius-sm', `${Math.max(3, Math.round(radius * 0.68))}px`);
  rootStyle.setProperty('--radius-lg', `${Math.max(6, Math.round(radius * 1.6))}px`);
  rootStyle.setProperty('--radius-xl', `${Math.max(10, Math.round(radius * 2.2))}px`);

  rootStyle.setProperty('--shadow-soft', `0 20px 60px rgba(0, 0, 0, ${(shadow / 100).toFixed(3)})`);
  rootStyle.setProperty('--shadow-tab', `0 4px 16px rgba(0, 0, 0, ${(shadow / 100 * 0.6).toFixed(3)})`);
  rootStyle.setProperty('--shadow-glow', `0 0 ${Math.max(20, 30 * glowIntensity / 50)}px color-mix(in srgb, var(--accent) ${Math.min(50, glowIntensity)}%, transparent)`);
  rootStyle.setProperty('--glow-intensity', `${glowIntensity}`);

  rootStyle.setProperty('--font', font === 'mono' ? 'var(--font-mono)' : 'var(--font-base)');
  rootStyle.setProperty('--font-scale', `${fontSize / 100}`);
  rootStyle.setProperty('--saturation', `${saturation}%`);

  // Animationsgeschwindigkeit und -intensität als CSS-Variablen
  const speedFactor = transitionSpeed / 100;
  const animFactor = animationSpeed / 100;
  rootStyle.setProperty('--transition-fast', `${Math.max(0.05, 0.12 * speedFactor).toFixed(3)}s ease`);
  rootStyle.setProperty('--transition-normal', `${Math.max(0.08, 0.2 * speedFactor).toFixed(3)}s cubic-bezier(0.2, 0.7, 0.2, 1)`);
  rootStyle.setProperty('--transition-slow', `${Math.max(0.12, 0.35 * speedFactor).toFixed(3)}s cubic-bezier(0.2, 0.7, 0.2, 1)`);
  rootStyle.setProperty('--anim-speed', `${animFactor}`);
  rootStyle.setProperty('--anim-intensity', `${animationIntensity}`);

  // Style-Klassen verwalten
  document.body.classList.remove('style-default', 'style-clean', 'style-animated', 'style-gaming', 'style-minimal');
  document.body.classList.add(`style-${style}`);

  document.body.classList.remove('border-default', 'border-thin', 'border-glow', 'border-none');
  document.body.classList.add(`border-${borderStyle}`);

  // Helle Themes: Formularelemente und Scrollbalken passend darstellen.
  document.body.classList.toggle('theme-light', lightBg);
  document.documentElement.style.colorScheme = lightBg ? 'light' : 'dark';

  // Hintergrund: Bild hat Vorrang, sonst Canvas-Animation (src/shared/backgrounds.js).
  document.body.classList.toggle('has-wallpaper', Boolean(wallpaper));
  document.body.style.backgroundImage = wallpaper ? `url(${JSON.stringify(wallpaper)})` : '';
  document.body.style.backgroundSize = wallpaper ? 'cover' : '';
  document.body.style.backgroundPosition = wallpaper ? 'center' : '';
  window.JTechBackgrounds?.attach(document.querySelector('.backdrop'), {
    ...backgroundOptions({ accent, accentAlt, bg, text, bgAnimation, animationSpeed, animationIntensity, glowIntensity }),
    paused: backdropPaused(),
    hidden: Boolean(wallpaper)
  });

  let customStyle = document.getElementById('jtech-custom-css');
  if (!customStyle) {
    customStyle = document.createElement('style');
    customStyle.id = 'jtech-custom-css';
    document.head.appendChild(customStyle);
  }
  customStyle.textContent = theme.customCssChrome || '';

  // Custom Cursor (Farbe wird aus cursorColor abgeleitet)
  const cursorValue = theme.cursorPreset
    ? buildCursorImage(theme.cursorPreset, theme.cursorColor)
    : (typeof theme.cursorImage === 'string' ? theme.cursorImage : '');
  theme.cursorImage = cursorValue || '';
  document.documentElement.style.cursor = cursorValue || '';
  let cursorStyle = document.getElementById('jtech-cursor-style');
  if (!cursorStyle) {
    cursorStyle = document.createElement('style');
    cursorStyle.id = 'jtech-cursor-style';
    document.head.appendChild(cursorStyle);
  }
  cursorStyle.textContent = cursorValue ? ('* { cursor: ' + cursorValue + ' !important; }') : '';

  // Cursor-Effekte im Browser-Interface
  if (window.JTechCursorEffects) {
    window.JTechCursorEffects.apply({
      effect: typeof input.cursorEffect === 'string' ? input.cursorEffect : DEFAULT_THEME.cursorEffect,
      color: normalizeHex(input.cursorColor) || accent,
      colorAlt: accentAlt,
      size: Math.round(clamp(input.cursorSize, 2, 40, DEFAULT_THEME.cursorSize)),
      intensity: Math.round(clamp(input.cursorIntensity, 0, 100, DEFAULT_THEME.cursorIntensity))
    });
  }
}

/** Optionen für JTechBackgrounds aus einem Theme. */
function backgroundOptions(source, id = source.bgAnimation) {
  return {
    id,
    accent: source.accent,
    accentAlt: source.accentAlt,
    bg: source.bg,
    text: source.text,
    intensity: clamp(source.animationIntensity, 0, 100, DEFAULT_THEME.animationIntensity) / 100,
    glow: clamp(source.glowIntensity, 0, 100, DEFAULT_THEME.glowIntensity) / 100,
    speed: clamp(source.animationSpeed, 0, 200, DEFAULT_THEME.animationSpeed) / 100,
    fps: 30
  };
}

// Gaming-Modus pausiert die Hintergrund-Animation des Interfaces.
// Fenster im Hintergrund (z. B. während eines Spiels): Animation ebenfalls anhalten.
let backgroundPaused = false;
let windowHasFocus = true;

function backdropPaused() {
  return backgroundPaused || !windowHasFocus;
}

function setBackgroundPaused(paused) {
  backgroundPaused = Boolean(paused);
  document.querySelector('.backdrop')?.__jtechBackground?.setPaused(backdropPaused());
}

function setWindowFocus(focused) {
  windowHasFocus = Boolean(focused);
  document.querySelector('.backdrop')?.__jtechBackground?.setPaused(backdropPaused());
}

/** Gedämpfte Textfarbe aus Text und Hintergrund mischen. */
function deriveTextDim(text, bg) {
  const a = hexToRgb(text);
  const b = hexToRgb(bg);
  return `#${a.map((channel, i) => Math.round(channel * 0.6 + b[i] * 0.4).toString(16).padStart(2, '0')).join('')}`;
}

function formatSlider(slider, value) {
  const shown = slider.scale ? Math.round(value * slider.scale) : Math.round(value);
  return `${shown} ${slider.unit}`;
}

function updateOutputs() {
  for (const slider of THEME_SLIDERS) {
    if (slider.outputEl) slider.outputEl.textContent = formatSlider(slider, theme[slider.key]);
  }
}

function syncSegment(container, value) {
  if (!container) return;
  for (const button of container.querySelectorAll('.ds-seg')) {
    const selected = button.dataset.value === value;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  }
}

function syncThemeInputs({ preserveFocus = false } = {}) {
  const active = document.activeElement;
  const keep = (element) => preserveFocus && active === element;

  for (const control of COLOR_CONTROLS) {
    const value = theme[control.key];
    const swatch = els[control.swatch];
    const hex = els[control.hex];
    if (swatch && !keep(swatch)) swatch.value = value;
    if (hex && !keep(hex)) {
      hex.value = value.toUpperCase();
      hex.removeAttribute('aria-invalid');
    }
  }

  for (const slider of THEME_SLIDERS) {
    if (!slider.inputEl || keep(slider.inputEl)) continue;
    const value = slider.scale ? theme[slider.key] * slider.scale : theme[slider.key];
    slider.inputEl.value = String(Math.round(value));
  }

  for (const segment of THEME_SEGMENTS) syncSegment(els[segment.el], theme[segment.key]);

  if (!keep(els.themeWallpaper)) els.themeWallpaper.value = theme.wallpaper || '';
  if (!keep(els.themeCursorEffect)) els.themeCursorEffect.value = theme.cursorEffect || 'none';
  if (els.themeCursorImage && !keep(els.themeCursorImage)) els.themeCursorImage.value = theme.cursorPreset || '';
  if (!keep(els.themeCssChrome)) els.themeCssChrome.value = theme.customCssChrome || '';
  if (!keep(els.themeCssNewtab)) els.themeCssNewtab.value = theme.customCssNewtab || '';

  updateOutputs();
  syncBackgroundGallery();
  markActivePreset();
}

/* ------------------------------------------------- Hintergrund-Galerie */

let wallpaperMode = false;

function studioOpen() {
  return Boolean(els.studio && !els.studio.hidden);
}

function renderBackgroundGallery() {
  if (!els.bgGallery || els.bgGallery.childElementCount) return;

  const entries = [...BG_ANIMATIONS, { id: 'image', name: 'Bild', description: 'Eigenes Hintergrundbild per URL' }];
  for (const entry of entries) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ds-bg';
    button.dataset.background = entry.id;
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', 'false');
    button.title = entry.description || entry.name;
    button.innerHTML = `
      <span class="ds-bg__preview" aria-hidden="true"></span>
      <span class="ds-bg__name"></span>
    `;
    button.querySelector('.ds-bg__name').textContent = entry.name;
    if (entry.id === 'image') button.querySelector('.ds-bg__preview').classList.add('ds-bg__preview--image');

    button.addEventListener('click', () => {
      if (entry.id === 'image') {
        wallpaperMode = true;
        syncBackgroundGallery();
        els.themeWallpaper.focus();
        return;
      }
      wallpaperMode = false;
      theme.wallpaper = '';
      theme.bgAnimation = entry.id;
      commitTheme();
      syncThemeInputs({ preserveFocus: true });
    });
    els.bgGallery.appendChild(button);
  }
}

function syncBackgroundGallery() {
  if (!els.bgGallery) return;
  renderBackgroundGallery();

  const imageActive = wallpaperMode || Boolean(theme.wallpaper);
  for (const button of els.bgGallery.querySelectorAll('.ds-bg')) {
    const id = button.dataset.background;
    const selected = imageActive ? id === 'image' : id === theme.bgAnimation;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-checked', String(selected));

    const preview = button.querySelector('.ds-bg__preview');
    if (id === 'image') {
      preview.style.backgroundImage = theme.wallpaper ? `url(${JSON.stringify(theme.wallpaper)})` : '';
      preview.classList.toggle('has-image', Boolean(theme.wallpaper));
      continue;
    }
    // Live-Vorschau nur, solange das Studio offen ist.
    window.JTechBackgrounds?.attach(preview, {
      ...backgroundOptions(theme, id),
      fps: 24,
      quality: 0.6,
      paused: !studioOpen()
    });
  }

  if (els.wallpaperField) els.wallpaperField.hidden = !imageActive;
  if (els.animationControls) els.animationControls.classList.toggle('is-muted', imageActive);
  updateThemePreview();
}

function updateThemePreview() {
  const preview = els.previewBackground;
  if (!preview) return;
  preview.style.backgroundImage = theme.wallpaper ? `url(${JSON.stringify(theme.wallpaper)})` : '';
  window.JTechBackgrounds?.attach(preview, {
    ...backgroundOptions(theme),
    fps: 30,
    quality: 0.8,
    paused: !studioOpen(),
    hidden: Boolean(theme.wallpaper)
  });
}

/** Vorschau-Animationen nur bei offenem Studio laufen lassen. */
function setStudioAnimations(running) {
  const containers = [els.previewBackground, ...(els.bgGallery?.querySelectorAll('.ds-bg__preview') || [])];
  for (const container of containers) container?.__jtechBackground?.setPaused(!running);
}

/* ------------------------------------------------------------ Presets */

function themeMatches(candidate) {
  return Object.keys(DEFAULT_THEME).every((key) => {
    if (PERSONAL_THEME_KEYS.includes(key) || !(key in candidate)) return true;
    if (key === 'glass') return Math.abs(Number(candidate.glass) - theme.glass) < 0.005;
    if (typeof candidate[key] === 'number' && typeof theme[key] === 'number') {
      return Math.abs(candidate[key] - theme[key]) < 0.5;
    }
    return String(candidate[key]).toLowerCase() === String(theme[key]).toLowerCase();
  });
}

function markActivePreset() {
  const customThemes = appSettings.customThemes || [];
  for (const card of document.querySelectorAll('.ds-preset')) {
    const source = card.dataset.custom
      ? customThemes.find((entry) => entry.id === card.dataset.preset)?.theme
      : PRESETS.find((entry) => entry.id === card.dataset.preset)?.theme;
    const matches = Boolean(source) && themeMatches(source);
    card.classList.toggle('is-active', matches);
    card.setAttribute('aria-pressed', String(matches));
  }
}

function applyPresetTheme(source) {
  const personal = Object.fromEntries(PERSONAL_THEME_KEYS.map((key) => [key, theme[key]]));
  wallpaperMode = false;
  setTheme({ ...DEFAULT_THEME, ...source, ...personal });
}

function presetCard(entry, { custom = false } = {}) {
  const source = { ...DEFAULT_THEME, ...(entry.theme || {}) };
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'ds-preset';
  card.dataset.preset = entry.id;
  if (custom) card.dataset.custom = 'true';
  card.title = `Theme „${entry.name}“ anwenden`;
  card.style.setProperty('--p-bg', source.bg);
  card.style.setProperty('--p-a', source.accent);
  card.style.setProperty('--p-b', source.accentAlt);
  card.style.setProperty('--p-text', source.text);
  const background = BG_ANIMATIONS.find((item) => item.id === source.bgAnimation);
  card.innerHTML = `
    <span class="ds-preset__swatch" aria-hidden="true"><i></i><i></i></span>
    <span class="ds-preset__text">
      <span class="ds-preset__name"></span>
      <span class="ds-preset__meta"></span>
    </span>
  `;
  card.querySelector('.ds-preset__name').textContent = entry.name;
  card.querySelector('.ds-preset__meta').textContent = source.wallpaper ? 'Bild' : (background?.name || '');
  card.addEventListener('click', () => applyPresetTheme(entry.theme || {}));
  return card;
}

function renderPresets() {
  if (els.presetGrid) {
    els.presetGrid.replaceChildren(...PRESETS.map((entry) => presetCard(entry)));
  }
  renderCustomThemes();
}

function renderCustomThemes() {
  if (!els.customThemeGrid) return;
  const customThemes = appSettings.customThemes || [];
  els.customThemeGrid.replaceChildren();
  els.customThemeEmpty.hidden = customThemes.length > 0;

  for (const entry of customThemes) {
    const wrap = document.createElement('div');
    wrap.className = 'ds-preset-wrap';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'ds-preset__remove';
    remove.title = `„${entry.name}“ löschen`;
    remove.setAttribute('aria-label', `Theme ${entry.name} löschen`);
    remove.textContent = '×';
    remove.addEventListener('click', async () => {
      const next = (appSettings.customThemes || []).filter((item) => item.id !== entry.id);
      const saved = await api.saveSettings({ customThemes: next });
      if (saved) applySettings(saved, { preserveFormFocus: true });
      renderCustomThemes();
    });
    wrap.append(presetCard(entry, { custom: true }), remove);
    els.customThemeGrid.appendChild(wrap);
  }
  markActivePreset();
}

if (els.saveCustomTheme) {
  els.saveCustomTheme.addEventListener('click', () => {
    els.themeSaveForm.hidden = false;
    els.themeSaveName.value = '';
    els.themeSaveName.focus();
  });
  els.themeSaveCancel.addEventListener('click', () => { els.themeSaveForm.hidden = true; });
  els.themeSaveForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = (els.themeSaveName.value || '').trim().slice(0, 40);
    if (!name) {
      els.themeSaveName.focus();
      return;
    }
    const entry = { id: `custom-${Date.now()}`, name, theme: { ...theme } };
    const saved = await api.saveSettings({ customThemes: [...(appSettings.customThemes || []), entry] });
    if (saved) applySettings(saved, { preserveFormFocus: true });
    els.themeSaveForm.hidden = true;
    renderCustomThemes();
  });
}

/* --------------------------------------------------------- Theme speichern */

let saveTimer = null;
let pendingSave = null;

function setStatus(text, status = 'idle') {
  els.themeStatus.textContent = text;
  els.themeStatus.dataset.state = status;
}

function scheduleSave() {
  pendingSave = { ...theme };
  setStatus('Speichern …', 'saving');

  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 250);
}

async function flushSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }

  if (!pendingSave) return;
  const payload = pendingSave;
  pendingSave = null;

  try {
    const saved = await api.saveTheme(payload);
    if (saved) {
      theme = { ...theme, ...saved };
      applyTheme(theme);
      markActivePreset();
    }
    setStatus('Gespeichert', 'saved');
  } catch (error) {
    console.error('[theme] Speichern fehlgeschlagen:', error);
    setStatus('Speichern fehlgeschlagen', 'error');
  }
}

function commitTheme() {
  applyTheme(theme);
  updateOutputs();
  markActivePreset();
  scheduleSave();
}

function setTheme(next) {
  const pick = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);
  const text = normalizeHex(next.text) || DEFAULT_THEME.text;
  const bg = normalizeHex(next.bg) || DEFAULT_THEME.bg;

  theme = {
    accent: normalizeHex(next.accent) || DEFAULT_THEME.accent,
    accentAlt: normalizeHex(next.accentAlt) || DEFAULT_THEME.accentAlt,
    bg,
    text,
    textDim: normalizeHex(next.textDim) || deriveTextDim(text, bg),
    stroke: Math.round(clamp(next.stroke, 0, 30, DEFAULT_THEME.stroke)),
    shadow: Math.round(clamp(next.shadow, 0, 80, DEFAULT_THEME.shadow)),
    saturation: Math.round(clamp(next.saturation, 100, 300, DEFAULT_THEME.saturation)),
    font: pick(next.font, THEME_FONTS, DEFAULT_THEME.font),
    fontSize: Math.round(clamp(next.fontSize, 80, 125, DEFAULT_THEME.fontSize)),
    wallpaper: typeof next.wallpaper === 'string' ? next.wallpaper.trim().slice(0, 2000) : DEFAULT_THEME.wallpaper,
    glass: Math.round(clamp(next.glass, 0.2, 0.95, DEFAULT_THEME.glass) * 100) / 100,
    blur: Math.round(clamp(next.blur, 0, 60, DEFAULT_THEME.blur)),
    radius: Math.round(clamp(next.radius, 0, 28, DEFAULT_THEME.radius)),
    style: pick(next.style, THEME_STYLES, DEFAULT_THEME.style),
    bgAnimation: pick(next.bgAnimation, BG_ANIMATIONS.map((entry) => entry.id), DEFAULT_THEME.bgAnimation),
    animationSpeed: Math.round(clamp(next.animationSpeed, 0, 200, DEFAULT_THEME.animationSpeed)),
    animationIntensity: Math.round(clamp(next.animationIntensity, 0, 100, DEFAULT_THEME.animationIntensity)),
    glowIntensity: Math.round(clamp(next.glowIntensity, 0, 100, DEFAULT_THEME.glowIntensity)),
    transitionSpeed: Math.round(clamp(next.transitionSpeed, 0, 200, DEFAULT_THEME.transitionSpeed)),
    borderStyle: pick(next.borderStyle, BORDER_STYLES, DEFAULT_THEME.borderStyle),
    cursorEffect: pick(next.cursorEffect, CURSOR_EFFECTS, DEFAULT_THEME.cursorEffect),
    cursorColor: normalizeHex(next.cursorColor) || DEFAULT_THEME.cursorColor,
    cursorSize: Math.round(clamp(next.cursorSize, 2, 40, DEFAULT_THEME.cursorSize)),
    cursorIntensity: Math.round(clamp(next.cursorIntensity, 0, 100, DEFAULT_THEME.cursorIntensity)),
    cursorImage: typeof next.cursorImage === 'string' ? next.cursorImage : (theme.cursorImage || ''),
    cursorPreset: typeof next.cursorPreset === 'string' ? next.cursorPreset : (theme.cursorPreset || ''),
    customCssChrome: String(next.customCssChrome ?? theme.customCssChrome ?? '').trim().slice(0, 30000),
    customCssNewtab: String(next.customCssNewtab ?? theme.customCssNewtab ?? '').trim().slice(0, 30000)
  };

  applyTheme(theme);
  syncThemeInputs();
  scheduleSave();
}

/* ------------------------------------------------------------ App-Settings */

const DEFAULT_SEARCH_TEMPLATE = 'https://www.google.com/search?q=%s';

const SEARCH_ENGINES = [
  { id: 'google', name: 'Google' },
  { id: 'duckduckgo', name: 'DuckDuckGo' },
  { id: 'bing', name: 'Bing' },
  { id: 'ecosia', name: 'Ecosia' },
  { id: 'startpage', name: 'Startpage' },
  { id: 'brave', name: 'Brave' },
  { id: 'custom', name: 'Benutzerdefiniert' }
];

const DEFAULT_HOTKEYS = {
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
  tabSearch: ['Ctrl+Shift+A'],
  findInPage: ['Ctrl+F'],
  zoomIn: ['Ctrl+=', 'Ctrl+NumpadAdd'],
  zoomOut: ['Ctrl+-', 'Ctrl+NumpadSubtract'],
  zoomReset: ['Ctrl+0'],
  devTools: ['F12', 'Ctrl+Shift+I'],
  taskManager: ['Shift+Escape'],
  copyUrl: ['Ctrl+Shift+C']
};

const HOTKEY_ACTIONS = [
  ['newTab', 'Neuer Tab'],
  ['closeTab', 'Tab schließen'],
  ['reopenTab', 'Geschlossenen Tab wieder öffnen'],
  ['focusOmnibox', 'Adressleiste fokussieren'],
  ['tabSearch', 'Tabs suchen'],
  ['findInPage', 'Auf der Seite suchen'],
  ['reload', 'Neu laden'],
  ['hardReload', 'Hart neu laden'],
  ['back', 'Zurück'],
  ['forward', 'Vorwärts'],
  ['nextTab', 'Nächster Tab'],
  ['prevTab', 'Vorheriger Tab'],
  ['zoomIn', 'Vergrößern'],
  ['zoomOut', 'Verkleinern'],
  ['zoomReset', 'Zoom zurücksetzen'],
  ['openSettings', 'Einstellungen öffnen'],
  ['pictureInPicture', 'Picture-in-Picture'],
  ['splitView', 'Split-View umschalten'],
  ['commandPalette', 'Befehlspalette'],
  ['fullscreen', 'Vollbild'],
  ['print', 'Drucken'],
  ['taskManager', 'Ressourcen & Prozesse'],
  ['copyUrl', 'Link der Seite kopieren'],
  ['devTools', 'Entwicklertools']
];

const cloneHotkeys = (hotkeys) => Object.fromEntries(
  Object.entries(hotkeys).map(([action, accelerators]) => [action, [...accelerators]])
);

const appSettings = {
  search: { engine: 'google', urlTemplate: DEFAULT_SEARCH_TEMPLATE },
  ui: { tabLayout: 'vertical', favoritesBar: true, sidebarWidth: 252, restoreSession: true, gamingMode: false, userName: '', density: 'normal', autoSleepMinutes: 30 },
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
  privacy: { adblock: true, trackingProtection: true },
  performance: { enabled: false, cpuLimit: 50, ramLimit: 0, hardCap: true, lowPriority: false },
  hotkeys: cloneHotkeys(DEFAULT_HOTKEYS)
};

function isValidSearchTemplate(value) {
  const trimmed = String(value || '').trim();
  return /^https?:\/\/[^\s]+$/i.test(trimmed) && trimmed.includes('%s');
}

function sameUrl(a, b) {
  const normalize = (value) => String(value || '').replace(/\/+$/, '');
  return normalize(a) === normalize(b);
}

function findFavorite(url) {
  return appSettings.favorites.find((favorite) => sameUrl(favorite.url, url)) || null;
}

function applyDensity() {
  const density = appSettings.ui.density || 'normal';
  document.body.dataset.density = density;
  document.body.classList.remove('density-compact', 'density-normal', 'density-comfortable');
  document.body.classList.add(`density-${density}`);
}
function applyTabLayout(layout) {
  document.body.dataset.tabLayout = 'vertical';
  if (els.tabs.parentElement !== els.sidebarTabs) els.sidebarTabs.appendChild(els.tabs);
  applySidebarWidth();
}

function applySidebarWidth() {
  if (document.body.dataset.tabLayout !== 'vertical') {
    els.sidebar.style.width = '';
    reportLayout();
    return;
  }

  const width = Math.max(180, Math.min(460, Number(appSettings.ui.sidebarWidth) || 252));
  appSettings.ui.sidebarWidth = width;
  els.sidebar.style.width = `${width}px`;
  reportLayout();
}

/* --------------------------------------------------------------- Favoriten */

function letterIcon(favorite, className) {
  const span = document.createElement('span');
  span.className = `${className} ${className}--letter`;
  const title = (favorite.title || 'J').trim();
  span.textContent = title ? title[0].toUpperCase() : 'J';
  return span;
}

function siteIcon(favorite, className) {
  if (favorite.favicon) {
    const img = document.createElement('img');
    img.className = className;
    img.src = favorite.favicon;
    img.alt = '';
    img.draggable = false;
    img.addEventListener('error', () => {
      if (img.parentNode) img.replaceWith(letterIcon(favorite, className));
    }, { once: true });
    return img;
  }
  return letterIcon(favorite, className);
}

function closeIcon() {
  const span = document.createElement('span');
  span.innerHTML = `<svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
    <path d="M3 3l6 6M9 3L3 9" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
  </svg>`;
  return span.firstElementChild;
}

function removeFavoriteById(id) {
  api
    .removeFavorite(id)
    .then((next) => {
      if (next) applySettings(next);
    })
    .catch((error) => console.error('[favorites] Entfernen fehlgeschlagen:', error));
}

function addCurrentFavorite() {
  const active = getActive();
  const url = active?.url || '';

  if (!/^https?:\/\//i.test(url)) return;

  const existing = findFavorite(url);
  if (existing) {
    removeFavoriteById(existing.id);
    return;
  }

  api
    .addFavorite({ title: active.title, url, favicon: active.favicon })
    .then((next) => {
      if (next) applySettings(next);
    })
    .catch((error) => console.error('[favorites] Hinzufügen fehlgeschlagen:', error));
}

function updateFavoriteToggle() {
  const active = getActive();
  const url = active?.url || '';
  const available = /^https?:\/\//i.test(url);
  const favorite = available ? findFavorite(url) : null;

  els.favoriteToggle.disabled = !available;
  els.favoriteToggle.classList.toggle('is-active', Boolean(favorite));

  const title = !available
    ? 'Favoriten'
    : favorite
      ? 'Aus Favoriten entfernen'
      : 'Zu Favoriten hinzufügen';

  els.favoriteToggle.title = title;
  els.favoriteToggle.setAttribute('aria-label', title);
}

function renderFavoritesBar() {
  // Favoriten werden nur in der vertikalen Sidebar angezeigt.
  els.favorites.hidden = true;
  els.favoritesList.replaceChildren();
}

function renderSidebarLists() {
  if (!els.sidebarFavorites) return;

  const renderList = (container, items, emptyText) => {
    container.replaceChildren();
    if (!items || !items.length) {
      const empty = document.createElement('div');
      empty.className = 'sidebar__empty';
      empty.textContent = emptyText;
      container.appendChild(empty);
      return;
    }
    const fragment = document.createDocumentFragment();
    for (const item of items) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sidebar__list-item';
      button.title = item.url;

      const icon = siteIcon(item, 'sidebar__list-icon');
      const label = document.createElement('span');
      label.className = 'sidebar__list-label';
      label.textContent = item.title || item.url;

      button.append(icon, label);
      button.addEventListener('click', () => api.navigate(item.url));
      fragment.appendChild(button);
    }
    container.appendChild(fragment);
  };

  renderList(els.sidebarFavorites, appSettings.favorites, 'Keine Favoriten');

  const name = (appSettings.ui?.userName || '').trim();
  if (els.sidebarProfileName) els.sidebarProfileName.textContent = name || 'Profil';
  if (els.sidebarAvatar) els.sidebarAvatar.textContent = (name || 'J').trim().charAt(0).toUpperCase();
}

function updateProfileUI() {
  renderSidebarLists();
}
function renderSettingsFavorites() {
  els.settingsFavoritesList.replaceChildren();
  els.settingsFavoritesEmpty.hidden = appSettings.favorites.length > 0;

  const fragment = document.createDocumentFragment();

  for (const favorite of appSettings.favorites) {
    const row = document.createElement('div');
    row.className = 'fav-row';

    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'fav-row__main';
    link.append(siteIcon(favorite, 'fav-row__icon'));

    const text = document.createElement('span');
    text.className = 'fav-row__text';

    const title = document.createElement('span');
    title.className = 'fav-row__title';
    title.textContent = favorite.title;

    const url = document.createElement('span');
    url.className = 'fav-row__url';
    url.textContent = favorite.url;

    text.append(title, url);
    link.appendChild(text);
    link.addEventListener('click', () => {
      closeSettings();
      api.navigate(favorite.url);
    });

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'fav-row__remove';
    remove.title = 'Favorit entfernen';
    remove.setAttribute('aria-label', `Favorit ${favorite.title} entfernen`);
    remove.appendChild(closeIcon());
    remove.addEventListener('click', () => removeFavoriteById(favorite.id));

    row.append(link, remove);
    fragment.appendChild(row);
  }

  els.settingsFavoritesList.appendChild(fragment);
}

/* ------------------------------------------------------------ Hotkeys */

let recordingHotkey = null;

function formatAccelerator(accelerator) {
  return accelerator
    .replaceAll('NumpadAdd', 'Num +')
    .replaceAll('NumpadSubtract', 'Num −')
    .replaceAll('Arrow', '')
    .replaceAll('Left', '←')
    .replaceAll('Right', '→')
    .replaceAll('Up', '↑')
    .replaceAll('Down', '↓');
}

function setHotkeyConflict(message = '') {
  els.hotkeyConflict.textContent = message;
  els.hotkeyConflict.hidden = !message;
}

function saveHotkey(action, accelerators) {
  recordingHotkey = null;
  setHotkeyConflict();
  saveSettingsPatch({
    hotkeys: { ...cloneHotkeys(appSettings.hotkeys), [action]: accelerators }
  });
}

function renderHotkeys() {
  const fragment = document.createDocumentFragment();

  for (const [action, label] of HOTKEY_ACTIONS) {
    const row = document.createElement('div');
    row.className = 'hotkey-row';

    const name = document.createElement('span');
    name.className = 'hotkey-row__label';
    name.textContent = label;

    const binding = document.createElement('button');
    binding.type = 'button';
    binding.className = 'hotkey-row__binding';
    binding.dataset.action = action;
    const recording = recordingHotkey === action;
    binding.classList.toggle('is-recording', recording);
    binding.textContent = recording
      ? 'Kombination drücken …'
      : (appSettings.hotkeys[action] || []).map(formatAccelerator).join('  /  ') || 'Nicht belegt';
    binding.title = recording ? 'Esc zum Abbrechen' : 'Neue Tastenkombination aufnehmen';
    binding.addEventListener('click', () => {
      recordingHotkey = recordingHotkey === action ? null : action;
      setHotkeyConflict();
      renderHotkeys();
    });

    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'hotkey-row__clear';
    clear.textContent = '×';
    clear.title = 'Belegung entfernen';
    clear.setAttribute('aria-label', `${label}: Belegung entfernen`);
    clear.disabled = !(appSettings.hotkeys[action] || []).length;
    clear.addEventListener('click', () => saveHotkey(action, []));

    row.append(name, binding, clear);
    fragment.appendChild(row);
  }

  els.hotkeyList.replaceChildren(fragment);
}

function acceleratorFromEvent(event) {
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) return null;

  const modifiers = [];
  if (event.ctrlKey) modifiers.push('Ctrl');
  if (event.altKey) modifiers.push('Alt');
  if (event.shiftKey) modifiers.push('Shift');
  if (event.metaKey) modifiers.push('Meta');

  const namedKeys = {
    ' ': 'Space', ArrowLeft: 'Left', ArrowRight: 'Right', ArrowUp: 'Up', ArrowDown: 'Down',
    Escape: 'Escape', Enter: 'Enter', Tab: 'Tab', Backspace: 'Backspace', Delete: 'Delete'
  };
  let key = event.code === 'NumpadAdd' || event.code === 'NumpadSubtract'
    ? event.code
    : namedKeys[event.key] || event.key;
  if (key === '+') key = 'Plus';
  if (key.length === 1 && /[a-z]/i.test(key)) key = key.toUpperCase();

  const isFunctionKey = /^F(?:[1-9]|1[0-9]|2[0-4])$/i.test(key);
  if (!modifiers.length && !isFunctionKey) return { error: 'Bitte Strg, Alt oder eine Funktionstaste verwenden.' };
  return { accelerator: [...modifiers, key].join('+') };
}

document.addEventListener('keydown', (event) => {
  if (!recordingHotkey) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  if (event.key === 'Escape') {
    recordingHotkey = null;
    setHotkeyConflict();
    renderHotkeys();
    return;
  }
  if (event.key === 'Backspace' || event.key === 'Delete') {
    saveHotkey(recordingHotkey, []);
    return;
  }
  if (event.repeat) return;

  const result = acceleratorFromEvent(event);
  if (!result) return;
  if (result.error) {
    setHotkeyConflict(result.error);
    return;
  }

  const accelerator = result.accelerator;
  const conflict = HOTKEY_ACTIONS.find(([action]) => action !== recordingHotkey &&
    (appSettings.hotkeys[action] || []).some((entry) => entry.toLowerCase() === accelerator.toLowerCase()));

  if (conflict) {
    setHotkeyConflict(`${formatAccelerator(accelerator)} ist bereits für „${conflict[1]}“ belegt.`);
    return;
  }

  saveHotkey(recordingHotkey, [accelerator]);
}, true);

/* ------------------------------------------------------------- Erweiterungen */

let extensions = [];

function renderExtensions(list) {
  extensions = Array.isArray(list) ? list : extensions;
  els.extensionList.replaceChildren();
  els.extensionsEmpty.hidden = extensions.length > 0;

  const fragment = document.createDocumentFragment();
  for (const extension of extensions) {
    const row = document.createElement('div');
    row.className = 'extension-row';

    const main = document.createElement('div');
    main.className = 'extension-row__main';

    const name = document.createElement('span');
    name.className = 'extension-row__name';
    name.textContent = extension.name || extension.id;

    const meta = document.createElement('span');
    meta.className = 'extension-row__meta';
    meta.textContent = `${extension.version ? `v${extension.version} · ` : ''}${extension.path}`;

    main.append(name, meta);

    if (Array.isArray(extension.unsupported) && extension.unsupported.length) {
      const warning = document.createElement('span');
      warning.className = 'extension-row__warning';
      warning.textContent = `Funktioniert evtl. nicht – benötigt nicht unterstützte APIs: ${extension.unsupported.join(', ')}`;
      main.append(warning);
    }

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'fav-row__remove';
    remove.title = 'Entfernen';
    remove.setAttribute('aria-label', `Erweiterung ${extension.name} entfernen`);
    remove.appendChild(closeIcon());
    remove.addEventListener('click', async () => {
      try {
        const next = await api.removeExtension(extension.id);
        renderExtensions(next);
      } catch (error) {
        console.error('[extensions] Entfernen fehlgeschlagen:', error);
      }
    });

    row.append(main, remove);
    fragment.appendChild(row);
  }

  els.extensionList.appendChild(fragment);
  renderExtensionsMenu();
}

function renderExtensionsMenu() {
  if (!els.extensionsMenuList) return;
  els.extensionsMenuList.replaceChildren();
  els.extensionsMenuEmpty.hidden = extensions.length > 0;

  for (const extension of extensions) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'extensions-menu__item';
    const fallback = escapeHtml(extension.name ? extension.name[0].toUpperCase() : 'E');
    const icon = typeof extension.icon === 'string' && extension.icon.startsWith('data:image/')
      ? `<img class="extensions-menu__icon-img" src="${extension.icon}" alt="" />`
      : fallback;
    const badge = extension.badge
      ? `<span class="extensions-menu__badge"${/^#[0-9a-f]{3,8}$/i.test(extension.badgeColor || '') ? ` style="background:${extension.badgeColor}"` : ''}>${escapeHtml(extension.badge.slice(0, 4))}</span>`
      : '';
    row.title = extension.title || extension.name || extension.id;
    row.innerHTML = `
      <span class="extensions-menu__icon" aria-hidden="true">${icon}${badge}</span>
      <span class="extensions-menu__name">${escapeHtml(extension.name || extension.id)}</span>
    `;
    row.addEventListener('click', async () => {
      // Erst das Menü schließen: sonst holt sich die Webseite den Fokus zurück
      // und das Popup schließt sich sofort wieder.
      const anchor = (els.extensionsMenuToggle || row).getBoundingClientRect();
      closeExtensionsMenu();
      try {
        await api.openExtensionPopup(extension.id, {
          x: anchor.left,
          y: anchor.top,
          width: anchor.width,
          height: anchor.height
        });
      } catch (error) {
        console.error('[extensions] Popup fehlgeschlagen:', error);
      }
    });
    els.extensionsMenuList.appendChild(row);
  }
}

function openExtensionsMenu() {
  if (!els.extensionsMenuPanel) return;
  els.extensionsMenuPanel.hidden = false;
  els.extensionsMenuToggle?.setAttribute('aria-expanded', 'true');
  renderExtensionsMenu();
  updateOverlayState();
  // Aktuelle Badges/Titel des aktiven Tabs nachladen.
  api.listExtensions().then((list) => {
    if (!Array.isArray(list) || els.extensionsMenuPanel.hidden) return;
    extensions = list;
    renderExtensionsMenu();
  }).catch(() => {});
}

function closeExtensionsMenu() {
  if (!els.extensionsMenuPanel) return;
  els.extensionsMenuPanel.hidden = true;
  els.extensionsMenuToggle?.setAttribute('aria-expanded', 'false');
  updateOverlayState();
}

/* --------------------------------------------------------- History & Downloads */

function renderHistory() {
  const query = els.historySearch.value.trim().toLowerCase();
  const items = (appSettings.history || []).filter((entry) =>
    !query || `${entry.title || ''} ${entry.url || ''}`.toLowerCase().includes(query));

  els.historyList.replaceChildren();
  els.historyEmpty.hidden = items.length > 0;

  const fragment = document.createDocumentFragment();
  for (const entry of items) {
    const row = document.createElement('div');
    row.className = 'history-row';

    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'history-row__main';
    link.title = entry.url;
    const title = document.createElement('span');
    title.className = 'history-row__title';
    title.textContent = entry.title || entry.url;
    const url = document.createElement('span');
    url.className = 'history-row__url';
    url.textContent = entry.url;
    const time = document.createElement('span');
    time.className = 'history-row__time';
    time.textContent = new Date(entry.timestamp).toLocaleString('de-DE');
    link.append(title, url, time);
    link.addEventListener('click', () => {
      closeSettings();
      api.navigate(entry.url);
    });

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'fav-row__remove';
    remove.title = 'Entfernen';
    remove.appendChild(closeIcon());
    remove.addEventListener('click', async () => {
      await api.saveSettings({ history: (appSettings.history || []).filter((item) => item.id !== entry.id) });
    });

    row.append(link, remove);
    fragment.appendChild(row);
  }
  els.historyList.appendChild(fragment);
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function renderDownloads() {
  els.downloadList.replaceChildren();
  els.downloadsEmpty.hidden = downloads.length > 0;

  const fragment = document.createDocumentFragment();
  for (const item of downloads) {
    const row = document.createElement('div');
    row.className = 'download-row';

    const main = document.createElement('div');
    main.className = 'download-row__main';
    const name = document.createElement('span');
    name.className = 'download-row__name';
    name.textContent = item.filename || item.url;
    const meta = document.createElement('span');
    meta.className = 'download-row__meta';
    const progress = item.totalBytes > 0 ? Math.round((item.receivedBytes / item.totalBytes) * 100) : 0;
    meta.textContent = item.state === 'completed'
      ? 'Abgeschlossen'
      : item.state === 'cancelled'
        ? 'Abgebrochen'
        : `${formatBytes(item.receivedBytes)} / ${formatBytes(item.totalBytes)} (${progress} %)`;
    main.append(name, meta);

    const actions = document.createElement('div');
    actions.className = 'download-row__actions';
    if (item.state === 'progressing') {
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'btn-ghost';
      cancel.textContent = 'Abbrechen';
      cancel.addEventListener('click', () => api.cancelDownload(item.id));
      actions.appendChild(cancel);
    } else if (item.state === 'completed') {
      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'btn-ghost';
      open.textContent = 'Öffnen';
      open.addEventListener('click', () => api.openDownload(item.id));
      const folder = document.createElement('button');
      folder.type = 'button';
      folder.className = 'btn-ghost';
      folder.textContent = 'Ordner';
      folder.addEventListener('click', () => api.showDownload(item.id));
      actions.append(open, folder);
    }

    row.append(main, actions);
    fragment.appendChild(row);
  }
  els.downloadList.appendChild(fragment);
}

const BUILTIN_BANGS = [
  { trigger: 'yt', urlTemplate: 'https://www.youtube.com/results?search_query=%s' },
  { trigger: 'yt-d', urlTemplate: 'https://www.youtube.com/results?search_query=%s&sp=EgIIAQ%3D%3D' },
  { trigger: 'g', urlTemplate: 'https://www.google.com/search?q=%s' },
  { trigger: 'ddg', urlTemplate: 'https://duckduckgo.com/?q=%s' },
  { trigger: 'gh', urlTemplate: 'https://github.com/search?q=%s' }
];

function renderBangsSettings() {
  if (!els.bangsList) return;
  els.bangsList.replaceChildren();
  const all = [...BUILTIN_BANGS.map((b) => ({ ...b, builtin: true })), ...(appSettings.bangs || []).map((b) => ({ ...b, builtin: false }))];
  els.bangsEmpty.hidden = all.length > 0;
  const fragment = document.createDocumentFragment();
  for (const bang of all) {
    const row = document.createElement('div');
    row.className = 'fav-row';
    const text = document.createElement('span');
    text.className = 'fav-row__text';
    const title = document.createElement('span');
    title.className = 'fav-row__title';
    title.textContent = '!' + bang.trigger;
    const url = document.createElement('span');
    url.className = 'fav-row__url';
    url.textContent = bang.urlTemplate;
    text.append(title, url);
    const main = document.createElement('div');
    main.className = 'fav-row__main';
    main.appendChild(text);
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'fav-row__remove';
    edit.textContent = '✎';
    edit.title = 'Bearbeiten';
    edit.addEventListener('click', () => {
      els.bangsForm.hidden = false;
      els.bangsTrigger.value = bang.trigger;
      els.bangsUrl.value = bang.urlTemplate;
      els.bangsTrigger.focus();
    });

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'fav-row__remove';
    remove.textContent = '×';
    if (bang.builtin) remove.style.visibility = 'hidden';
    remove.addEventListener('click', async () => {
      if (bang.builtin) return;
      const next = (appSettings.bangs || []).filter((b) => b.trigger !== bang.trigger);
      saveSettingsPatch({ bangs: next });
    });

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '4px';
    actions.append(edit, remove);
    row.append(main, actions);
    fragment.appendChild(row);
  }
  els.bangsList.appendChild(fragment);
}

if (els.bangsAdd) {
  els.bangsAdd.addEventListener('click', () => {
    els.bangsForm.hidden = false;
    els.bangsTrigger.value = '';
    els.bangsUrl.value = '';
    els.bangsTrigger.focus();
  });
  els.bangsCancel.addEventListener('click', () => { els.bangsForm.hidden = true; });
  els.bangsSave.addEventListener('click', async () => {
    try {
      const trigger = (els.bangsTrigger.value || '').trim().toLowerCase().replace(/^!/, '');
      if (!trigger) return;
      const urlTemplate = (els.bangsUrl.value || '').trim();
      if (!urlTemplate) return;
      const existing = (appSettings.bangs || []).filter((b) => b.trigger !== trigger);
      const next = [...existing, { trigger, urlTemplate }];
      saveSettingsPatch({ bangs: next });
      els.bangsForm.hidden = true;
    } catch (e) {
      console.error('[bangs] save failed', e);
    }
  });
}

function renderShortcutSettings() {
  if (!els.shortcutList) return;
  els.shortcutList.replaceChildren();
  els.shortcutsEmpty.hidden = (appSettings.shortcuts || []).length > 0;

  const fragment = document.createDocumentFragment();
  for (const shortcut of appSettings.shortcuts || []) {
    const row = document.createElement('div');
    row.className = 'fav-row';

    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'fav-row__main';
    link.append(siteIcon(shortcut, 'fav-row__icon'));
    const text = document.createElement('span');
    text.className = 'fav-row__text';
    const title = document.createElement('span');
    title.className = 'fav-row__title';
    title.textContent = shortcut.title;
    const url = document.createElement('span');
    url.className = 'fav-row__url';
    url.textContent = shortcut.url;
    text.append(title, url);
    link.appendChild(text);
    link.addEventListener('click', () => { closeSettings(); api.navigate(shortcut.url); });

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'fav-row__remove';
    remove.appendChild(closeIcon());
    remove.addEventListener('click', async () => {
      await api.removeShortcut(shortcut.id);
    });

    row.append(link, remove);
    fragment.appendChild(row);
  }
  els.shortcutList.appendChild(fragment);
}

function renderBookmarkTree() {
  if (!els.bookmarkTree) return;
  const query = (els.bookmarksSearch?.value || '').trim().toLowerCase();
  const folders = appSettings.bookmarkFolders || [];
  const bookmarks = (appSettings.bookmarks || []).filter((b) => {
    if (!query) return true;
    return `${b.title || ''} ${b.url || ''} ${(b.tags || []).join(' ')}`.toLowerCase().includes(query);
  });

  els.bookmarkTree.replaceChildren();
  els.bookmarksEmpty.hidden = (appSettings.bookmarks || []).length > 0;

  const folderMap = new Map();
  for (const f of folders) folderMap.set(f.id, { ...f, children: [] });
  const roots = [];
  for (const f of folderMap.values()) {
    if (f.parentId && folderMap.has(f.parentId)) folderMap.get(f.parentId).children.push(f);
    else roots.push(f);
  }

  const renderFolder = (folder, container) => {
    const details = document.createElement('details');
    details.className = 'bookmark-folder';
    details.open = true;
    const summary = document.createElement('summary');
    summary.className = 'bookmark-folder__name';
    summary.textContent = folder.name;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'fav-row__remove';
    remove.textContent = '×';
    remove.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); api.removeBookmarkFolder(folder.id); });
    summary.appendChild(remove);
    details.appendChild(summary);

    const list = document.createElement('div');
    list.className = 'bookmark-folder__items';
    const folderBookmarks = bookmarks.filter((b) => b.folderId === folder.id);
    for (const b of folderBookmarks) {
      const row = document.createElement('div');
      row.className = 'fav-row';
      const link = document.createElement('button');
      link.type = 'button';
      link.className = 'fav-row__main';
      link.append(siteIcon(b, 'fav-row__icon'));
      const text = document.createElement('span');
      text.className = 'fav-row__text';
      const title = document.createElement('span');
      title.className = 'fav-row__title';
      title.textContent = b.title;
      const url = document.createElement('span');
      url.className = 'fav-row__url';
      url.textContent = b.url;
      text.append(title, url);
      link.appendChild(text);
      link.addEventListener('click', () => { closeSettings(); api.navigate(b.url); });
      const removeBm = document.createElement('button');
      removeBm.type = 'button';
      removeBm.className = 'fav-row__remove';
      removeBm.appendChild(closeIcon());
      removeBm.addEventListener('click', () => api.removeBookmark(b.id));
      row.append(link, removeBm);
      list.appendChild(row);
    }
    details.appendChild(list);

    for (const child of folder.children) renderFolder(child, details);
    container.appendChild(details);
  };

  const rootList = document.createElement('div');
  rootList.className = 'bookmark-root';
  const rootBookmarks = bookmarks.filter((b) => !b.folderId);
  for (const b of rootBookmarks) {
    const row = document.createElement('div');
    row.className = 'fav-row';
    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'fav-row__main';
    link.append(siteIcon(b, 'fav-row__icon'));
    const text = document.createElement('span');
    text.className = 'fav-row__text';
    const title = document.createElement('span');
    title.className = 'fav-row__title';
    title.textContent = b.title;
    const url = document.createElement('span');
    url.className = 'fav-row__url';
    url.textContent = b.url;
    text.append(title, url);
    link.appendChild(text);
    link.addEventListener('click', () => { closeSettings(); api.navigate(b.url); });
    const removeBm = document.createElement('button');
    removeBm.type = 'button';
    removeBm.className = 'fav-row__remove';
    removeBm.appendChild(closeIcon());
    removeBm.addEventListener('click', () => api.removeBookmark(b.id));
    row.append(link, removeBm);
    rootList.appendChild(row);
  }
  for (const f of roots) renderFolder(f, rootList);
  els.bookmarkTree.appendChild(rootList);
}


/* --------------------------------------------------------- Settings-Form */

let settingsTimer = null;
let pendingSettingsPatch = null;

function setSettingsStatus(text, status = 'idle') {
  els.settingsStatus.textContent = text;
  els.settingsStatus.dataset.state = status;
}

function mergeSettingsPatch(current, patch) {
  const merged = { ...(current || {}), ...(patch || {}) };

  for (const key of ['search', 'ui']) {
    if ((current && current[key]) || (patch && patch[key])) {
      merged[key] = { ...(current?.[key] || {}), ...(patch?.[key] || {}) };
    }
  }

  return merged;
}

function buildSearchEngineOptions() {
  els.searchEngine.replaceChildren();

  for (const engine of SEARCH_ENGINES) {
    const option = document.createElement('option');
    option.value = engine.id;
    option.textContent = engine.name;
    els.searchEngine.appendChild(option);
  }
}

function syncSettingsForm({ preserveFocus = false } = {}) {
  const active = document.activeElement;

  els.searchEngine.value = appSettings.search.engine;

  if (els.username) {
    els.username.value = appSettings.ui.userName || '';
  }

  const custom = appSettings.search.engine === 'custom';
  els.searchCustom.hidden = !custom;

  if (custom && (!preserveFocus || active !== els.searchTemplate)) {
    els.searchTemplate.value = appSettings.search.urlTemplate;
    els.searchTemplate.removeAttribute('aria-invalid');
  } else if (!custom) {
    els.searchTemplate.removeAttribute('aria-invalid');
  }

  for (const button of els.densityButtons) {
    const selected = button.dataset.density === appSettings.ui.density;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  }

  if (els.gamingModeToggle) els.gamingModeToggle.checked = appSettings.ui.gamingMode === true;
  if (els.autoSleep) els.autoSleep.value = String(appSettings.ui.autoSleepMinutes ?? 30);
  if (els.gamingModeButton) els.gamingModeButton.classList.toggle('is-active', appSettings.ui.gamingMode === true);

  if (els.restoreSessionToggle) els.restoreSessionToggle.checked = appSettings.ui.restoreSession !== false;
  if (els.adblockToggle) els.adblockToggle.checked = appSettings.privacy?.adblock !== false;
  if (els.trackingToggle) els.trackingToggle.checked = appSettings.privacy?.trackingProtection !== false;

  renderSettingsFavorites();
  renderShortcutSettings();
  renderBookmarkTree();
  renderHistory();
  if (!recordingHotkey) renderHotkeys();
}

function applySettings(next, { preserveFormFocus = false } = {}) {
  if (!next || typeof next !== 'object') return;

  if (next.search && typeof next.search === 'object') {
    appSettings.search = { ...appSettings.search, ...next.search };
  }
  if (next.ui && typeof next.ui === 'object') {
    appSettings.ui = { ...appSettings.ui, ...next.ui };
  }
  if (Array.isArray(next.favorites)) {
    appSettings.favorites = next.favorites;
  }
  if (Array.isArray(next.shortcuts)) {
    appSettings.shortcuts = next.shortcuts;
  }
  if (Array.isArray(next.bangs)) {
    appSettings.bangs = next.bangs;
  }
  if (Array.isArray(next.customThemes)) {
    appSettings.customThemes = next.customThemes;
    renderCustomThemes();
  }
  if (Array.isArray(next.bookmarks)) {
    appSettings.bookmarks = next.bookmarks;
  }
  if (Array.isArray(next.bookmarkFolders)) {
    appSettings.bookmarkFolders = next.bookmarkFolders;
  }
  if (Array.isArray(next.tabGroups)) {
    appSettings.tabGroups = next.tabGroups;
  }
  if (next.privacy && typeof next.privacy === 'object') {
    appSettings.privacy = { ...appSettings.privacy, ...next.privacy };
  }
  if (next.performance && typeof next.performance === 'object') {
    appSettings.performance = { ...appSettings.performance, ...next.performance };
  }
  if (next.hotkeys && typeof next.hotkeys === 'object') {
    appSettings.hotkeys = cloneHotkeys({ ...DEFAULT_HOTKEYS, ...next.hotkeys });
  }

  applyTabLayout(appSettings.ui.tabLayout);
  applyDensity();
  document.body.classList.toggle('gaming-mode', appSettings.ui.gamingMode === true);
  setBackgroundPaused(appSettings.ui.gamingMode === true);
  renderFavoritesBar();
  renderSidebarLists();
  renderTabs();
  renderBangsSettings();
  updateFavoriteToggle();
  syncSettingsForm({ preserveFocus: preserveFormFocus });
  reportLayout();
}

function saveSettingsPatch(patch) {
  pendingSettingsPatch = mergeSettingsPatch(pendingSettingsPatch, patch);
  applySettings(patch, { preserveFormFocus: true });
  setSettingsStatus('Speichern …', 'saving');

  if (settingsTimer) clearTimeout(settingsTimer);
  settingsTimer = setTimeout(flushSettingsSave, 250);
}

async function flushSettingsSave() {
  if (settingsTimer) {
    clearTimeout(settingsTimer);
    settingsTimer = null;
  }

  if (!pendingSettingsPatch) return;
  const patch = pendingSettingsPatch;
  pendingSettingsPatch = null;

  try {
    const next = await api.saveSettings(patch);
    if (next) applySettings(next, { preserveFormFocus: true });
    setSettingsStatus('Gespeichert', 'saved');
  } catch (error) {
    console.error('[settings] Speichern fehlgeschlagen:', error);
    setSettingsStatus('Speichern fehlgeschlagen', 'error');
  }
}

/* --------------------------------------------------------- Seitensuche */

function openFind() {
  closeCommandPalette({ restoreFocus: false });
  closeContextMenu();
  els.findbar.hidden = false;
  els.findInput.focus();
  els.findInput.select();
  reportLayout();
}

function closeFind({ restoreFocus = true } = {}) {
  if (els.findbar.hidden) return;
  els.findbar.hidden = true;
  els.findCount.textContent = '';
  api.stopFind();
  if (els.findbar.contains(document.activeElement)) document.activeElement.blur();
  reportLayout();
  if (restoreFocus) api.focusContent();
}

function runFind(forward = true, findNext = false) {
  const query = els.findInput.value;
  if (!query.trim()) {
    els.findCount.textContent = '';
    api.stopFind();
    return;
  }
  api.findInPage(query, forward, findNext);
}

/* ------------------------------------------------------------ Tab-Suche */

let tabSearchSelection = 0;

function filteredTabs() {
  const query = els.tabSearchInput.value.trim().toLowerCase();
  if (!query) return state.tabs;
  return state.tabs.filter((tab) =>
    `${tab.title || ''} ${tab.url || ''}`.toLowerCase().includes(query));
}

function renderTabSearch() {
  const matches = filteredTabs();
  tabSearchSelection = Math.max(0, Math.min(tabSearchSelection, matches.length - 1));
  els.tabSearchEmpty.hidden = matches.length > 0;

  const fragment = document.createDocumentFragment();
  matches.forEach((tab, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tab-search__result';
    button.classList.toggle('is-selected', index === tabSearchSelection);
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', String(index === tabSearchSelection));

    const title = document.createElement('span');
    title.className = 'tab-search__result-title';
    title.textContent = `${tab.pinned ? '📌 ' : ''}${tab.title || 'Neuer Tab'}`;
    const url = document.createElement('span');
    url.className = 'tab-search__result-url';
    url.textContent = tab.url || 'jtech://newtab';
    button.append(title, url);

    button.addEventListener('mousemove', () => {
      if (tabSearchSelection === index) return;
      tabSearchSelection = index;
      renderTabSearch();
    });
    button.addEventListener('click', () => {
      closeTabSearch({ restoreFocus: false });
      api.activateTab(tab.id);
    });
    fragment.appendChild(button);
  });

  els.tabSearchResults.replaceChildren(fragment);
  els.tabSearchResults.querySelector('.is-selected')?.scrollIntoView({ block: 'nearest' });
}

function openTabSearch() {
  closeCommandPalette({ restoreFocus: false });
  closeContextMenu();
  closeFind({ restoreFocus: false });
  if (!els.studio.hidden) closeStudio({ restoreFocus: false });
  if (!els.settings.hidden) closeSettings({ restoreFocus: false });

  els.tabSearch.hidden = false;
  els.tabSearch.setAttribute('aria-hidden', 'false');
  els.tabSearchInput.value = '';
  tabSearchSelection = Math.max(0, state.tabs.findIndex((tab) => tab.id === state.activeId));
  renderTabSearch();
  updateOverlayState();
  els.tabSearchInput.focus();
}

function closeTabSearch({ restoreFocus = true } = {}) {
  if (els.tabSearch.hidden) return;
  els.tabSearch.hidden = true;
  els.tabSearch.setAttribute('aria-hidden', 'true');
  updateOverlayState();
  if (restoreFocus) api.focusContent();
}

/* -------------------------------------------------------- Command Palette */

let commandPaletteSelection = 0;
let commandPaletteItems = [];

function buildCommandPaletteItems() {
  const items = [];

  for (const tab of state.tabs) {
    items.push({
      label: tab.title || 'Neuer Tab',
      sub: tab.url || 'jtech://newtab',
      group: 'Tabs',
      run: () => { closeCommandPalette({ restoreFocus: false }); api.activateTab(tab.id); }
    });
  }

  for (const favorite of appSettings.favorites || []) {
    items.push({
      label: favorite.title,
      sub: favorite.url,
      group: 'Favoriten',
      run: () => { closeCommandPalette({ restoreFocus: false }); api.navigate(favorite.url); }
    });
  }

  for (const entry of (appSettings.history || []).slice(0, 80)) {
    items.push({
      label: entry.title || entry.url,
      sub: entry.url,
      group: 'Verlauf',
      run: () => { closeCommandPalette({ restoreFocus: false }); api.navigate(entry.url); }
    });
  }

  const panels = [
    ['general', 'Allgemein'],
    ['appearance', 'Darstellung'],
    ['favorites', 'Favoriten'],
    ['hotkeys', 'Hotkeys'],
    ['extensions', 'Erweiterungen'],
    ['privacy', 'Datenschutz'],
    ['history', 'Verlauf'],
    ['downloads', 'Downloads'],
    ['about', 'Über']
  ];
  for (const [panel, label] of panels) {
    items.push({
      label: `Einstellungen: ${label}`,
      sub: 'Einstellungen öffnen',
      group: 'Einstellungen',
      run: () => { closeCommandPalette({ restoreFocus: false }); openSettings(panel); }
    });
  }

  const actions = [
    ['Neuer Tab', () => { closeCommandPalette({ restoreFocus: false }); api.newTab(); }],
    ['Tab schließen', () => { closeCommandPalette({ restoreFocus: false }); const active = getActive(); if (active) api.closeTab(active.id); }],
    ['Tab suchen', () => { closeCommandPalette({ restoreFocus: false }); openTabSearch(); }],
    ['Seite durchsuchen', () => { closeCommandPalette({ restoreFocus: false }); openFind(); }],
    ['Design-Studio öffnen', () => { closeCommandPalette({ restoreFocus: false }); openStudio(); }],
    ['Vollbild umschalten', () => { closeCommandPalette({ restoreFocus: false }); api.zoom('reset'); }]
  ];
  for (const [label, run] of actions) {
    items.push({ label, sub: 'Aktion', group: 'Aktionen', run });
  }

  return items;
}

function filteredCommandItems() {
  const query = els.commandPaletteInput.value.trim().toLowerCase();
  if (!query) return commandPaletteItems.slice(0, 40);
  return commandPaletteItems.filter((item) =>
    `${item.label} ${item.sub} ${item.group}`.toLowerCase().includes(query)).slice(0, 60);
}

function renderCommandPalette() {
  const matches = filteredCommandItems();
  commandPaletteSelection = Math.max(0, Math.min(commandPaletteSelection, matches.length - 1));
  els.commandPaletteEmpty.hidden = matches.length > 0;

  const fragment = document.createDocumentFragment();
  matches.forEach((item, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'command-palette__result';
    button.classList.toggle('is-selected', index === commandPaletteSelection);
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', String(index === commandPaletteSelection));

    const label = document.createElement('span');
    label.className = 'command-palette__result-label';
    label.textContent = item.label;

    const sub = document.createElement('span');
    sub.className = 'command-palette__result-sub';
    sub.textContent = `${item.group} · ${item.sub}`;

    button.append(label, sub);
    button.addEventListener('mousemove', () => {
      if (commandPaletteSelection === index) return;
      commandPaletteSelection = index;
      renderCommandPalette();
    });
    button.addEventListener('click', () => item.run());

    fragment.appendChild(button);
  });

  els.commandPaletteResults.replaceChildren(fragment);
  els.commandPaletteResults.querySelector('.is-selected')?.scrollIntoView({ block: 'nearest' });
}

function openCommandPalette() {
  closeContextMenu();
  closeFind({ restoreFocus: false });
  closeTabSearch({ restoreFocus: false });
  if (!els.studio.hidden) closeStudio({ restoreFocus: false });
  if (!els.settings.hidden) closeSettings({ restoreFocus: false });

  commandPaletteItems = buildCommandPaletteItems();
  commandPaletteSelection = 0;
  els.commandPalette.hidden = false;
  els.commandPalette.setAttribute('aria-hidden', 'false');
  els.commandPaletteInput.value = '';
  renderCommandPalette();
  updateOverlayState();
  els.commandPaletteInput.focus();
}

function closeCommandPalette({ restoreFocus = true } = {}) {
  if (els.commandPalette.hidden) return;
  els.commandPalette.hidden = true;
  els.commandPalette.setAttribute('aria-hidden', 'true');
  updateOverlayState();
  if (restoreFocus) api.focusContent();
}

function renderSplitControl() {
  if (!els.splitControl) return;
  els.splitControl.hidden = !state.splitMode;

  if (!state.splitMode) return;

  const left = state.tabs.find((t) => t.id === state.splitLeftId);
  const right = state.tabs.find((t) => t.id === state.splitRightId);
  els.splitLeftTitle.textContent = left?.title || 'Links';
  els.splitRightTitle.textContent = right?.title || 'Rechts';
}

/* ------------------------------------------------------------- Overlays */

function updateOverlayState() {
  const extensionsMenuOpen = els.extensionsMenuPanel && !els.extensionsMenuPanel.hidden;
  api.setOverlay(!els.studio.hidden || !els.settings.hidden || !els.tabSearch.hidden || !els.commandPalette.hidden || !els.contextMenu.hidden || extensionsMenuOpen);
}

function openStudio() {
  if (!els.studio.hidden) return;

  closeCommandPalette({ restoreFocus: false });
  closeTabSearch({ restoreFocus: false });
  closeFind({ restoreFocus: false });
  if (!els.settings.hidden) closeSettings({ restoreFocus: false });

  els.studio.hidden = false;
  els.studio.setAttribute('aria-hidden', 'false');
  updateOverlayState();
  wallpaperMode = Boolean(theme.wallpaper);
  syncThemeInputs();
  setStudioAnimations(true);
  setStatus('Automatisch gespeichert', 'idle');
  els.studioClose.focus();
}

function closeStudio({ restoreFocus = true } = {}) {
  if (els.studio.hidden) return;

  els.studio.hidden = true;
  els.studio.setAttribute('aria-hidden', 'true');

  if (els.studio.contains(document.activeElement)) document.activeElement.blur();
  els.omnibox.blur();

  flushSave();
  setStudioAnimations(false);
  els.themeSaveForm.hidden = true;
  updateOverlayState();

  if (restoreFocus) api.focusContent();
}

function switchThemeTab(panel) {
  for (const button of els.themeTabButtons) {
    const selected = button.dataset.tab === panel;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-selected', String(selected));
  }
  for (const p of els.themeTabPanels) {
    const active = p.dataset.panel === panel;
    p.classList.toggle('is-active', active);
    p.hidden = !active;
  }
}

function switchSettingsPanel(panel) {
  for (const button of els.settingsNavButtons) {
    const selected = button.dataset.panel === panel;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-selected', String(selected));
  }

  for (const section of els.settingsPanels) {
    section.hidden = section.dataset.panel !== panel;
  }
}

function openSettings(panel = 'general') {
  closeCommandPalette({ restoreFocus: false });
  closeTabSearch({ restoreFocus: false });
  closeFind({ restoreFocus: false });
  if (!els.studio.hidden) closeStudio({ restoreFocus: false });

  els.settings.hidden = false;
  els.settings.setAttribute('aria-hidden', 'false');

  syncSettingsForm();
  switchSettingsPanel(panel);
  setSettingsStatus('Automatisch gespeichert', 'idle');
  updateOverlayState();
  els.settingsClose.focus();
}

function closeSettings({ restoreFocus = true } = {}) {
  if (els.settings.hidden) return;

  els.settings.hidden = true;
  els.settings.setAttribute('aria-hidden', 'true');

  if (els.settings.contains(document.activeElement)) document.activeElement.blur();

  recordingHotkey = null;
  setHotkeyConflict();
  flushSettingsSave();
  updateOverlayState();

  if (restoreFocus) api.focusContent();
}

/* -------------------------------------------------------------- Events */

function openNewTab() {
  closeCommandPalette({ restoreFocus: false });
  closeTabSearch({ restoreFocus: false });
  closeFind({ restoreFocus: false });
  if (!els.studio.hidden) closeStudio({ restoreFocus: false });
  if (!els.settings.hidden) closeSettings({ restoreFocus: false });
  api.newTab();
}

els.newTab.addEventListener('click', openNewTab);
if (els.sidebarHome) els.sidebarHome.addEventListener('click', openNewTab);
if (els.sidebarNewTab) els.sidebarNewTab.addEventListener('click', openNewTab);
if (els.tabSearchOpen) els.tabSearchOpen.addEventListener('click', openTabSearch);
els.sidebarSettings.addEventListener('click', () => openSettings());

if (els.sidebarBurger) {
  els.sidebarBurger.addEventListener('click', () => {
    els.sidebar.classList.toggle('is-collapsed');
    reportLayout();
  });
}

els.back.addEventListener('click', () => api.back());
els.forward.addEventListener('click', () => api.forward());

els.reload.addEventListener('click', () => {
  if (getActive()?.loading) api.stop();
  else api.reload(false);
});

els.devtools.addEventListener('click', () => api.toggleDevTools());

if (els.pipButton) {
  els.pipButton.addEventListener('click', () => api.togglePictureInPicture());
}

els.winMin.addEventListener('click', () => api.minimize());
els.winMax.addEventListener('click', () => api.toggleMaximize());
els.winClose.addEventListener('click', () => api.close());

function renderOmniboxSuggestions() {
  const panel = els.omniboxSuggestions;
  if (!panel) return;
  const query = (els.omnibox.value || '').trim().toLowerCase();
  if (query.startsWith('>')) { panel.hidden = true; return; }
  const items = [];
  for (const tab of state.tabs || []) {
    if (!tab.url || tab.url === 'jtech://newtab') continue;
    if (!query || (tab.title || '').toLowerCase().includes(query) || tab.url.toLowerCase().includes(query)) {
      items.push({ type: 'Tab', title: tab.title || tab.url, url: tab.url });
    }
  }
  for (const b of (appSettings.bookmarks || [])) {
    if (!query || (b.title || '').toLowerCase().includes(query) || (b.url || '').toLowerCase().includes(query)) {
      items.push({ type: 'Bookmark', title: b.title || b.url, url: b.url });
    }
  }
  for (const h of (appSettings.history || []).slice(0, 80)) {
    if (!query || (h.title || '').toLowerCase().includes(query) || (h.url || '').toLowerCase().includes(query)) {
      items.push({ type: 'History', title: h.title || h.url, url: h.url });
    }
  }
  const seen = new Set();
  const unique = items.filter((i) => {
    if (!i.url || seen.has(i.url)) return false;
    seen.add(i.url);
    return true;
  }).slice(0, 10);

  if (!unique.length) {
    panel.hidden = true;
    return;
  }
  panel.innerHTML = '';
  for (const item of unique) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'omnibox-suggestion';
    row.innerHTML = `<span class="omnibox-suggestion__type">${escapeHtml(item.type)}</span><span class="omnibox-suggestion__title">${escapeHtml(item.title)}</span><span class="omnibox-suggestion__url">${escapeHtml(item.url)}</span>`;
    row.addEventListener('mousedown', (e) => {
      e.preventDefault();
      els.omnibox.value = item.url;
      api.navigate(item.url);
      els.omnibox.blur();
      panel.hidden = true;
      api.toggleWebview(true);
    });
    panel.appendChild(row);
  }
  const wasShown = !panel.hidden;
  panel.hidden = false;
  if (!wasShown) {
    api.toggleWebview(false);
  }
}

els.omnibox.addEventListener('blur', () => {
  setTimeout(() => {
    if (els.omniboxSuggestions) els.omniboxSuggestions.hidden = true;
    api.toggleWebview(true);
    if (els.commandPalette.hidden) return;
    if (els.commandPalette.contains(document.activeElement)) return;
    closeCommandPalette({ restoreFocus: false });
  }, 100);
});

els.omniboxForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const value = els.omnibox.value.trim();
  if (!value) return;

  if (value.startsWith('>')) {
    const matches = filteredCommandItems();
    if (matches[commandPaletteSelection]) {
      matches[commandPaletteSelection].run();
    } else if (matches.length === 1) {
      matches[0].run();
    }
    els.omnibox.value = '';
    els.omnibox.blur();
    closeCommandPalette({ restoreFocus: false });
    return;
  }

  api.navigate(value);
  els.omnibox.blur();
});

els.omnibox.addEventListener('focus', () => {
  els.omnibox.select();
});

els.omnibox.addEventListener('input', () => {
  omniboxDirty = true;
  const value = els.omnibox.value.trim();
  if (value.startsWith('>')) {
    if (els.commandPalette.hidden) openCommandPalette();
    els.commandPaletteInput.value = value.slice(1).trim();
    commandPaletteSelection = 0;
    renderCommandPalette();
    els.omniboxSuggestions.hidden = true;
    api.toggleWebview(true);
  } else {
    if (!els.commandPalette.hidden) closeCommandPalette({ restoreFocus: false });
    renderOmniboxSuggestions();
    const panel = els.omniboxSuggestions;
    if (panel && !panel.hidden) {
      api.toggleWebview(false);
    } else {
      api.toggleWebview(true);
    }
  }
});

els.omnibox.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    const value = els.omnibox.value.trim();
    if (!value) {
      api.reload();
      els.omnibox.blur();
      return;
    }
    els.omniboxForm.requestSubmit();
    els.omniboxSuggestions.hidden = true;
    api.toggleWebview(true);
    return;
  }
  if (event.key === 'Escape') {
    if (!els.commandPalette.hidden) {
      event.preventDefault();
      closeCommandPalette();
      els.omnibox.value = '';
      els.omnibox.blur();
      return;
    }
    event.preventDefault();
    els.omnibox.blur();
    syncOmnibox();
    api.focusContent();
  }
});

els.tabs.addEventListener(
  'wheel',
  (event) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

    if (document.body.dataset.tabLayout === 'vertical') {
      els.tabs.scrollTop += event.deltaY;
    } else {
      els.tabs.scrollLeft += event.deltaY;
    }

    event.preventDefault();
  },
  { passive: false }
);

/* --------------------------------------------------------- Favoriten-Events */

els.favoriteToggle.addEventListener('click', addCurrentFavorite);
els.favoritesManage.addEventListener('click', () => openSettings('favorites'));

/* --------------------------------------------------------- Studio-Events */

els.studioOpen.addEventListener('click', () => {
  if (els.studio.hidden) openStudio();
  else closeStudio();
});

els.studioClose.addEventListener('click', closeStudio);

els.studio.addEventListener('click', (event) => {
  if (event.target === els.studio) closeStudio();
});

for (const button of els.themeTabButtons) {
  button.addEventListener('click', () => switchThemeTab(button.dataset.tab));
}

els.themeReset.addEventListener('click', () => {
  setTheme({ ...DEFAULT_THEME });
});

for (const control of COLOR_CONTROLS) {
  const swatch = els[control.swatch];
  const hex = els[control.hex];
  if (!swatch || !hex) continue;

  const setColor = (value) => {
    theme[control.key] = value;
    // Gedämpfter Text folgt Text- und Hintergrundfarbe.
    if (control.key === 'text' || control.key === 'bg') theme.textDim = deriveTextDim(theme.text, theme.bg);
    commitTheme();
    syncBackgroundGallery();
  };

  swatch.addEventListener('input', () => {
    const value = normalizeHex(swatch.value);
    if (!value) return;
    hex.value = value.toUpperCase();
    hex.removeAttribute('aria-invalid');
    setColor(value);
  });

  hex.addEventListener('input', () => {
    const raw = hex.value.trim();
    const value = normalizeHex(raw.startsWith('#') ? raw : `#${raw}`);
    if (!value) {
      hex.setAttribute('aria-invalid', 'true');
      return;
    }
    hex.removeAttribute('aria-invalid');
    swatch.value = value;
    setColor(value);
  });

  hex.addEventListener('blur', () => {
    if (hex.getAttribute('aria-invalid') === 'true') syncThemeInputs();
  });
}

// Werte, die die Live-Vorschauen der Hintergründe beeinflussen.
const PREVIEW_KEYS = ['animationSpeed', 'animationIntensity', 'glowIntensity'];

for (const slider of THEME_SLIDERS) {
  if (!slider.inputEl) continue;
  slider.inputEl.addEventListener('input', () => {
    const raw = Number(slider.inputEl.value);
    const value = clamp(raw, slider.min, slider.max, slider.min);
    theme[slider.key] = slider.scale ? Math.round(value) / slider.scale : Math.round(value);
    commitTheme();
    if (PREVIEW_KEYS.includes(slider.key)) syncBackgroundGallery();
  });
}

for (const segment of THEME_SEGMENTS) {
  const container = els[segment.el];
  if (!container) continue;
  container.addEventListener('click', (event) => {
    const button = event.target.closest('.ds-seg');
    if (!button || !segment.allowed.includes(button.dataset.value)) return;
    theme[segment.key] = button.dataset.value;
    syncSegment(container, theme[segment.key]);
    commitTheme();
  });
}

els.themeWallpaper.addEventListener('input', () => {
  theme.wallpaper = String(els.themeWallpaper.value || '').trim().slice(0, 2000);
  wallpaperMode = true;
  commitTheme();
  syncBackgroundGallery();
});

els.themeCursorEffect.addEventListener('change', () => {
  theme.cursorEffect = CURSOR_EFFECTS.includes(els.themeCursorEffect.value) ? els.themeCursorEffect.value : 'none';
  commitTheme();
});

const CURSOR_COLOR_PLACEHOLDER = '%23ff6b35';
const CURSOR_PRESETS = {
  '': () => '',
  dot: (color) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ccircle cx='12' cy='12' r='5' fill='${encodeURIComponent(color)}' stroke='white' stroke-width='2'/%3E%3C/svg%3E") 12 12, auto`,
  ring: (color) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Ccircle cx='16' cy='16' r='10' fill='none' stroke='${encodeURIComponent(color)}' stroke-width='2'/%3E%3C/svg%3E") 16 16, auto`,
  cross: (color) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Cpath d='M12 2v20M2 12h20' stroke='${encodeURIComponent(color)}' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") 12 12, auto`,
  'arrow-glow': (color) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Cpath d='M4 2l16 10-8 2 4 8-3 1-4-8-5 5z' fill='${encodeURIComponent(color)}' stroke='white' stroke-width='1'/%3E%3C/svg%3E") 4 2, auto`,
  target: (color) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Ccircle cx='16' cy='16' r='12' fill='none' stroke='${encodeURIComponent(color)}' stroke-width='2'/%3E%3Ccircle cx='16' cy='16' r='3' fill='${encodeURIComponent(color)}'/%3E%3C/svg%3E") 16 16, auto`,
  pointer: (color) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Cpath d='M6 2l12 8-5 1 4 9-3 1-4-9-4 4z' fill='${encodeURIComponent(color)}' stroke='white' stroke-width='1.2'/%3E%3C/svg%3E") 6 2, auto`,
  diamond: (color) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Cpath d='M12 2l10 10-10 10L2 12z' fill='none' stroke='${encodeURIComponent(color)}' stroke-width='2'/%3E%3Ccircle cx='12' cy='12' r='2' fill='${encodeURIComponent(color)}'/%3E%3C/svg%3E") 12 12, auto`,
  hex: (color) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28'%3E%3Cpath d='M14 2l11.3 6.5v13L14 28 2.7 21.5v-13z' fill='none' stroke='${encodeURIComponent(color)}' stroke-width='2'/%3E%3C/svg%3E") 14 14, auto`,
  'circle-ring': (color) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Ccircle cx='16' cy='16' r='12' fill='none' stroke='white' stroke-width='2'/%3E%3Ccircle cx='16' cy='16' r='6' fill='${encodeURIComponent(color)}'/%3E%3C/svg%3E") 16 16, auto`,
  'crosshair-dot': (color) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Cpath d='M12 4v6M12 14v6M4 12h6M14 12h6' stroke='${encodeURIComponent(color)}' stroke-width='2'/%3E%3Ccircle cx='12' cy='12' r='2' fill='white'/%3E%3C/svg%3E") 12 12, auto`,
  beam: (color) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='28'%3E%3Crect x='8' y='2' width='4' height='24' rx='2' fill='${encodeURIComponent(color)}'/%3E%3C/svg%3E") 10 14, auto`,
  scope: (color) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Ccircle cx='16' cy='16' r='14' fill='none' stroke='white' stroke-width='1.5'/%3E%3Cpath d='M16 2v6M16 24v6M2 16h6M24 16h6' stroke='${encodeURIComponent(color)}' stroke-width='1.5'/%3E%3Ccircle cx='16' cy='16' r='2' fill='${encodeURIComponent(color)}'/%3E%3C/svg%3E") 16 16, auto`,
  play: (color) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Cpath d='M6 4l14 8-14 8z' fill='${encodeURIComponent(color)}' stroke='white' stroke-width='1'/%3E%3C/svg%3E") 6 4, auto`
};

function buildCursorImage(preset, color) {
  const factory = CURSOR_PRESETS[preset];
  if (typeof factory === 'function') return factory(color || '#ff6b35');
  return '';
}

function populateSelect(select, options) {
  if (!select) return;
  const value = select.value;
  select.replaceChildren();
  for (const option of options) {
    const opt = document.createElement('option');
    opt.value = option.id ?? option.value ?? '';
    opt.textContent = option.name ?? option.label ?? option.id ?? '';
    select.appendChild(opt);
  }
  if ([...select.options].some((o) => o.value === value)) {
    select.value = value;
  }
}

const CURSOR_PRESET_NAMES = {
  '': 'Standard',
  dot: 'Punkt',
  ring: 'Ring',
  cross: 'Fadenkreuz',
  'arrow-glow': 'Pfeil (Glow)',
  target: 'Ziel',
  pointer: 'Zeiger',
  diamond: 'Diamant',
  hex: 'Hexagon',
  'circle-ring': 'Kreis-Ring',
  'crosshair-dot': 'Crosshair-Punkt',
  beam: 'Strahl',
  scope: 'Zielfernrohr',
  play: 'Play'
};

populateSelect(els.themeCursorImage, Object.entries(CURSOR_PRESETS).map(([id]) => ({
  id,
  name: CURSOR_PRESET_NAMES[id] || id
})));

if (els.themeCursorImage) {
  els.themeCursorImage.addEventListener('change', () => {
    theme.cursorPreset = els.themeCursorImage.value || '';
    commitTheme();
  });
}

els.themeCssChrome.addEventListener('input', () => {
  theme.customCssChrome = els.themeCssChrome.value;
  commitTheme();
});

els.themeCssNewtab.addEventListener('input', () => {
  theme.customCssNewtab = els.themeCssNewtab.value;
  commitTheme();
});

/* ------------------------------------------------------- Theme Import / Export */

function exportTheme() {
  const blob = new Blob([JSON.stringify(theme, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `jtech-theme-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importTheme(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      setTheme({ ...DEFAULT_THEME, ...parsed });
      setStatus('Theme importiert', 'saved');
    } catch {
      setStatus('Ungültige Theme-Datei', 'error');
    }
  };
  reader.readAsText(file);
}

function randomizeTheme() {
  const hue = Math.floor(Math.random() * 360);
  const hue2 = (hue + 40 + Math.floor(Math.random() * 120)) % 360;
  const animations = BG_ANIMATIONS.filter((entry) => entry.id !== 'none').map((entry) => entry.id);
  const pickOne = (list) => list[Math.floor(Math.random() * list.length)];
  const accent = hslToHex(hue, 85 + Math.random() * 10, 58 + Math.random() * 6);
  const bg = hslToHex((hue + 200) % 360, 30 + Math.random() * 20, 4 + Math.random() * 5);
  const text = hslToHex(hue, 30, 93);

  wallpaperMode = false;
  setTheme({
    ...theme,
    accent,
    accentAlt: hslToHex(hue2, 85, 60),
    bg,
    text,
    textDim: deriveTextDim(text, bg),
    wallpaper: '',
    style: pickOne(THEME_STYLES),
    bgAnimation: pickOne(animations),
    glass: Math.round((0.62 + Math.random() * 0.18) * 100) / 100,
    blur: 16 + Math.floor(Math.random() * 12),
    radius: 6 + Math.floor(Math.random() * 12),
    animationIntensity: 35 + Math.floor(Math.random() * 45),
    glowIntensity: 30 + Math.floor(Math.random() * 50),
    borderStyle: pickOne(BORDER_STYLES),
    cursorColor: accent
  });
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const c = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(c * 255).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

if (els.themeExport) els.themeExport.addEventListener('click', exportTheme);
if (els.themeImport) {
  els.themeImport.addEventListener('click', () => els.themeImportInput?.click());
}
if (els.themeImportInput) {
  els.themeImportInput.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (file) importTheme(file);
    event.target.value = '';
  });
}
if (els.themeRandomize) els.themeRandomize.addEventListener('click', randomizeTheme);

/* ------------------------------------------------------- Settings-Events */

els.settingsOpen.addEventListener('click', () => {
  if (els.settings.hidden) openSettings();
  else closeSettings();
});

els.settingsClose.addEventListener('click', closeSettings);
els.settingsDone.addEventListener('click', () => closeSettings());

els.settings.addEventListener('click', (event) => {
  if (event.target === els.settings) closeSettings();
});

els.settingsOpenStudio.addEventListener('click', () => {
  closeSettings({ restoreFocus: false });
  openStudio();
});

els.settingsAddCurrent.addEventListener('click', addCurrentFavorite);
if (els.bookmarksAddCurrent) {
  els.bookmarksAddCurrent.addEventListener('click', () => {
    const active = getActive();
    const url = active?.url || '';
    if (!/^https?:\/\//i.test(url)) return;
    api.addBookmark({ title: active.title, url, favicon: active.favicon });
  });
}
if (els.bookmarksAddFolder) {
  els.bookmarksAddFolder.addEventListener('click', () => {
    const existing = els.bookmarkTree.querySelector('.bookmark__inline-input');
    if (existing) { existing.remove(); return; }
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'bookmark__inline-input text-input';
    input.placeholder = 'Ordnername …';
    input.style.marginBottom = '8px';
    const confirm = () => {
      const name = input.value.trim();
      if (name) api.addBookmarkFolder(name);
      input.remove();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); confirm(); }
      if (e.key === 'Escape') { e.preventDefault(); input.remove(); }
    });
    input.addEventListener('blur', () => {
      setTimeout(() => { if (document.contains(input)) confirm(); }, 100);
    });
    els.bookmarkTree.prepend(input);
    input.focus();
  });
}
if (els.bookmarksSearch) {
  els.bookmarksSearch.addEventListener('input', renderBookmarkTree);
}
if (els.bookmarksExport) {
  els.bookmarksExport.addEventListener('click', () => {
    const data = JSON.stringify({ bookmarks: appSettings.bookmarks, folders: appSettings.bookmarkFolders }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jtech-bookmarks.json';
    a.click();
    URL.revokeObjectURL(url);
  });
}
if (els.bookmarksImport) {
  els.bookmarksImport.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (Array.isArray(data.bookmarks)) await api.saveSettings({ bookmarks: data.bookmarks });
        if (Array.isArray(data.folders)) await api.saveSettings({ bookmarkFolders: data.folders });
      } catch (e) {
        console.error('[bookmarks] Import fehlgeschlagen:', e);
      }
    });
    input.click();
  });
}
els.extensionsLoad.addEventListener('click', async () => {
  try {
    const result = await api.loadExtension();
    if (Array.isArray(result?.extensions)) renderExtensions(result.extensions);
    if (result?.ok) {
      reportInstalledExtension(result, 'Erweiterung erfolgreich geladen.');
    } else if (!result?.canceled) {
      showExtensionStatus('Laden fehlgeschlagen. Ist die Erweiterung schon geladen oder fehlt die manifest.json?', 'error');
    }
  } catch (error) {
    console.error('[extensions] Laden fehlgeschlagen:', error);
    showExtensionStatus('Fehler: ' + (error?.message || error), 'error');
  }
});

if (els.extensionsMenuToggle) {
  els.extensionsMenuToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    if (els.extensionsMenuPanel?.hidden) openExtensionsMenu();
    else closeExtensionsMenu();
  });
}

// Menü bei Klick außerhalb schließen (mit Verzögerung)
let extensionsMenuJustOpened = false;
const _origOpenExtMenu = openExtensionsMenu;
openExtensionsMenu = function() {
  _origOpenExtMenu();
  extensionsMenuJustOpened = true;
  setTimeout(() => { extensionsMenuJustOpened = false; }, 150);
};

document.addEventListener('click', (event) => {
  if (extensionsMenuJustOpened) return;
  if (els.extensionsMenuPanel && !els.extensionsMenuPanel.hidden &&
      els.extensionsMenu && !els.extensionsMenu.contains(event.target)) {
    closeExtensionsMenu();
  }
});

// Menü schließen bei Escape
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && els.extensionsMenuPanel && !els.extensionsMenuPanel.hidden) {
    closeExtensionsMenu();
  }
});

if (els.extensionStoreInstall) {
  els.extensionStoreInstall.addEventListener('click', async () => {
    const input = (els.extensionStoreInput?.value || '').trim();
    if (!input) {
      showExtensionStatus('Bitte eine Web Store URL oder Erweiterungs-ID eingeben.', 'error');
      return;
    }
    els.extensionStoreInstall.disabled = true;
    showExtensionStatus('Installiere Erweiterung…', 'idle');
    try {
      const result = await api.installExtensionFromStore(input);
      if (Array.isArray(result?.extensions)) renderExtensions(result.extensions);
      if (result?.ok) {
        reportInstalledExtension(
          result,
          result.updated ? 'Erweiterung neu installiert und aktualisiert.' : 'Erweiterung aus dem Web Store installiert.'
        );
        if (els.extensionStoreInput) els.extensionStoreInput.value = '';
      } else {
        showExtensionStatus('Installation fehlgeschlagen. ID oder URL prüfen.', 'error');
      }
    } catch (error) {
      console.error('[extensions] Store-Installation fehlgeschlagen:', error);
      showExtensionStatus('Fehler: ' + (error?.message || error), 'error');
    } finally {
      els.extensionStoreInstall.disabled = false;
    }
  });
}

/** Status nach einer Installation, inkl. Warnung bei nicht unterstützten APIs. */
function reportInstalledExtension(result, successMessage) {
  const added = (result.extensions || []).find((extension) => extension.id === result.id);
  const unsupported = Array.isArray(added?.unsupported) ? added.unsupported : [];
  if (unsupported.length) {
    showExtensionStatus(
      `${added.name || 'Erweiterung'} installiert, funktioniert aber evtl. nicht (benötigt: ${unsupported.join(', ')}).`,
      'warning',
      9000
    );
  } else {
    showExtensionStatus(successMessage, 'success');
  }
}

function showExtensionStatus(message, state = 'idle', duration = 4000) {
  els.extensionsStatus.textContent = message;
  els.extensionsStatus.hidden = false;
  els.extensionsStatus.dataset.state = state;
  clearTimeout(els.extensionsStatus._timer);
  els.extensionsStatus._timer = setTimeout(() => {
    els.extensionsStatus.hidden = true;
  }, duration);
}

for (const button of els.settingsNavButtons) {
  button.addEventListener('click', () => switchSettingsPanel(button.dataset.panel));
}

els.searchEngine.addEventListener('change', () => {
  const engine = els.searchEngine.value;

  if (engine === 'custom') {
    els.searchCustom.hidden = false;

    if (!isValidSearchTemplate(els.searchTemplate.value)) {
      els.searchTemplate.value =
        appSettings.search.engine === 'custom' ? appSettings.search.urlTemplate : '';
    }

    els.searchTemplate.removeAttribute('aria-invalid');
    els.searchTemplate.focus();
    els.searchTemplate.select();
    return;
  }

  saveSettingsPatch({ search: { engine } });
});

els.searchTemplate.addEventListener('input', () => {
  const template = els.searchTemplate.value.trim();

  if (!isValidSearchTemplate(template)) {
    els.searchTemplate.setAttribute('aria-invalid', 'true');
    return;
  }

  els.searchTemplate.removeAttribute('aria-invalid');
  saveSettingsPatch({ search: { engine: 'custom', urlTemplate: template } });
});

if (els.username) {
  els.username.addEventListener('input', () => {
    saveSettingsPatch({ ui: { userName: els.username.value } });
  });
}

els.favoritesBarToggle.addEventListener('change', () => {
  saveSettingsPatch({ ui: { favoritesBar: els.favoritesBarToggle.checked } });
});

if (els.densityButtons.length) {
  for (const button of els.densityButtons) {
    button.addEventListener('click', () => {
      saveSettingsPatch({ ui: { density: button.dataset.density } });
    });
  }
}

if (els.gamingModeToggle) {
  els.gamingModeToggle.addEventListener('change', () => {
    saveSettingsPatch({ ui: { gamingMode: els.gamingModeToggle.checked } });
  });
}
if (els.autoSleep) {
  els.autoSleep.addEventListener('change', () => {
    saveSettingsPatch({ ui: { autoSleepMinutes: Number(els.autoSleep.value) } });
  });
}
if (els.gamingModeButton) {
  els.gamingModeButton.addEventListener('click', () => {
    saveSettingsPatch({ ui: { gamingMode: !(appSettings.ui.gamingMode === true) } });
  });
}

/* ------------------------------------------------------------ Auto-Update */

const updateEls = {
  pill: document.getElementById('update-ready'),
  pillLabel: document.getElementById('update-ready-label'),
  version: document.getElementById('settings-version'),
  status: document.getElementById('update-status'),
  check: document.getElementById('update-check'),
  install: document.getElementById('update-install'),
  hint: document.getElementById('update-hint')
};

/** Technische Updater-Fehler in verständliche Meldungen übersetzen. */
function describeUpdateError(message = '') {
  if (/404|Unable to find latest version|No published versions|latest\.yml/i.test(message)) {
    return 'Kein veröffentlichtes Release gefunden';
  }
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ECONNRESET|ERR_INTERNET|ERR_NAME_NOT_RESOLVED|ERR_NETWORK|net::/i.test(message)) {
    return 'Keine Verbindung zu GitHub';
  }
  if (/sha512|checksum|signature/i.test(message)) return 'Download beschädigt, wird erneut versucht';
  return 'Prüfung fehlgeschlagen';
}

function describeUpdate(status) {
  if (!status.supported) return 'Nur in der installierten Version';
  switch (status.state) {
    case 'checking': return 'Suche nach Updates …';
    case 'downloading': return `Lade Version ${status.version || ''} … ${status.percent || 0} %`.replace('  ', ' ');
    case 'ready': return `Version ${status.version} bereit`;
    case 'none': return 'Aktuell';
    case 'error': return describeUpdateError(status.message);
    default: return 'Noch nicht geprüft';
  }
}

function renderUpdateStatus(status) {
  if (!status) return;
  updateEls.version.textContent = status.current || '–';
  updateEls.status.textContent = describeUpdate(status);
  updateEls.status.title = status.state === 'error' ? status.message || '' : '';

  const ready = status.state === 'ready';
  updateEls.pill.hidden = !ready;
  updateEls.pillLabel.textContent = ready ? `Update ${status.version} bereit` : 'Update bereit';
  updateEls.install.hidden = !ready;
  updateEls.check.disabled = !status.supported || status.state === 'checking' || status.state === 'downloading';
  if (!status.supported) {
    updateEls.hint.textContent = 'Im Entwicklungsmodus (npm start) gibt es keine Updates.';
  } else if (status.state === 'error' && status.message) {
    updateEls.hint.textContent = `Details: ${status.message.split('\n')[0].slice(0, 160)}`;
  } else {
    updateEls.hint.textContent = 'Updates werden im Hintergrund geladen und beim nächsten Beenden installiert.';
  }
}

/* ------------------------------------------------------------ Kurzmeldung */

let toastTimer = null;

function showToast(text) {
  let toast = document.getElementById('jtech-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'jtech-toast';
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.textContent = String(text || '');
  toast.classList.add('is-visible');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 1800);
}

api.onToast?.(showToast);

async function installUpdate() {
  updateEls.pill.disabled = true;
  updateEls.install.disabled = true;
  const ok = await api.installUpdate();
  if (!ok) {
    updateEls.pill.disabled = false;
    updateEls.install.disabled = false;
  }
}

updateEls.pill?.addEventListener('click', installUpdate);
updateEls.install?.addEventListener('click', installUpdate);
updateEls.check?.addEventListener('click', async () => {
  updateEls.check.disabled = true;
  renderUpdateStatus(await api.checkForUpdates());
});

api.onUpdateStatus?.(renderUpdateStatus);
api.getUpdateStatus?.().then(renderUpdateStatus).catch(() => {});

/* ------------------------------------------------------- Ressourcen-Panel */

const RESOURCE_KIND_ICONS = { browser: 'B', ui: 'UI', tab: 'T', extension: 'E', gpu: 'G', service: 'D', renderer: 'P' };
const RESOURCE_ACTION_LABELS = { sleep: 'Schlafen', wake: 'Aufwecken', close: 'Schließen', kill: 'Beenden' };

let resourceTimer = null;
let resourceSort = 'cpu';
let resourceEditedAt = 0;
let resourceSaveTimer = null;
let resourcePendingKill = null;
let resourceSnapshot = null;

const formatNumber = (value, digits = 1) => Number(value || 0).toLocaleString('de-DE', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
const formatPercent = (value) => `${formatNumber(value)} %`;

function formatMemory(mb) {
  const value = Number(mb) || 0;
  return value >= 1024 ? `${formatNumber(value / 1024)} GB` : `${Math.round(value)} MB`;
}

function resourcePanelOpen() {
  return Boolean(els.resPanel && !els.resPanel.hidden);
}

function openResourcePanel({ focusProcesses = false } = {}) {
  if (!els.resPanel) return;
  if (els.mediaHub && !els.mediaHub.hidden) closeMediaHub();
  if (els.resPanel.hidden) {
    els.resPanel.hidden = false;
    els.resPanel.setAttribute('aria-hidden', 'false');
    els.resourceHudToggle?.classList.add('is-active');
    els.resourceHudToggle?.setAttribute('aria-expanded', 'true');
    reportLayout();
  }
  refreshResources();
  if (resourceTimer) clearInterval(resourceTimer);
  resourceTimer = setInterval(refreshResources, 2000);
  if (focusProcesses) els.resProcTitle?.scrollIntoView({ block: 'start' });
}

function closeResourcePanel() {
  if (!els.resPanel || els.resPanel.hidden) return;
  els.resPanel.hidden = true;
  els.resPanel.setAttribute('aria-hidden', 'true');
  els.resourceHudToggle?.classList.remove('is-active');
  els.resourceHudToggle?.setAttribute('aria-expanded', 'false');
  if (resourceTimer) clearInterval(resourceTimer);
  resourceTimer = null;
  resourcePendingKill = null;
  reportLayout();
}

async function refreshResources() {
  if (!resourcePanelOpen()) return;
  try {
    const snapshot = await api.getResources();
    if (snapshot) {
      resourceSnapshot = snapshot;
      renderResources(snapshot);
    }
  } catch (error) {
    console.error('[ressourcen] Aktualisierung fehlgeschlagen:', error);
  }
}

/* Verlauf: eine Linie pro Grafik, Limit als gestrichelte Linie, Fadenkreuz beim Überfahren. */
const RESOURCE_HISTORY_SLOTS = 90;

function drawResourceChart(container, values, { max, limit, format }) {
  if (!container) return;
  container.__chart = { values, max, limit, format };
  const canvas = container.querySelector('canvas');
  const width = Math.max(1, container.clientWidth);
  const height = Math.max(1, container.clientHeight);
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const styles = getComputedStyle(document.documentElement);
  const accent = styles.getPropertyValue('--accent').trim() || '#7c6cff';
  const faint = styles.getPropertyValue('--text-faint').trim() || 'rgba(255,255,255,0.5)';
  const stroke = styles.getPropertyValue('--stroke').trim() || 'rgba(255,255,255,0.1)';
  const top = 6;
  const bottom = height - 2;
  const step = width / (RESOURCE_HISTORY_SLOTS - 1);
  const offset = RESOURCE_HISTORY_SLOTS - values.length;
  const x = (index) => (index + offset) * step;
  const y = (value) => bottom - (Math.min(value, max) / max) * (bottom - top);

  // Grundlinie
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, bottom + 0.5);
  ctx.lineTo(width, bottom + 0.5);
  ctx.stroke();

  if (values.length > 1) {
    const gradient = ctx.createLinearGradient(0, top, 0, bottom);
    const [r, g, b] = hexToRgb(accent);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.26)`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.beginPath();
    values.forEach((value, index) => (index ? ctx.lineTo(x(index), y(value)) : ctx.moveTo(x(index), y(value))));
    ctx.lineTo(x(values.length - 1), bottom);
    ctx.lineTo(x(0), bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    values.forEach((value, index) => (index ? ctx.lineTo(x(index), y(value)) : ctx.moveTo(x(index), y(value))));
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  if (limit) {
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = faint;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, Math.round(y(limit)) + 0.5);
    ctx.lineTo(width, Math.round(y(limit)) + 0.5);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Fadenkreuz
  const hover = container.__hover;
  const tip = container.querySelector('.res-chart__tip');
  if (hover != null && values.length) {
    const index = Math.max(0, Math.min(values.length - 1, Math.round(hover / step) - offset));
    const px = x(index);
    ctx.strokeStyle = faint;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.round(px) + 0.5, top);
    ctx.lineTo(Math.round(px) + 0.5, bottom);
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(px, y(values[index]), 4, 0, Math.PI * 2);
    ctx.fill();
    const secondsAgo = (values.length - 1 - index) * 2;
    tip.textContent = `${format(values[index])} · ${secondsAgo ? `vor ${secondsAgo} s` : 'jetzt'}`;
    tip.hidden = false;
    tip.style.left = `${Math.min(Math.max(px, 40), width - 40)}px`;
  } else if (tip) {
    tip.hidden = true;
  }
}

function bindResourceChart(container) {
  if (!container) return;
  container.addEventListener('pointermove', (event) => {
    container.__hover = event.clientX - container.getBoundingClientRect().left;
    const chart = container.__chart;
    if (chart) drawResourceChart(container, chart.values, chart);
  });
  container.addEventListener('pointerleave', () => {
    container.__hover = null;
    const chart = container.__chart;
    if (chart) drawResourceChart(container, chart.values, chart);
  });
}

function renderResources(snapshot) {
  const settings = snapshot.settings || {};
  const cpuLimitActive = settings.enabled && settings.cpuLimit < 100;
  const ramLimitActive = settings.enabled && settings.ramLimit > 0;

  els.resCpuValue.textContent = formatPercent(snapshot.cpu);
  els.resRamValue.textContent = formatMemory(snapshot.memory);
  els.resRamSub.textContent = `von ${formatMemory(snapshot.systemMemory)} im System`;
  els.resCpuLimitLabel.textContent = cpuLimitActive
    ? `Limit ${settings.cpuLimit} % · ${snapshot.hardCap.active ? 'hart' : 'sanft'}`
    : '';
  els.resRamLimitLabel.textContent = ramLimitActive ? `Limit ${formatMemory(settings.ramLimit)}` : '';
  els.resMeta.textContent = `${snapshot.tabCount} Tabs · ${snapshot.sleepingCount} schlafend · ${snapshot.cores} CPU-Kerne`;

  drawResourceChart(els.resCpuChart, snapshot.history.cpu, {
    max: 100,
    limit: cpuLimitActive ? settings.cpuLimit : null,
    format: formatPercent
  });
  const ramPeak = Math.max(...snapshot.history.memory, 1);
  drawResourceChart(els.resRamChart, snapshot.history.memory, {
    max: Math.max(ramLimitActive ? settings.ramLimit * 1.1 : 0, ramPeak * 1.25, 256),
    limit: ramLimitActive ? settings.ramLimit : null,
    format: formatMemory
  });

  syncResourceForm(snapshot);
  renderResourceEvents(snapshot.events || []);
  renderResourceProcesses(snapshot.processes || []);
}

function syncResourceForm(snapshot) {
  const settings = snapshot.settings || {};
  const ramMax = Math.max(1024, Math.min(65536, Math.floor(snapshot.systemMemory / 256) * 256));
  if (Number(els.resRamLimit.max) !== ramMax) els.resRamLimit.max = String(ramMax);

  els.resLimits.classList.toggle('is-off', !settings.enabled);
  els.resHardCap.disabled = !snapshot.hardCap.available;
  els.resHardCapNote.textContent = snapshot.hardCap.available
    ? (snapshot.hardCap.active ? 'Aktiv: Windows begrenzt die CPU-Zeit des Browsers.' : 'Windows begrenzt die CPU-Zeit des Browsers.')
    : `Nicht verfügbar. ${snapshot.hardCap.reason} Es wird sanft geregelt.`;

  // Während der Eingabe nicht mit älteren Werten überschreiben.
  if (Date.now() - resourceEditedAt < 2500) return;
  els.resEnabled.checked = Boolean(settings.enabled);
  els.resCpuLimit.value = String(settings.cpuLimit ?? 50);
  els.resRamLimit.value = String(settings.ramLimit > 0 ? settings.ramLimit : ramMax);
  els.resHardCap.checked = Boolean(settings.hardCap) && snapshot.hardCap.available;
  els.resLowPriority.checked = Boolean(settings.lowPriority);
  updateResourceOutputs();
}

function updateResourceOutputs() {
  els.resCpuLimitValue.textContent = Number(els.resCpuLimit.value) >= 100 ? 'Kein Limit' : `${els.resCpuLimit.value} %`;
  const ram = Number(els.resRamLimit.value);
  els.resRamLimitValue.textContent = ram >= Number(els.resRamLimit.max) ? 'Kein Limit' : formatMemory(ram);
}

function saveResourceSettings() {
  resourceEditedAt = Date.now();
  updateResourceOutputs();
  if (resourceSaveTimer) clearTimeout(resourceSaveTimer);
  resourceSaveTimer = setTimeout(() => {
    resourceSaveTimer = null;
    const ram = Number(els.resRamLimit.value);
    saveSettingsPatch({
      performance: {
        enabled: els.resEnabled.checked,
        cpuLimit: Number(els.resCpuLimit.value),
        ramLimit: ram >= Number(els.resRamLimit.max) ? 0 : ram,
        hardCap: els.resHardCap.disabled ? Boolean(appSettings.performance?.hardCap) : els.resHardCap.checked,
        lowPriority: els.resLowPriority.checked
      }
    });
    setTimeout(refreshResources, 400);
  }, 250);
}

function renderResourceEvents(events) {
  els.resEventsSection.hidden = events.length === 0;
  els.resEvents.replaceChildren(...events.map((event) => {
    const item = document.createElement('li');
    const time = document.createElement('time');
    time.textContent = new Date(event.time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const text = document.createElement('span');
    text.textContent = event.text;
    item.append(time, text);
    return item;
  }));
}

function renderResourceProcesses(processes) {
  const sorted = [...processes].sort((a, b) => (b[resourceSort] - a[resourceSort]) || a.name.localeCompare(b.name));
  const fragment = document.createDocumentFragment();

  for (const row of sorted) {
    const item = document.createElement('li');
    item.className = `res-proc res-proc--${row.kind}${row.sleeping ? ' is-sleeping' : ''}`;
    // Fokussierbar, damit die Aktionen auch per Tastatur erreichbar sind.
    if (row.actions?.length) item.tabIndex = 0;

    const icon = document.createElement('span');
    icon.className = 'res-proc__icon';
    icon.setAttribute('aria-hidden', 'true');
    const favicon = row.tabId ? state.tabs.find((tab) => tab.id === row.tabId)?.favicon : '';
    if (favicon && /^(https?:|data:image\/)/.test(favicon)) {
      const img = document.createElement('img');
      img.src = favicon;
      img.alt = '';
      icon.appendChild(img);
    } else {
      icon.textContent = RESOURCE_KIND_ICONS[row.kind] || 'P';
    }

    const text = document.createElement('span');
    text.className = 'res-proc__text';
    const name = document.createElement('span');
    name.className = 'res-proc__name';
    name.textContent = row.name;
    name.title = row.name;
    const detail = document.createElement('span');
    detail.className = 'res-proc__detail';
    detail.textContent = row.pid ? `${row.detail} · PID ${row.pid}` : row.detail;
    text.append(name, detail);

    const cpu = document.createElement('span');
    cpu.className = 'res-proc__num';
    cpu.classList.toggle('is-sorted', resourceSort === 'cpu');
    cpu.textContent = row.sleeping ? '–' : formatPercent(row.cpu);
    cpu.title = 'CPU';
    const memory = document.createElement('span');
    memory.className = 'res-proc__num';
    memory.classList.toggle('is-sorted', resourceSort === 'memory');
    memory.textContent = row.sleeping ? '–' : formatMemory(row.memory);
    memory.title = 'RAM';

    const actions = document.createElement('span');
    actions.className = 'res-proc__actions';
    for (const action of row.actions || []) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `res-proc__btn res-proc__btn--${action}`;
      const confirming = action === 'kill' && resourcePendingKill === row.pid;
      button.textContent = confirming ? 'Sicher?' : RESOURCE_ACTION_LABELS[action];
      button.classList.toggle('is-confirm', confirming);
      button.addEventListener('click', () => runResourceAction(action, row));
      actions.appendChild(button);
    }

    item.append(icon, text, cpu, memory, actions);
    fragment.appendChild(item);
  }
  els.resProcs.replaceChildren(fragment);
}

async function runResourceAction(action, row) {
  // Hilfsprozesse erst nach einer Bestätigung beenden.
  if (action === 'kill' && resourcePendingKill !== row.pid) {
    resourcePendingKill = row.pid;
    if (resourceSnapshot) renderResourceProcesses(resourceSnapshot.processes);
    return;
  }
  resourcePendingKill = null;
  await api.resourceAction({ type: action, pid: row.pid, tabId: row.tabId });
  setTimeout(refreshResources, 2100);
}

bindResourceChart(els.resCpuChart);
bindResourceChart(els.resRamChart);

els.resourceHudToggle?.addEventListener('click', () => {
  if (resourcePanelOpen()) closeResourcePanel();
  else openResourcePanel();
});
els.resPanelClose?.addEventListener('click', closeResourcePanel);

for (const input of [els.resEnabled, els.resHardCap, els.resLowPriority]) {
  input?.addEventListener('change', saveResourceSettings);
}
for (const input of [els.resCpuLimit, els.resRamLimit]) {
  input?.addEventListener('input', saveResourceSettings);
}

for (const button of els.resSortButtons) {
  button.addEventListener('click', () => {
    resourceSort = button.dataset.sort === 'memory' ? 'memory' : 'cpu';
    for (const other of els.resSortButtons) {
      const selected = other === button;
      other.classList.toggle('is-active', selected);
      other.setAttribute('aria-pressed', String(selected));
    }
    if (resourceSnapshot) renderResourceProcesses(resourceSnapshot.processes);
  });
}

api.onOpenTaskManager?.(() => {
  if (resourcePanelOpen()) closeResourcePanel();
  else openResourcePanel({ focusProcesses: true });
});
api.onResourceEvent?.(() => refreshResources());

/* --------------------------------------------------------------- Media-Hub */

let mediaItems = [];
let mediaHubTimer = null;
let mediaRefreshInFlight = false;
let mediaSliderBusy = false;

function formatMediaTime(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

function mediaSliderBusyCheck() {
  if (mediaSliderBusy) return true;
  const active = document.activeElement;
  return Boolean(active && els.mediaHub?.contains(active) && active.matches('input[type="range"]'));
}


if (els.mediaHub) {
  els.mediaHub.addEventListener('pointerdown', (event) => {
    if (event.target instanceof Element && event.target.matches('input[type="range"]')) {
      mediaSliderBusy = true;
    }
  });
}
window.addEventListener('pointerup', () => {
  mediaSliderBusy = false;
  // Fokus nach dem Ziehen abgeben, damit der Hub wieder automatisch abgleicht.
  const active = document.activeElement;
  if (active && els.mediaHub?.contains(active) && active.matches('input[type="range"]')) active.blur();
});
window.addEventListener('pointercancel', () => { mediaSliderBusy = false; });

function mediaIcon(kind) {
  return kind === 'audio'
    ? '<path d="M8 4.4l7-1.5v8.3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /><circle cx="6" cy="14.2" r="2.2" fill="none" stroke="currentColor" stroke-width="1.3" /><circle cx="13" cy="12.7" r="2.2" fill="none" stroke="currentColor" stroke-width="1.3" />'
    : '<rect x="2.5" y="4" width="15" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.4" /><path d="M8 7.5l4.5 2.5L8 12.5z" fill="currentColor" />';
}

function renderMediaList() {
  if (!els.mediaHubList) return;

  els.mediaHubList.replaceChildren();
  const hasItems = mediaItems.length > 0;
  els.mediaHubEmpty.hidden = hasItems;

  if (!hasItems) return;

  const fragment = document.createDocumentFragment();

  for (const item of mediaItems) {
    const card = document.createElement('article');
    card.className = 'media-item';

    const head = document.createElement('div');
    head.className = 'media-item__head';

    const badge = document.createElement('span');
    badge.className = 'media-item__badge';
    badge.innerHTML = `<svg viewBox="0 0 20 20" width="13" height="13" aria-hidden="true">${mediaIcon(item.kind)}</svg>`;
    badge.title = item.kind === 'audio' ? 'Audio' : 'Video';

    const title = document.createElement('span');
    title.className = 'media-item__title';
    title.textContent = item.title || 'Medienwiedergabe';
    title.title = item.title || '';

    head.append(badge, title);
    card.appendChild(head);

    const tabButton = document.createElement('button');
    tabButton.type = 'button';
    tabButton.className = 'media-item__tab';
    tabButton.textContent = item.tabTitle || 'Tab';
    tabButton.title = `Zu „${item.tabTitle || 'Tab'}“ wechseln`;
    tabButton.addEventListener('click', () => api.activateTab(item.tabId));
    card.appendChild(tabButton);

    const controls = document.createElement('div');
    controls.className = 'media-item__controls';

    const playButton = document.createElement('button');
    playButton.type = 'button';
    playButton.className = 'icon-btn media-item__play';
    playButton.title = item.playing ? 'Pausieren' : 'Abspielen';
    playButton.setAttribute('aria-label', playButton.title);
    playButton.innerHTML = item.playing
      ? '<svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true"><rect x="5" y="4" width="3.5" height="12" rx="1" fill="currentColor" /><rect x="11.5" y="4" width="3.5" height="12" rx="1" fill="currentColor" /></svg>'
      : '<svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true"><path d="M6 4.5l9 5.5-9 5.5z" fill="currentColor" /></svg>';
    playButton.addEventListener('click', async () => {
      await api.mediaCommand({ tabId: item.tabId, mediaId: item.id, action: 'toggle' });
      refreshMediaHub({ force: true });
    });

    const seek = document.createElement('input');
    seek.type = 'range';
    seek.className = 'range media-item__seek';
    seek.min = '0';
    seek.max = '1000';
    seek.step = '1';
    seek.value = String(item.duration ? Math.round((item.currentTime / item.duration) * 1000) : 0);
    seek.disabled = !item.duration;
    seek.setAttribute('aria-label', 'Wiedergabeposition');
    seek.addEventListener('change', async () => {
      await api.mediaCommand({
        tabId: item.tabId,
        mediaId: item.id,
        action: 'seek',
        value: Number(seek.value) / 1000
      });
      refreshMediaHub({ force: true });
    });

    const time = document.createElement('span');
    time.className = 'media-item__time';
    time.textContent = `${formatMediaTime(item.currentTime)} / ${formatMediaTime(item.duration)}`;

    const muteButton = document.createElement('button');
    muteButton.type = 'button';
    muteButton.className = 'icon-btn media-item__mute';
    muteButton.classList.toggle('is-active', item.muted);
    muteButton.title = item.muted ? 'Ton einschalten' : 'Ton ausschalten';
    muteButton.setAttribute('aria-label', muteButton.title);
    muteButton.innerHTML = item.muted
      ? '<svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true"><path d="M4 8v4h3l4 3V5L7 8H4z" fill="currentColor" /><path d="M13.5 7.5l4 5M17.5 7.5l-4 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>'
      : '<svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true"><path d="M4 8v4h3l4 3V5L7 8H4z" fill="currentColor" /><path d="M13 7.5a3.6 3.6 0 0 1 0 5M15.2 5.4a6.6 6.6 0 0 1 0 9.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" /></svg>';
    muteButton.addEventListener('click', async () => {
      await api.mediaCommand({
        tabId: item.tabId,
        mediaId: item.id,
        action: item.muted ? 'unmute' : 'mute'
      });
      refreshMediaHub({ force: true });
    });

    controls.append(playButton, seek, time, muteButton);
    card.appendChild(controls);

    const volumeRow = document.createElement('div');
    volumeRow.className = 'media-item__volume';

    const volumeLabel = document.createElement('span');
    volumeLabel.textContent = `Tab-Lautstärke ${Math.round((item.volume ?? 1) * 100)} %`;

    const volume = document.createElement('input');
    volume.type = 'range';
    volume.className = 'range media-item__volume-range';
    volume.min = '0';
    volume.max = '300';
    volume.step = '1';
    volume.value = String(Math.round((item.volume ?? 1) * 100));
    volume.classList.toggle('is-boost', (item.volume ?? 1) > 1.0001);
    volume.setAttribute('aria-label', 'Tab-Lautstärke');
    volume.addEventListener('input', () => {
      const percent = Number(volume.value);
      volumeLabel.textContent = `Tab-Lautstärke ${Math.round(percent)} %`;
      volume.classList.toggle('is-boost', percent > 100);
      api.setTabVolume(item.tabId, percent / 100);
    });

    volumeRow.append(volumeLabel, volume);
    card.appendChild(volumeRow);
    fragment.appendChild(card);
  }

  els.mediaHubList.appendChild(fragment);
}

function renderMediaMixer() {
  if (!els.mediaMixerList) return;

  els.mediaMixerList.replaceChildren();
  const tabs = state.tabs.filter((tab) => !tab.sleeping);
  els.mediaMixerEmpty.hidden = tabs.length > 0;

  const fragment = document.createDocumentFragment();

  for (const tab of tabs) {
    const row = document.createElement('div');
    row.className = 'media-mixer';
    row.classList.toggle('is-active', tab.id === state.activeId);

    const head = document.createElement('div');
    head.className = 'media-mixer__head';

    const dot = document.createElement('span');
    dot.className = 'media-mixer__dot';
    dot.classList.toggle('is-audible', Boolean(tab.audible));
    dot.classList.toggle('is-muted', Boolean(tab.muted));
    dot.title = tab.muted ? 'Stummgeschaltet' : tab.audible ? 'Ton aktiv' : 'Kein Ton';

    const title = document.createElement('button');
    title.type = 'button';
    title.className = 'media-mixer__title';
    title.textContent = tab.title || 'Neuer Tab';
    title.title = `Zu „${tab.title || 'Neuer Tab'}“ wechseln`;
    title.addEventListener('click', () => api.activateTab(tab.id));

    const mute = document.createElement('button');
    mute.type = 'button';
    mute.className = 'icon-btn media-mixer__mute';
    mute.classList.toggle('is-active', Boolean(tab.muted));
    mute.title = tab.muted ? 'Stummschaltung aufheben' : 'Tab stummschalten';
    mute.setAttribute('aria-label', mute.title);
    mute.innerHTML = tab.muted
      ? '<svg viewBox="0 0 20 20" width="13" height="13" aria-hidden="true"><path d="M4 8v4h3l4 3V5L7 8H4z" fill="currentColor" /><path d="M13.5 7.5l4 5M17.5 7.5l-4 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>'
      : '<svg viewBox="0 0 20 20" width="13" height="13" aria-hidden="true"><path d="M4 8v4h3l4 3V5L7 8H4z" fill="currentColor" /><path d="M13 7.5a3.6 3.6 0 0 1 0 5M15.2 5.4a6.6 6.6 0 0 1 0 9.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" /></svg>';
    mute.addEventListener('click', () => api.commandTab(tab.id, tab.muted ? 'unmute' : 'mute'));

    head.append(dot, title, mute);
    row.appendChild(head);

    const volumeRow = document.createElement('div');
    volumeRow.className = 'media-mixer__volume';

    const volume = document.createElement('input');
    volume.type = 'range';
    volume.className = 'range';
    volume.min = '0';
    volume.max = '300';
    volume.step = '1';
    volume.value = String(Math.round((tab.volume ?? 1) * 100));
    volume.classList.toggle('is-boost', (tab.volume ?? 1) > 1.0001);
    volume.setAttribute('aria-label', `Lautstärke für ${tab.title || 'Tab'}`);
    volume.addEventListener('input', () => {
      const percent = Number(volume.value);
      volume.classList.toggle('is-boost', percent > 100);
      value.textContent = `${Math.round(percent)} %`;
      api.setTabVolume(tab.id, percent / 100);
    });

    const value = document.createElement('span');
    value.className = 'media-mixer__value';
    value.textContent = `${Math.round((tab.volume ?? 1) * 100)} %`;

    volumeRow.append(volume, value);
    row.appendChild(volumeRow);
    fragment.appendChild(row);
  }

  els.mediaMixerList.appendChild(fragment);
}

async function refreshMediaHub({ force = false } = {}) {
  if (!els.mediaHub || els.mediaHub.hidden || mediaRefreshInFlight) return;

  mediaRefreshInFlight = true;
  try {
    const items = await api.listMedia();
    mediaItems = Array.isArray(items) ? items : [];

    if (els.mediaHubStatus) {
      els.mediaHubStatus.textContent = mediaItems.length
        ? `${mediaItems.length} ${mediaItems.length === 1 ? 'Medium' : 'Medien'} erkannt`
        : 'Keine Wiedergabe';
    }

    if (force || !mediaSliderBusyCheck()) {
      renderMediaList();
      renderMediaMixer();
    }
  } catch (error) {
    console.error('[media] Aktualisierung fehlgeschlagen:', error);
    if (els.mediaHubStatus) els.mediaHubStatus.textContent = 'Aktualisierung fehlgeschlagen';
  } finally {
    mediaRefreshInFlight = false;
  }
}

function openMediaHub() {
  if (!els.mediaHub || !els.mediaHub.hidden) return;
  if (resourcePanelOpen()) closeResourcePanel();

  els.mediaHub.hidden = false;
  els.mediaHub.setAttribute('aria-hidden', 'false');
  els.mediaHubToggle?.classList.add('is-active');
  reportLayout();
  refreshMediaHub({ force: true });

  if (mediaHubTimer) clearInterval(mediaHubTimer);
  mediaHubTimer = setInterval(() => refreshMediaHub(), 2000);
}

function closeMediaHub() {
  if (!els.mediaHub || els.mediaHub.hidden) return;

  els.mediaHub.hidden = true;
  els.mediaHub.setAttribute('aria-hidden', 'true');
  els.mediaHubToggle?.classList.remove('is-active');

  if (mediaHubTimer) {
    clearInterval(mediaHubTimer);
    mediaHubTimer = null;
  }

  reportLayout();
}

if (els.mediaHubToggle) {
  els.mediaHubToggle.addEventListener('click', () => {
    if (els.mediaHub.hidden) openMediaHub();
    else closeMediaHub();
  });
}
if (els.mediaHubClose) els.mediaHubClose.addEventListener('click', closeMediaHub);

if (els.mediaRefresh) {
  els.mediaRefresh.addEventListener('click', () => refreshMediaHub({ force: true }));
}

if (els.mediaPauseAll) {
  els.mediaPauseAll.addEventListener('click', async () => {
    if (els.mediaHubStatus) els.mediaHubStatus.textContent = 'Pausiere …';
    await api.pauseAllMedia();
    refreshMediaHub({ force: true });
  });
}


els.restoreSessionToggle.addEventListener('change', () => {
  saveSettingsPatch({ ui: { restoreSession: els.restoreSessionToggle.checked } });
});

els.historySearch.addEventListener('input', renderHistory);
els.historyClear.addEventListener('click', async () => {
  await api.saveSettings({ history: [] });
});

if (els.adblockToggle) {
  els.adblockToggle.addEventListener('change', () => {
    saveSettingsPatch({ privacy: { adblock: els.adblockToggle.checked } });
  });
}
if (els.trackingToggle) {
  els.trackingToggle.addEventListener('change', () => {
    saveSettingsPatch({ privacy: { trackingProtection: els.trackingToggle.checked } });
  });
}

els.hotkeysReset.addEventListener('click', () => {
  recordingHotkey = null;
  setHotkeyConflict();
  saveSettingsPatch({ hotkeys: cloneHotkeys(DEFAULT_HOTKEYS) });
});

els.zoomReset.addEventListener('click', () => api.zoom('reset'));

els.findInput.addEventListener('input', () => runFind(true, false));
els.findInput.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  runFind(!event.shiftKey, true);
});
els.findPrev.addEventListener('click', () => runFind(false, true));
els.findNext.addEventListener('click', () => runFind(true, true));
els.findClose.addEventListener('click', () => closeFind());

els.tabSearchInput.addEventListener('input', () => {
  tabSearchSelection = 0;
  renderTabSearch();
});
els.tabSearchInput.addEventListener('keydown', (event) => {
  const matches = filteredTabs();
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    if (!matches.length) return;
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    tabSearchSelection = (tabSearchSelection + direction + matches.length) % matches.length;
    renderTabSearch();
  } else if (event.key === 'Enter' && matches[tabSearchSelection]) {
    event.preventDefault();
    const id = matches[tabSearchSelection].id;
    closeTabSearch({ restoreFocus: false });
    api.activateTab(id);
  }
});
els.tabSearch.addEventListener('click', (event) => {
  if (event.target === els.tabSearch) closeTabSearch();
});

document.addEventListener('pointerdown', (event) => {
  if (!els.contextMenu.hidden && !event.target.closest('#context-menu')) closeContextMenu();
});
window.addEventListener('blur', closeContextMenu);

els.tabs.addEventListener('dragover', (event) => {
  if (event.target === els.tabs && draggedTabId) event.preventDefault();
});
els.tabs.addEventListener('drop', (event) => {
  if (event.target !== els.tabs || !draggedTabId) return;
  event.preventDefault();
  const remaining = state.tabs.filter((entry) => entry.id !== draggedTabId);
  const pinnedCount = remaining.filter((entry) => entry.pinned).length;
  const dragged = state.tabs.find((entry) => entry.id === draggedTabId);
  api.moveTab(draggedTabId, dragged?.pinned ? pinnedCount : remaining.length);
  finishTabDrag();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;

  if (!els.contextMenu.hidden) {
    event.preventDefault();
    closeContextMenu();
    return;
  }

  if (!els.findbar.hidden) {
    event.preventDefault();
    closeFind();
    return;
  }

  if (!els.commandPalette.hidden) {
    event.preventDefault();
    closeCommandPalette();
    return;
  }

  if (!els.tabSearch.hidden) {
    event.preventDefault();
    closeTabSearch();
    return;
  }

  if (!els.settings.hidden) {
    event.preventDefault();
    closeSettings();
    return;
  }

  if (!els.studio.hidden) {
    event.preventDefault();
    closeStudio();
    return;
  }

  if (els.mediaHub && !els.mediaHub.hidden) {
    event.preventDefault();
    closeMediaHub();
  }
});

els.commandPalette.addEventListener('click', (event) => {
  if (event.target === els.commandPalette) closeCommandPalette();
});

els.commandPaletteInput.addEventListener('input', () => {
  commandPaletteSelection = 0;
  renderCommandPalette();
});
els.commandPaletteInput.addEventListener('keydown', (event) => {
  const matches = filteredCommandItems();
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    if (!matches.length) return;
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    commandPaletteSelection = (commandPaletteSelection + direction + matches.length) % matches.length;
    renderCommandPalette();
  } else if (event.key === 'Enter' && matches[commandPaletteSelection]) {
    event.preventDefault();
    matches[commandPaletteSelection].run();
  }
});

if (els.splitNarrower) {
  els.splitNarrower.addEventListener('click', () => {
    api.splitResize(Math.max(0.2, state.splitRatio - 0.05));
  });
}
if (els.splitWider) {
  els.splitWider.addEventListener('click', () => {
    api.splitResize(Math.min(0.8, state.splitRatio + 0.05));
  });
}
if (els.splitClose) {
  els.splitClose.addEventListener('click', () => api.unsplit());
}

api.onState((nextState) => {
  const activeChanged = nextState.activeId !== state.activeId;

  state.tabs = Array.isArray(nextState.tabs) ? nextState.tabs : [];
  state.activeId = nextState.activeId;
  state.splitMode = Boolean(nextState.splitMode);
  state.splitLeftId = nextState.splitLeftId || null;
  state.splitRightId = nextState.splitRightId || null;
  state.splitRatio = typeof nextState.splitRatio === 'number' ? nextState.splitRatio : 0.5;

  if (activeChanged) {
    omniboxDirty = false;
    closeFind({ restoreFocus: false });
    closeContextMenu();
  }
  render(activeChanged);
  renderSplitControl();
  if (els.mediaHub && !els.mediaHub.hidden) {
    if (!mediaSliderBusyCheck()) renderMediaMixer();
    if (mediaHubTimer) refreshMediaHub();
  }
  if (!els.tabSearch.hidden) renderTabSearch();
});

api.onFullscreen(({ fullscreen }) => {
  document.body.classList.toggle('is-fullscreen', Boolean(fullscreen));
  reportLayout();
});

api.onWindowState(({ maximized }) => {
  els.winMax.title = maximized ? 'Wiederherstellen' : 'Maximieren';
  els.winMax.setAttribute('aria-label', maximized ? 'Wiederherstellen' : 'Maximieren');

  els.winMax.innerHTML = maximized
    ? `<svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
         <rect x="2.2" y="3.4" width="4.6" height="4.6" rx="0.9" fill="none" stroke="currentColor" stroke-width="1.1" />
         <path d="M3.6 2.6h3.5a1 1 0 0 1 1 1v3.5" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" />
       </svg>`
    : `<svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
         <rect x="2.4" y="2.4" width="5.2" height="5.2" rx="1" fill="none" stroke="currentColor" stroke-width="1.1" />
       </svg>`;
});

api.onFocusOmnibox(() => {
  els.omnibox.focus();
  els.omnibox.select();
});

api.onOpenSettings(() => {
  if (els.settings.hidden) openSettings();
  else closeSettings();
});

api.onOpenTabSearch(() => {
  if (els.tabSearch.hidden) openTabSearch();
  else closeTabSearch();
});

api.onOpenCommandPalette(() => {
  if (els.commandPalette.hidden) openCommandPalette();
  else closeCommandPalette();
});

api.onOpenFind(() => {
  if (els.findbar.hidden) openFind();
  else {
    els.findInput.focus();
    els.findInput.select();
  }
});

api.onFindResult((result) => {
  if (els.findbar.hidden || !result) return;
  if (!result.matches) {
    els.findCount.textContent = 'Keine Treffer';
    els.findCount.classList.add('is-empty');
  } else {
    els.findCount.textContent = `${result.activeMatchOrdinal || 1} / ${result.matches}`;
    els.findCount.classList.remove('is-empty');
  }
});

api.onTheme((nextTheme) => {
  if (!nextTheme || typeof nextTheme !== 'object') return;
  theme = { ...theme, ...nextTheme };
  applyTheme(theme);
  if (!els.studio.hidden) syncThemeInputs({ preserveFocus: true });
});

api.onSettings((nextSettings) => {
  applySettings(nextSettings, { preserveFormFocus: true });
});

api.onHistory((history) => {
  appSettings.history = Array.isArray(history) ? history : appSettings.history;
  renderHistory();
});

// Einzelner neuer/aktualisierter Verlaufseintrag statt der ganzen Liste.
api.onHistoryEntry?.((entry) => {
  if (!entry || typeof entry.id !== 'string') return;
  const history = (appSettings.history || []).filter((item) => item.id !== entry.id);
  history.unshift(entry);
  if (history.length > 2000) history.length = 2000;
  appSettings.history = history;
  if (!els.settings.hidden) renderHistory();
});

api.onWindowFocus?.(setWindowFocus);

api.onDownloads((list) => {
  downloads = Array.isArray(list) ? list : downloads;
  renderDownloads();
});

api.onExtensions((list) => {
  renderExtensions(list);
});

api
  .listExtensions()
  .then((list) => renderExtensions(list))
  .catch((error) => console.error('[extensions] Laden fehlgeschlagen:', error));

api
  .listDownloads()
  .then((list) => {
    downloads = Array.isArray(list) ? list : downloads;
    renderDownloads();
  })
  .catch((error) => console.error('[downloads] Laden fehlgeschlagen:', error));

let lastLayoutKey = '';

function reportLayout() {
  const chromeHeight = Math.round(els.chrome.getBoundingClientRect().height);
  const vertical = document.body.dataset.tabLayout === 'vertical';
  const sidebarWidth = vertical ? Math.round(els.sidebar.getBoundingClientRect().width) : 0;
  const dockPanel = [els.mediaHub, els.resPanel].find((panel) => panel && !panel.hidden);
  const dockWidth = dockPanel ? Math.round(dockPanel.getBoundingClientRect().width) : 0;

  document.documentElement.style.setProperty('--chrome-height', `${chromeHeight}px`);
  document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
  document.documentElement.style.setProperty('--dock-width', `${dockWidth}px`);

  const key = `${chromeHeight}:${sidebarWidth}:${dockWidth}`;
  if (key === lastLayoutKey) return;

  lastLayoutKey = key;
  api.setDock(dockWidth);
  api.reportLayout({ chromeHeight, sidebarWidth });
}

const layoutObserver = new ResizeObserver(() => reportLayout());
layoutObserver.observe(els.chrome);
layoutObserver.observe(els.sidebar);
window.addEventListener('resize', reportLayout);

let sidebarResizeActive = false;
els.sidebarResize.addEventListener('mousedown', (event) => {
  if (document.body.dataset.tabLayout !== 'vertical') return;
  sidebarResizeActive = true;
  document.body.classList.add('is-resizing-sidebar');
  event.preventDefault();
});

window.addEventListener('mousemove', (event) => {
  if (!sidebarResizeActive) return;
  const width = Math.max(180, Math.min(460, event.clientX));
  els.sidebar.style.width = `${width}px`;
  reportLayout();
});

window.addEventListener('mouseup', () => {
  if (!sidebarResizeActive) return;
  sidebarResizeActive = false;
  document.body.classList.remove('is-resizing-sidebar');
  const width = Math.round(els.sidebar.getBoundingClientRect().width);
  appSettings.ui.sidebarWidth = width;
  saveSettingsPatch({ ui: { sidebarWidth: width } });
});

reportLayout();

if (document.fonts?.ready) {
  document.fonts.ready.then(reportLayout).catch(() => {});
}

/* --------------------------------------------------------- Initialisierung */

renderPresets();
applyTheme(theme);
syncThemeInputs();
buildSearchEngineOptions();
applyTabLayout(appSettings.ui.tabLayout);
applyDensity();
syncSettingsForm();
render();

api
// Medien-Tastenkürzel (global, greifen nicht in Eingabefeldern).
window.addEventListener('keydown', (event) => {
  const target = event.target;
  const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
  if (isInput) return;

  const active = getActive();
  if (!active) return;

  const key = String(event.key || '').toLowerCase();
  let handled = false;

  if (key === ' ' || key === 'k') {
    // Play/Pause des ersten Mediums im aktiven Tab.
    api.mediaCommand({ tabId: active.id, action: 'toggle' });
    handled = true;
  } else if (key === 'arrowup') {
    const next = Math.min(3, (active.volume ?? 1) + 0.05);
    api.setTabVolume(active.id, next);
    handled = true;
  } else if (key === 'arrowdown') {
    const next = Math.max(0, (active.volume ?? 1) - 0.05);
    api.setTabVolume(active.id, next);
    handled = true;
  } else if (key === 'm') {
    api.commandTab(active.id, active.muted ? 'unmute' : 'mute');
    handled = true;
  } else if (key === 'p') {
    api.pauseAllMedia();
    handled = true;
  }

  if (handled) {
    event.preventDefault();
    event.stopPropagation();
  }
});

api
  .getSettings()
  .then((next) => {
    if (next) applySettings(next);
  })
  .catch((error) => console.error('[settings] Laden fehlgeschlagen:', error));
