'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeAppTheme,
  normalizeVaultThemeOverride,
  resolveEffectiveTheme
} = require('../src/shared/settings/theme');

test('theme contract normalizes supported app modes', () => {
  assert.equal(normalizeAppTheme('dark'), 'dark');
  assert.equal(normalizeAppTheme('light'), 'light');
  assert.equal(normalizeAppTheme('system'), 'system');
  assert.equal(normalizeAppTheme('unknown'), 'dark');
});

test('theme contract normalizes unsupported vault overrides to inherit', () => {
  assert.equal(normalizeVaultThemeOverride('dark'), 'dark');
  assert.equal(normalizeVaultThemeOverride('light'), 'light');
  assert.equal(normalizeVaultThemeOverride('inherit'), 'inherit');
  assert.equal(normalizeVaultThemeOverride('system'), 'inherit');
});

test('theme contract resolves vault override before app and system modes', () => {
  assert.equal(resolveEffectiveTheme('system', 'inherit', true), 'dark');
  assert.equal(resolveEffectiveTheme('system', 'inherit', false), 'light');
  assert.equal(resolveEffectiveTheme('light', 'dark', false), 'dark');
  assert.equal(resolveEffectiveTheme('dark', 'light', true), 'light');
});
