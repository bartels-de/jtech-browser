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

const { fakeTauri } = require('./fake-tauri');

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
