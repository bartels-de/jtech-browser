'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { compileHotkeys, matchHotkey } = require('../src/main/shortcuts');

const hotkeys = compileHotkeys({
  newTab: ['Ctrl+T'],
  closeTab: ['Ctrl+W'],
  reopenTab: ['Ctrl+Shift+T'],
  focusOmnibox: ['Ctrl+L', 'Alt+D'],
  reload: ['Ctrl+R', 'F5'],
  back: ['Alt+Left'],
  nextTab: ['Ctrl+Tab'],
  prevTab: ['Ctrl+Shift+Tab'],
  devTools: ['F12']
});

function match(key, modifiers = {}) {
  return matchHotkey(hotkeys, {
    key,
    control: false,
    alt: false,
    shift: false,
    meta: false,
    ...modifiers
  });
}

test('Browser-Hotkeys werden korrekt erkannt', () => {
  assert.equal(match('t', { control: true }), 'newTab');
  assert.equal(match('w', { control: true }), 'closeTab');
  assert.equal(match('t', { control: true, shift: true }), 'reopenTab');
  assert.equal(match('l', { control: true }), 'focusOmnibox');
  assert.equal(match('d', { alt: true }), 'focusOmnibox');
  assert.equal(match('F5'), 'reload');
  assert.equal(match('ArrowLeft', { alt: true }), 'back');
  assert.equal(match('Tab', { control: true }), 'nextTab');
  assert.equal(match('Tab', { control: true, shift: true }), 'prevTab');
  assert.equal(match('F12'), 'devTools');
});

test('Unbelegte Kombinationen lösen keine Aktion aus', () => {
  assert.equal(match('c', { control: true }), null);
  assert.equal(match('t'), null);
  assert.equal(match('T', { control: true, alt: true }), null);
});
