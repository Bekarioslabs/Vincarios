'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_THEME_PACK_ID,
  listBuiltInThemePacks,
  getBuiltInThemePack,
  normalizeThemePackId
} = require('../src/shared/themes/themePacks');

test('built-in theme pack registry exposes High Contrast and Paper with fixed safe token overrides', () => {
  const packs = listBuiltInThemePacks();
  assert.equal(DEFAULT_THEME_PACK_ID, 'default');
  assert.deepEqual(packs.map((pack) => pack.id), ['high-contrast', 'paper']);
  assert.equal(getBuiltInThemePack('high-contrast').baseTheme, 'dark');
  assert.equal(getBuiltInThemePack('paper').baseTheme, 'light');
  assert.equal(getBuiltInThemePack('paper').tokens['--interactive-accent'], '#e9a85c');
  assert.equal(getBuiltInThemePack('high-contrast').tokens['--icon-on-primary-filter'], 'brightness(0) saturate(100%)');
  assert.ok(Object.keys(getBuiltInThemePack('paper').tokens).every((key) => key.startsWith('--')));
});

test('built-in theme pack registry rejects unknown pack ids', () => {
  assert.equal(normalizeThemePackId('paper'), 'paper');
  assert.equal(normalizeThemePackId('unknown'), 'default');
  assert.equal(getBuiltInThemePack('default'), null);
});