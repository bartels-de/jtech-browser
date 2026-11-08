'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { DEFAULT_SETTINGS, normalizeTheme } = require('../src/main/config');

test('normalizeTheme füllt fehlende Werte mit den Defaults', () => {
  assert.deepEqual(normalizeTheme({}), DEFAULT_SETTINGS.theme);
  assert.deepEqual(normalizeTheme(null), DEFAULT_SETTINGS.theme);
});

test('normalizeTheme akzeptiert gültige Farben und Kurz-Hex', () => {
  const theme = normalizeTheme({
    accent: '#ABCDEF',
    accentAlt: '#0f0',
    bg: '#123456',
    glass: 0.5,
    blur: 18,
    radius: 9
  });

  assert.equal(theme.accent, '#abcdef');
  assert.equal(theme.accentAlt, '#00ff00');
  assert.equal(theme.bg, '#123456');
  assert.equal(theme.glass, 0.5);
  assert.equal(theme.blur, 18);
  assert.equal(theme.radius, 9);
});

test('normalizeTheme begrenzt Zahlen auf sinnvolle Bereiche', () => {
  const theme = normalizeTheme({
    glass: 2,
    blur: 999,
    radius: -10
  });

  assert.equal(theme.glass, 0.95);
  assert.equal(theme.blur, 60);
  assert.equal(theme.radius, 0);
});

test('normalizeTheme ersetzt ungültige Werte durch den Fallback', () => {
  const fallback = {
    accent: '#112233',
    accentAlt: '#445566',
    bg: '#778899',
    text: '#e4e4ec',
    textDim: '#8a8a9a',
    stroke: 8,
    shadow: 35,
    saturation: 180,
    font: 'system',
    fontSize: 100,
    wallpaper: '',
    glass: 0.6,
    blur: 20,
    radius: 12,
    style: 'clean',
    bgAnimation: 'particles',
    animationSpeed: 120,
    animationIntensity: 60,
    glowIntensity: 70,
    transitionSpeed: 90,
    borderStyle: 'glow',
    cursorEffect: 'comet',
    cursorColor: '#abcdef',
    cursorSize: 22,
    cursorIntensity: 80,
    cursorImage: '',
    cursorPreset: '',
    customCssChrome: '',
    customCssNewtab: ''
  };

  const theme = normalizeTheme({
    accent: 'rot',
    accentAlt: '#12345',
    bg: 42,
    text: 123,
    textDim: false,
    stroke: 'viel',
    shadow: '',
    saturation: 'hoch',
    font: 42,
    fontSize: null,
    wallpaper: [],
    glass: 'viel',
    blur: '',
    radius: null,
    style: 'fantasie',
    bgAnimation: 'feuerwerk',
    animationSpeed: 'schnell',
    animationIntensity: 'viel',
    glowIntensity: '',
    transitionSpeed: null,
    borderStyle: 123,
    cursorEffect: 'unbekannt',
    cursorColor: 'rot',
    cursorSize: null,
    cursorIntensity: 'viel'
  }, fallback);

  assert.deepEqual(theme, fallback);
});

test('normalizeTheme verändert fremde Schlüssel nicht', () => {
  const theme = normalizeTheme({ accent: '#000000', unbekannt: 'wert' });
  assert.equal(theme.unbekannt, undefined);
});

test('normalizeTheme validiert Cursor-Effekte', () => {
  const theme = normalizeTheme({
    cursorEffect: 'sparks',
    cursorColor: '#0F0',
    cursorSize: 26,
    cursorIntensity: 75
  });

  assert.equal(theme.cursorEffect, 'sparks');
  assert.equal(theme.cursorColor, '#00ff00');
  assert.equal(theme.cursorSize, 26);
  assert.equal(theme.cursorIntensity, 75);
});

test('normalizeTheme begrenzt Cursor-Werte auf sinnvolle Bereiche', () => {
  const theme = normalizeTheme({
    cursorEffect: 'unbekannt',
    cursorColor: 'keine-farbe',
    cursorSize: 999,
    cursorIntensity: -20
  });

  assert.equal(theme.cursorEffect, DEFAULT_SETTINGS.theme.cursorEffect);
  assert.equal(theme.cursorColor, DEFAULT_SETTINGS.theme.cursorColor);
  assert.equal(theme.cursorSize, 40);
  assert.equal(theme.cursorIntensity, 0);
});
