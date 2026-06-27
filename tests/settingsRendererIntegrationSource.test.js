'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('index loads settings styles and renderer module before shell bootstrap', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const settingsCss = source.indexOf('./src/renderer/styles/settings.css');
  const providerIndex = source.indexOf('./src/renderer/providers/mountProviderStatus.js');
  const settingsIndex = source.indexOf('./src/renderer/settings/mountSettingsPanel.js');
  const shellIndex = source.indexOf('./src/renderer/shell/mountShell.js');

  assert.equal(settingsCss > -1, true);
  assert.equal(settingsIndex > providerIndex, true);
  assert.equal(shellIndex > settingsIndex, true);
});

test('renderer bootstrap requires the settings panel module', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'bootstrap.js'), 'utf8');

  assert.match(source, /ZeusSettingsPanel/);
  assert.match(source, /mountSettingsPanel/);
});

test('shell opens settings through a dedicated renderer module', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');

  assert.match(source, /data-open-settings/);
  assert.match(source, /ZeusSettingsPanel\.mountSettingsPanel/);
  assert.doesNotMatch(source, /function renderSettingsPanel/);
});

test('settings panel owns provider URL override UI without vault access', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'settings', 'mountSettingsPanel.js'), 'utf8');

  assert.match(source, /function mountSettingsPanel/);
  assert.match(source, /api\.settings\.setProviderUrl/);
  assert.match(source, /api\.settings\.resetProviderUrl/);
  assert.doesNotMatch(source, /api\.vault/);
  assert.doesNotMatch(source, /require\('node:fs'\)/);
});

test('settings panel exposes limits and vault profile sections through settings API', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'settings', 'mountSettingsPanel.js'), 'utf8');

  assert.match(source, /Limits/);
  assert.match(source, /Vault Profile/);
  assert.match(source, /api\.settings\.setLimits/);
  assert.match(source, /api\.settings\.setVaultRole/);
  assert.match(source, /api\.settings\.resetVaultRole/);
});

test('settings panel displays provider capabilities without owning provider logic', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'settings', 'mountSettingsPanel.js'), 'utf8');

  assert.match(source, /settings-capability-badges/);
  assert.match(source, /formatCapabilities/);
  assert.doesNotMatch(source, /buildChatRequestBody/);
});

test('settings styles stay in the settings stylesheet', () => {
  const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'settings.css'), 'utf8');

  assert.match(index, /src\/renderer\/styles\/settings\.css/);
  assert.match(css, /\.settings-panel/);
  assert.match(css, /\.settings-provider-row/);
  assert.match(css, /\.settings-limit-grid/);
  assert.match(css, /\.settings-vault-role-row/);
});
