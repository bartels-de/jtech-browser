'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const backgrounds = require('../src/shared/backgrounds');

// config.js braucht app.getPath('userData'): electron durch einen Stub ersetzen.
function loadConfig(userData) {
  const electronPath = require.resolve('electron');
  const configPath = require.resolve('../src/main/config');
  delete require.cache[configPath];
  require.cache[electronPath] = {
    id: electronPath,
    filename: electronPath,
    loaded: true,
    exports: { app: { getPath: (name) => (name === 'appData' ? path.join(userData, '..', 'appData') : userData) } }
  };
  try {
    return require(configPath);
  } finally {
    delete require.cache[electronPath];
  }
}

const tempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'jtech-theme-'));

test('Hintergrund-Liste ist die einzige Quelle für gültige Animationen', () => {
  const config = loadConfig(tempDir());
  assert.ok(backgrounds.IDS.includes('none'));
  assert.ok(backgrounds.IDS.includes(backgrounds.DEFAULT_ID));
  assert.equal(config.DEFAULT_SETTINGS.theme.bgAnimation, backgrounds.DEFAULT_ID);
  for (const id of backgrounds.IDS) {
    assert.equal(config.normalizeTheme({ bgAnimation: id }).bgAnimation, id);
  }
  // Alte Animationen gibt es nicht mehr.
  for (const old of ['orbs', 'particles', 'aurora', 'matrix', 'fog']) {
    assert.equal(config.normalizeTheme({ bgAnimation: old }).bgAnimation, backgrounds.DEFAULT_ID);
  }
});

test('alte Themes und eigene Themes werden beim ersten Start ersetzt, eigenes CSS bleibt', () => {
  const dir = tempDir();
  fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify({
    search: { engine: 'google' },
    theme: { accent: '#ff6b35', bg: '#0a0a0f', bgAnimation: 'aurora', customCssChrome: '.chrome { color: red; }' },
    customThemes: [{ id: 'custom-1', name: 'Alt', theme: { accent: '#123456' } }]
  }));

  const config = loadConfig(dir);
  const settings = config.loadSettings();

  assert.equal(settings.theme.accent, config.DEFAULT_SETTINGS.theme.accent);
  assert.equal(settings.theme.bgAnimation, backgrounds.DEFAULT_ID);
  assert.equal(settings.theme.customCssChrome, '.chrome { color: red; }');
  assert.deepEqual(settings.customThemes, []);

  const stored = JSON.parse(fs.readFileSync(path.join(dir, 'settings.json'), 'utf8'));
  assert.equal(stored.themeVersion, config.THEME_VERSION);
});

test('nach der Migration bleiben neue Themes erhalten', () => {
  const dir = tempDir();
  fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify({
    themeVersion: 2,
    theme: { accent: '#39ff88', bgAnimation: 'hexgrid' },
    customThemes: [{ id: 'custom-2', name: 'Neu', theme: { accent: '#39ff88', bgAnimation: 'hexgrid' } }]
  }));

  const settings = loadConfig(dir).loadSettings();

  assert.equal(settings.theme.accent, '#39ff88');
  assert.equal(settings.theme.bgAnimation, 'hexgrid');
  assert.equal(settings.customThemes.length, 1);
});
