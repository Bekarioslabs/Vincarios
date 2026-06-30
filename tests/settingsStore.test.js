'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const {
  createSettingsStore,
  normalizeAppSettings,
  toProviderRegistryOptions,
  validateProviderBaseUrl
} = require('../src/main/settings/settingsStore');

test('settings normalize into future-proof categories', () => {
  const settings = normalizeAppSettings({
    providers: { activeProviderId: 'ollama', urlOverrides: { ollama: 'http://localhost:11435/' } }
  });

  assert.equal(settings.version, 1);
  assert.equal(settings.providers.activeProviderId, 'ollama');
  assert.equal(settings.providers.urlOverrides.ollama, 'http://localhost:11435');
  assert.equal(settings.limits.providerTimeoutMs, 120000);
  assert.equal(typeof settings.limits.maxSelectedFileChars, 'number');
  assert.deepEqual(settings.vaultProfile.roles, {});
  assert.equal(settings.theme.mode, 'dark');
  assert.equal(settings.safety.reviewRequired, true);
});

test('settings map provider category to provider registry options', () => {
  const registryOptions = toProviderRegistryOptions(normalizeAppSettings({
    providers: {
      activeProviderId: 'ollama',
      selectedModels: { ollama: 'qwen2.5:7b' },
      urlOverrides: { ollama: 'http://127.0.0.1:11435' }
    }
  }));

  assert.equal(registryOptions.activeProviderId, 'ollama');
  assert.equal(registryOptions.selectedModels.ollama, 'qwen2.5:7b');
  assert.equal(registryOptions.urlOverrides.ollama, 'http://127.0.0.1:11435');
});

test('settings reject invalid provider base URLs', () => {
  assert.equal(validateProviderBaseUrl('http://127.0.0.1:1234').ok, true);
  assert.equal(validateProviderBaseUrl('https://localhost:1234/').value, 'https://localhost:1234');
  assert.equal(validateProviderBaseUrl('ftp://localhost:1234').ok, false);
  assert.equal(validateProviderBaseUrl('not a url').ok, false);
});

test('settings store persists provider URL overrides', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zeus-settings-'));
  const filePath = path.join(dir, 'settings.json');
  const store = createSettingsStore({ filePath });

  const result = store.setProviderUrlOverride('ollama', 'http://localhost:11435/');
  assert.equal(result.ok, true);
  assert.equal(store.getSettings().providers.urlOverrides.ollama, 'http://localhost:11435');

  const reloaded = createSettingsStore({ filePath });
  assert.equal(reloaded.getSettings().providers.urlOverrides.ollama, 'http://localhost:11435');
});

test('settings store persists active provider and selected model', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zeus-settings-'));
  const filePath = path.join(dir, 'settings.json');
  const store = createSettingsStore({ filePath });

  assert.equal(store.setActiveProvider('ollama').ok, true);
  assert.equal(store.setSelectedProviderModel('ollama', 'qwen2.5:7b').ok, true);

  const reloaded = createSettingsStore({ filePath });
  assert.equal(reloaded.getSettings().providers.activeProviderId, 'ollama');
  assert.equal(reloaded.getSettings().providers.selectedModels.ollama, 'qwen2.5:7b');
});

test('settings store persists limits with normalized positive values', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zeus-settings-'));
  const filePath = path.join(dir, 'settings.json');
  const store = createSettingsStore({ filePath });

  const result = store.setLimits({
    providerTimeoutMs: 45000,
    modelListTimeoutMs: 2500,
    maxSelectedFileChars: 9000,
    maxListedFolders: 80,
    maxListedFiles: 300,
    maxAnalysisFiles: 25,
    maxSuggestionsPerReview: 12
  });

  assert.equal(result.ok, true);
  const reloaded = createSettingsStore({ filePath });
  assert.equal(reloaded.getSettings().limits.providerTimeoutMs, 45000);
  assert.equal(reloaded.getSettings().limits.modelListTimeoutMs, 2500);
  assert.equal(reloaded.getSettings().limits.maxSelectedFileChars, 9000);
  assert.equal(reloaded.getSettings().limits.maxListedFolders, 80);
  assert.equal(reloaded.getSettings().limits.maxListedFiles, 300);
  assert.equal(reloaded.getSettings().limits.maxAnalysisFiles, 25);
  assert.equal(reloaded.getSettings().limits.maxSuggestionsPerReview, 12);
});

test('settings store persists vault profile role overrides and can reset them', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zeus-settings-'));
  const filePath = path.join(dir, 'settings.json');
  const store = createSettingsStore({ filePath });

  assert.equal(store.setVaultProfileRole('projects', 'Custom Projects/Active').ok, true);
  assert.equal(store.getSettings().vaultProfile.roles.projects, 'Custom Projects/Active');
  assert.equal(store.resetVaultProfileRole('projects').ok, true);
  assert.equal(store.getSettings().vaultProfile.roles.projects, undefined);
});
