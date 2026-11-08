'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// config.js braucht app.getPath('userData'). Für den Test wird electron durch
// einen Stub ersetzt, der auf ein temporäres Verzeichnis zeigt.
function loadConfig(userData) {
  const electronPath = require.resolve('electron');
  const configPath = require.resolve('../src/main/config');
  delete require.cache[configPath];
  require.cache[electronPath] = {
    id: electronPath,
    filename: electronPath,
    loaded: true,
    exports: {
      app: {
        getPath: (name) => (name === 'appData' ? path.join(userData, '..', 'appData') : userData)
      }
    }
  };
  try {
    return require(configPath);
  } finally {
    delete require.cache[electronPath];
  }
}

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'jtech-history-'));
}

test('alter Verlauf aus settings.json wird nach history.json migriert', () => {
  const dir = tempDir();
  fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify({
    search: { engine: 'google' },
    history: [
      { url: 'https://example.com/', title: 'Example', timestamp: 2000 },
      { url: 'https://electronjs.org/', title: 'Electron', timestamp: 1000 }
    ]
  }));

  const config = loadConfig(dir);
  config.loadSettings();

  const settings = JSON.parse(fs.readFileSync(path.join(dir, 'settings.json'), 'utf8'));
  const history = JSON.parse(fs.readFileSync(path.join(dir, 'history.json'), 'utf8'));

  assert.equal(settings.history, undefined);
  assert.deepEqual(history.map((entry) => entry.url), ['https://example.com/', 'https://electronjs.org/']);
  assert.equal(config.publicSettings().history.length, 2);
});

test('neue Einträge werden gebündelt gespeichert und beim Flush geschrieben', () => {
  const dir = tempDir();
  const config = loadConfig(dir);
  config.loadSettings();

  const settingsBefore = fs.readFileSync(path.join(dir, 'settings.json'), 'utf8');
  const result = config.addHistoryEntry({ url: 'https://example.com/a', title: 'A' });
  config.addHistoryEntry({ url: 'https://example.com/b', title: 'B' });

  assert.equal(result.url, 'https://example.com/a');
  assert.equal(config.getHistory().length, 2);
  // settings.json bleibt beim Surfen unangetastet.
  assert.equal(fs.readFileSync(path.join(dir, 'settings.json'), 'utf8'), settingsBefore);
  assert.equal(fs.existsSync(path.join(dir, 'history.json')), false);

  config.flushHistory();
  const history = JSON.parse(fs.readFileSync(path.join(dir, 'history.json'), 'utf8'));
  assert.deepEqual(history.map((entry) => entry.url), ['https://example.com/b', 'https://example.com/a']);
});

test('Verlauf löschen über updateSettings leert history.json sofort', () => {
  const dir = tempDir();
  const config = loadConfig(dir);
  config.loadSettings();
  config.addHistoryEntry({ url: 'https://example.com/', title: 'Example' });

  const next = config.updateSettings({ history: [] });

  assert.deepEqual(next.history, []);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'history.json'), 'utf8')), []);
});

test('ungültige URLs landen nicht im Verlauf', () => {
  const dir = tempDir();
  const config = loadConfig(dir);
  config.loadSettings();

  const result = config.addHistoryEntry({ url: 'javascript:alert(1)', title: 'x' });
  assert.equal(result, null);
  assert.equal(config.getHistory().length, 0);
});
