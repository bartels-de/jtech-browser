#!/usr/bin/env node
/*
 * UI test: dragging the frameless window from the chrome UI.
 * A mousedown on a `-webkit-app-region: drag` area must call
 * window_start_dragging, a double-click window_toggle_maximize, and
 * buttons inside the title bar must not start a drag.
 *
 * Run: node src-tauri/tests-ui/window-drag.js
 */
'use strict';

const path = require('node:path');
const { chromium } = require('playwright');
const { fakeTauri } = require('./fake-tauri');

const INDEX = path.resolve(__dirname, '..', '..', 'src', 'renderer', 'index.html');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  await page.addInitScript(fakeTauri);
  await page.goto('file://' + INDEX);
  await page.waitForFunction(() => window.jtech && window.__fakeTauri.calls.includes('chrome_ready'));
  await page.waitForTimeout(200);

  const calls = () => page.evaluate(() => window.__fakeTauri.calls.filter((c) => c.startsWith('window_')));
  const reset = () => page.evaluate(() => { window.__fakeTauri.calls.length = 0; });
  const failures = [];

  // WebView2 must see no native drag regions (they swallow the clicks).
  const regions = await page.evaluate(() =>
    [...document.querySelectorAll('*')].filter((el) => getComputedStyle(el).getPropertyValue('-webkit-app-region') === 'drag').length
  );
  if (regions) failures.push(`${regions} elements still have -webkit-app-region: drag`);

  // The gap between the navigation buttons and the omnibox (toolbar background).
  const box = await page.evaluate(() => {
    const nav = document.querySelector('.toolbar .nav-group').getBoundingClientRect();
    const omni = document.querySelector('.toolbar .omnibox').getBoundingClientRect();
    return { x: nav.right, y: nav.top, width: Math.max(0, omni.left - nav.right), height: nav.height };
  });
  if (!box || box.width < 4) failures.push('no toolbar gap to drag from');

  if (box) {
    await reset();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(150);
    const single = await calls();
    if (JSON.stringify(single) !== '["window_start_dragging"]') failures.push('click on drag region: ' + JSON.stringify(single));

    await page.waitForTimeout(600);
    await reset();
    await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(150);
    const double = await calls();
    if (!double.includes('window_toggle_maximize')) failures.push('double-click on drag region: ' + JSON.stringify(double));
  }

  for (const selector of ['#settings-open', '#back', '#omnibox']) {
    await page.waitForTimeout(600);
    await reset();
    await page.click(selector, { force: true });
    await page.waitForTimeout(150);
    if ((await calls()).length) failures.push(`click on ${selector} started a drag`);
    await page.keyboard.press('Escape');
  }
  // Clicking the omnibox padding focuses the input instead of dragging.
  await page.waitForTimeout(600);
  await reset();
  const form = await page.locator('.toolbar .omnibox').boundingBox();
  await page.mouse.click(form.x + 3, form.y + form.height / 2);
  await page.waitForTimeout(150);
  if ((await calls()).length) failures.push('click on the omnibox padding started a drag');

  await browser.close();
  if (pageErrors.length) failures.push('page errors: ' + pageErrors.join(' | '));
  if (failures.length) {
    console.error('FAIL\n' + failures.join('\n'));
    process.exit(1);
  }
  console.log('PASS');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
