'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

// tabs.js braucht Electron nur für Views und Menüs: durch Stubs ersetzen.
function loadTabManager() {
  const electronPath = require.resolve('electron');
  const tabsPath = require.resolve('../src/main/tabs');
  delete require.cache[tabsPath];
  require.cache[electronPath] = {
    id: electronPath,
    filename: electronPath,
    loaded: true,
    exports: { WebContentsView: class {}, Menu: {}, MenuItem: class {}, clipboard: {} }
  };
  try {
    return require(tabsPath).TabManager;
  } finally {
    delete require.cache[electronPath];
  }
}

const TabManager = loadTabManager();

function manager() {
  const window = { contentView: { children: [], removeChildView() {}, addChildView() {} } };
  const tabs = new TabManager(window, { onState() {}, onInput() {} });
  // Tabs mit Fake-View ohne echte WebContentsView anlegen.
  tabs.addFake = (id, props = {}) => {
    const tab = { ...tabs.newTabRecord('https://example.com'), id, ...props };
    tab.view = props.sleeping ? null : { webContents: { isDestroyed: () => false, close() {} } };
    tabs.tabs.set(id, tab);
    return tab;
  };
  return tabs;
}

test('createLazy legt einen schlafenden Tab ohne Prozess an', () => {
  const tabs = manager();
  const tab = tabs.createLazy({ url: 'https://youtube.com', title: 'YouTube', favicon: 'https://youtube.com/favicon.ico' });
  assert.equal(tab.sleeping, true);
  assert.equal(tab.view, null);
  assert.equal(tab.title, 'YouTube');
  assert.equal(tabs.getState().tabs[0].sleeping, true);
});

test('sleepIdleTabs legt nur lange unbenutzte Hintergrund-Tabs schlafen', () => {
  const tabs = manager();
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  tabs.addFake('aktiv', { lastActiveAt: now - 5 * hour });
  tabs.addFake('alt', { lastActiveAt: now - 2 * hour });
  tabs.addFake('frisch', { lastActiveAt: now - 60 * 1000 });
  tabs.addFake('musik', { lastActiveAt: now - 2 * hour, audible: true });
  tabs.addFake('pin', { lastActiveAt: now - 2 * hour, pinned: true });
  tabs.activeId = 'aktiv';

  const count = tabs.sleepIdleTabs(30 * 60 * 1000, now);

  assert.equal(count, 1);
  assert.equal(tabs.tabs.get('alt').sleeping, true);
  for (const id of ['aktiv', 'frisch', 'musik', 'pin']) assert.equal(tabs.tabs.get(id).sleeping, false, id);
  assert.equal(tabs.sleepIdleTabs(0, now), 0);
});
