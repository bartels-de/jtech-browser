#!/usr/bin/env node
/*
 * UI regression test for the Tauri bridge (no Rust needed).
 *
 * Loads src/renderer/index.html in Chromium with a fake window.__TAURI__
 * that behaves like the Rust side (async invoke with delays, events such
 * as settings:update after each save, trimmed userName), opens
 * Settings > Allgemein and types a name into #setting-username.
 *
 * Run: node src-tauri/tests-ui/settings-username.js
 * Needs the `playwright` package and a Chromium build.
 */
'use strict';

const path = require('node:path');
const { chromium } = require('playwright');

const INDEX = path.resolve(__dirname, '..', '..', 'src', 'renderer', 'index.html');
const NAME = 'Max Mustermann';

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

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.addInitScript(fakeTauri);
  await page.goto('file://' + INDEX);
  await page.waitForFunction(() => window.jtech && window.__fakeTauri.calls.includes('chrome_ready'));
  await page.waitForTimeout(300);

  await page.click('#settings-open');
  await page.waitForSelector('#setting-username', { state: 'visible' });
  await page.click('#setting-username');
  // Type like a person: some keys fast, some pauses longer than the 250 ms save debounce.
  for (const [i, ch] of [...NAME].entries()) {
    await page.keyboard.type(ch);
    await page.waitForTimeout(i % 4 === 3 ? 320 : 60);
  }
  await page.waitForTimeout(800);

  const result = await page.evaluate(() => ({
    value: document.getElementById('setting-username').value,
    focused: document.activeElement && document.activeElement.id,
    stored: window.__fakeTauri.settings.ui.userName
  }));
  await browser.close();

  const ok = result.value === NAME && result.stored === NAME;
  console.log(JSON.stringify({ ...result, errors }, null, 2));
  if (!ok) {
    console.error(`FAIL: expected "${NAME}" in the field and in the saved settings`);
    process.exit(1);
  }
  console.log('PASS');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
