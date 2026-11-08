'use strict';

/**
 * Kleine, absichtlich simple Shortcut-Engine.
 *
 * Hotkeys werden als Strings wie "Ctrl+Shift+T" oder "Alt+Left" konfiguriert.
 * Später kann ein Hotkey-Editor diese Strings einfach überschreiben, ohne dass
 * hier etwas angepasst werden muss.
 */

const normalizeKey = (key) => {
  const value = String(key || '').toLowerCase();
  const aliases = {
    esc: 'escape',
    del: 'delete',
    left: 'arrowleft',
    right: 'arrowright',
    up: 'arrowup',
    down: 'arrowdown',
    space: ' ',
    plus: '+',
    add: '+',
    numpadadd: '+',
    subtract: '-',
    numpadsubtract: '-'
  };
  return aliases[value] || value;
};

function parseAccelerator(accelerator) {
  const parts = String(accelerator)
    .split('+')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  const key = parts.pop();
  if (!key) return null;

  return {
    key: normalizeKey(key),
    ctrl: parts.includes('ctrl') || parts.includes('control'),
    alt: parts.includes('alt'),
    shift: parts.includes('shift'),
    meta: parts.includes('meta') || parts.includes('cmd') || parts.includes('super')
  };
}

function compileHotkeys(hotkeyMap) {
  const compiled = [];

  for (const [action, accelerators] of Object.entries(hotkeyMap)) {
    const list = Array.isArray(accelerators) ? accelerators : [accelerators];
    for (const accelerator of list) {
      const parsed = parseAccelerator(accelerator);
      if (parsed) compiled.push({ action, ...parsed });
    }
  }

  return compiled;
}

/**
 * Prüft ein Tastatur-Event gegen die kompilierten Hotkeys.
 * @returns {string|null} Aktionsname oder null.
 */
function matchHotkey(compiled, input) {
  const key = normalizeKey(input.key);
  if (!key) return null;

  for (const hotkey of compiled) {
    if (hotkey.key !== key) continue;
    if (hotkey.ctrl !== Boolean(input.control)) continue;
    if (hotkey.alt !== Boolean(input.alt)) continue;
    if (hotkey.shift !== Boolean(input.shift)) continue;
    if (hotkey.meta !== Boolean(input.meta)) continue;
    return hotkey.action;
  }

  return null;
}

module.exports = { compileHotkeys, matchHotkey, parseAccelerator, normalizeKey };
