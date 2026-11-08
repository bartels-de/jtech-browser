'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_SETTINGS,
  normalizeSearch,
  normalizeUi,
  normalizeFavorites
} = require('../src/main/config');

test('Standard-Suchmaschine ist Google', () => {
  assert.equal(DEFAULT_SETTINGS.search.engine, 'google');
  assert.equal(DEFAULT_SETTINGS.search.urlTemplate, 'https://www.google.com/search?q=%s');
  assert.deepEqual(normalizeSearch({}), DEFAULT_SETTINGS.search);
});

test('normalizeSearch setzt die passende URL-Vorlage', () => {
  assert.deepEqual(normalizeSearch({ engine: 'bing' }), {
    engine: 'bing',
    urlTemplate: 'https://www.bing.com/search?q=%s'
  });
  assert.equal(normalizeSearch({ engine: 'unbekannt' }).engine, 'google');
});

test('normalizeSearch akzeptiert nur gültige benutzerdefinierte URLs', () => {
  assert.deepEqual(
    normalizeSearch({ engine: 'custom', urlTemplate: 'https://suche.example/?q=%s' }),
    { engine: 'custom', urlTemplate: 'https://suche.example/?q=%s' }
  );

  assert.equal(normalizeSearch({ engine: 'custom', urlTemplate: 'kein-link' }).engine, 'google');
  assert.equal(normalizeSearch({ engine: 'custom', urlTemplate: 'https://example.com/?q=' }).engine, 'google');
  assert.equal(normalizeSearch({ engine: 'custom', urlTemplate: 'javascript:%s' }).engine, 'google');
});

test('normalizeUi validiert Tab-Layout und Favoritenleiste', () => {
  assert.deepEqual(normalizeUi({ tabLayout: 'vertical', favoritesBar: false }), {
    tabLayout: 'vertical',
    favoritesBar: false,
    sidebarWidth: 252,
    restoreSession: true,
    gamingMode: false,
    userName: '',
    density: 'normal'
  });

  assert.deepEqual(normalizeUi({ tabLayout: 'diagonal', favoritesBar: 'ja' }), DEFAULT_SETTINGS.ui);
});

test('normalizeFavorites filtert ungültige URLs und Duplikate', () => {
  const favorites = normalizeFavorites([
    { id: 'a', title: 'Beispiel', url: 'https://example.com', favicon: 'https://example.com/favicon.ico' },
    { title: '', url: 'https://example.com/', favicon: 'javascript:alert(1)' },
    { title: 'Skript', url: 'javascript:alert(1)' },
    { title: 'FTP', url: 'ftp://example.com' },
    { title: '', url: 'https://jtech.test/pfad' }
  ]);

  assert.equal(favorites.length, 2);
  assert.equal(favorites[0].id, 'a');
  assert.equal(favorites[0].favicon, 'https://example.com/favicon.ico');
  assert.equal(favorites[1].title, 'jtech.test');
  assert.equal(favorites[1].favicon, '');
  assert.ok(favorites[1].id);
});

test('normalizeFavorites verträgt kaputte Eingaben', () => {
  assert.deepEqual(normalizeFavorites(null), []);
  assert.deepEqual(normalizeFavorites('keine liste'), []);
  assert.deepEqual(normalizeFavorites([null, 42, 'text']), []);
});
