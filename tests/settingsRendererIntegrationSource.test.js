'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { formatLimitValue, parseLimitInput } = require('../src/renderer/settings/mountSettingsPanel');

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

  assert.match(source, /VitruviosSettingsPanel/);
  assert.match(source, /mountSettingsPanel/);
});

test('shell opens settings through a dedicated renderer module', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');

  assert.match(source, /data-open-settings/);
  assert.match(source, /VitruviosSettingsPanel\.mountSettingsPanel/);
  assert.doesNotMatch(source, /function renderSettingsPanel/);
});

test('settings panel owns provider URL overrides and reads Vault Profile only through preload APIs', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'settings', 'mountSettingsPanel.js'), 'utf8');

  assert.match(source, /function mountSettingsPanel/);
  assert.match(source, /api\.settings\.setProviderUrl/);
  assert.match(source, /api\.settings\.resetProviderUrl/);
  assert.match(source, /api\.vault\.getProfile/);
  assert.match(source, /api\.vault\.setProfileRole/);
  assert.doesNotMatch(source, /require\('node:fs'\)/);
});

test('settings panel exposes limits through settings API and Vault Profile through vault API', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'settings', 'mountSettingsPanel.js'), 'utf8');

  assert.match(source, /Limits/);
  assert.match(source, /Vault Profile/);
  assert.match(source, /api\.settings\.setLimits/);
  assert.match(source, /api\.vault\.setProfileRole/);
  assert.match(source, /api\.vault\.resetProfileRole/);
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

test('settings panel shows provider timeout in seconds while storing milliseconds', () => {
  const field = { key: 'providerTimeoutMs', unit: 'seconds' };

  assert.equal(formatLimitValue(field, 120000), 120);
  assert.equal(parseLimitInput(field, '180'), 180000);
});
test('settings panel uses a two-pane category layout', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'settings', 'mountSettingsPanel.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'settings.css'), 'utf8');

  assert.match(source, /settings-category-menu/);
  assert.match(source, /data-settings-category="providers"/);
  assert.match(source, /data-settings-category-panel="providers"/);
  assert.match(source, /data-settings-category="limits"/);
  assert.match(source, /data-settings-category="vault-profile"/);
  assert.match(css, /\.settings-body\s*\{[\s\S]*grid-template-columns:\s*180px minmax\(0, 1fr\);/);
  assert.match(css, /\.settings-category-panel\[hidden\]/);
});

test('settings panel exposes V1 category slots without fake controls', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'settings', 'mountSettingsPanel.js'), 'utf8');

  assert.match(source, /data-settings-category="templates"/);
  assert.match(source, /data-settings-category="appearance"/);
  assert.match(source, /data-settings-category="embeddings"/);
  assert.match(source, /data-settings-category="safety"/);
  assert.match(source, /data-settings-category="about"/);
  assert.match(source, /settings-future-note/);
});
test('settings modal keeps a stable size and scrolls only active content', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'settings.css'), 'utf8');

  assert.match(css, /\.settings-panel\s*\{[\s\S]*width:\s*min\(920px, calc\(100vw - 56px\)\);/);
  assert.match(css, /\.settings-panel\s*\{[\s\S]*\n\s*height:\s*min\(680px, calc\(100vh - 56px\)\);/);
  const panelRule = css.match(/\.settings-panel\s*\{([\s\S]*?)\n\}/);
  assert.ok(panelRule);
  assert.doesNotMatch(panelRule[1], /max-height:/);
  assert.match(css, /\.settings-body\s*\{[\s\S]*overflow:\s*hidden;/);
  assert.match(css, /\.settings-category-content\s*\{[\s\S]*overflow:\s*auto;/);
});

test('settings panel wires similar-note embedding defaults through settings API', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'settings', 'mountSettingsPanel.js'), 'utf8');

  assert.match(source, /data-settings-embeddings-grid/);
  assert.match(source, /Minimum match %/);
  assert.match(source, /Mode/);
  assert.match(source, /api.settings.setEmbeddings/);
  assert.doesNotMatch(source, /api.embeddings.findSimilarNotes/);
});

test('settings category buttons use existing semantic icons', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'settings', 'mountSettingsPanel.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'settings.css'), 'utf8');

  assert.match(source, /data-settings-icon="plug"/);
  assert.match(source, /data-settings-icon="folder"/);
  assert.match(source, /data-settings-icon="lock"/);
  assert.match(source, /function renderSettingsCategoryIcons/);
  assert.match(source, /renderer\.createIconElement\(iconName, 'settings-category-icon'\)/);
  assert.match(css, /\.settings-category-button\s*\{[\s\S]*display:\s*flex;/);
  assert.match(css, /\.settings-category-icon\s*\{[\s\S]*filter:\s*var\(--icon-muted-filter, none\);/);
});

test('Vault Profile settings use a renderer-owned draft state for dirty rows and available folders', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'settings', 'mountSettingsPanel.js'), 'utf8');

  assert.match(source, /window\.VitruviosVaultProfileDraftState/);
  assert.match(source, /draft\.isDirty/);
  assert.match(source, /draft\.getAssignedRole/);
  assert.match(source, /draft\.commitRole/);
  assert.match(source, /panel\.vaultProfileDraft\.invalidate\(\)/);
  assert.doesNotMatch(source, /panel\.vaultProfileDraft\.reset\(\)/);
});