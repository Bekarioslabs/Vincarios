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
  assert.equal(settings.theme.mode, 'dark');
  assert.equal(settings.layout.panels.selectionActionsCollapsed, false);
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-settings-'));
  const filePath = path.join(dir, 'settings.json');
  const store = createSettingsStore({ filePath });

  const result = store.setProviderUrlOverride('ollama', 'http://localhost:11435/');
  assert.equal(result.ok, true);
  assert.equal(store.getSettings().providers.urlOverrides.ollama, 'http://localhost:11435');

  const reloaded = createSettingsStore({ filePath });
  assert.equal(reloaded.getSettings().providers.urlOverrides.ollama, 'http://localhost:11435');
});

test('settings store persists active provider and selected model', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-settings-'));
  const filePath = path.join(dir, 'settings.json');
  const store = createSettingsStore({ filePath });

  assert.equal(store.setActiveProvider('ollama').ok, true);
  assert.equal(store.setSelectedProviderModel('ollama', 'qwen2.5:7b').ok, true);

  const reloaded = createSettingsStore({ filePath });
  assert.equal(reloaded.getSettings().providers.activeProviderId, 'ollama');
  assert.equal(reloaded.getSettings().providers.selectedModels.ollama, 'qwen2.5:7b');
});

test('settings store persists limits with normalized positive values', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-settings-'));
  const filePath = path.join(dir, 'settings.json');
  const store = createSettingsStore({ filePath });

  const result = store.setLimits({
    providerTimeoutMs: 45000,
    modelListTimeoutMs: 2500,
    maxCreateNoteChars: 10000,
    maxUpdateNoteChars: 20000,
    maxProviderMessageChars: 50000,
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
  assert.equal(reloaded.getSettings().limits.maxCreateNoteChars, 10000);
  assert.equal(reloaded.getSettings().limits.maxUpdateNoteChars, 20000);
  assert.equal(reloaded.getSettings().limits.maxProviderMessageChars, 50000);
  assert.equal(reloaded.getSettings().limits.maxSelectedFileChars, 9000);
  assert.equal(reloaded.getSettings().limits.maxListedFolders, 80);
  assert.equal(reloaded.getSettings().limits.maxListedFiles, 300);
  assert.equal(reloaded.getSettings().limits.maxAnalysisFiles, 25);
  assert.equal(reloaded.getSettings().limits.maxSuggestionsPerReview, 12);
});


test('settings store persists similar-note defaults with safe normalization', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-settings-'));
  const filePath = path.join(dir, 'settings.json');
  const store = createSettingsStore({ filePath });

  const result = store.setEmbeddingSettings({
    similarNotes: {
      minimumScorePercent: 72,
      maxResults: 5,
      mode: 'content',
      contentWeight: 90,
      metadataWeight: 10
    }
  });

  assert.equal(result.ok, true);
  const reloaded = createSettingsStore({ filePath });
  assert.equal(reloaded.getSettings().embeddings.similarNotes.minimumScorePercent, 72);
  assert.equal(reloaded.getSettings().embeddings.similarNotes.maxResults, 5);
  assert.equal(reloaded.getSettings().embeddings.similarNotes.mode, 'content');
  assert.equal(reloaded.getSettings().embeddings.similarNotes.contentWeight, 90);
  assert.equal(reloaded.getSettings().embeddings.similarNotes.metadataWeight, 10);

  const normalized = normalizeAppSettings({
    embeddings: {
      similarNotes: {
        minimumScorePercent: 999,
        maxResults: -1,
        mode: 'wild',
        contentWeight: -5,
        metadataWeight: 500
      }
    }
  });
  assert.equal(normalized.embeddings.similarNotes.minimumScorePercent, 100);
  assert.equal(normalized.embeddings.similarNotes.maxResults, 8);
  assert.equal(normalized.embeddings.similarNotes.mode, 'mixed');
  assert.equal(normalized.embeddings.similarNotes.contentWeight, 0);
  assert.equal(normalized.embeddings.similarNotes.metadataWeight, 100);
});

test('settings store persists app-local panel layout preferences', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-settings-'));
  const filePath = path.join(dir, 'settings.json');
  const store = createSettingsStore({ filePath });

  const result = store.setLayoutPreferences({ panels: { selectionActionsCollapsed: true } });
  assert.equal(result.ok, true);
  assert.equal(store.getSettings().layout.panels.selectionActionsCollapsed, true);
  assert.equal(store.getSettings().layout.panels.filesCollapsed, false);

  const reloaded = createSettingsStore({ filePath });
  assert.equal(reloaded.getSettings().layout.panels.selectionActionsCollapsed, true);
});

test('settings store keeps a portable two-entry recent vault history', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-settings-'));
  const filePath = path.join(dir, 'settings.json');
  const store = createSettingsStore({ filePath });

  const result = store.setRecentVaults({
    recentVaults: [
      { path: 'D:\\Vaults\\One', name: 'One', lastOpenedAt: '2026-07-14T10:00:00.000Z' },
      { path: 'D:/Vaults/One/', name: 'Duplicate', lastOpenedAt: '2026-07-14T10:01:00.000Z' },
      { path: 'D:/Vaults/Two', name: 'Two', lastOpenedAt: '2026-07-14T10:02:00.000Z' },
      { path: 'D:/Vaults/Three', name: 'Three', lastOpenedAt: '2026-07-14T10:03:00.000Z' }
    ]
  });

  assert.equal(result.ok, true);
  const reloaded = createSettingsStore({ filePath }).getSettings();
  assert.deepEqual(reloaded.startup.recentVaults.map((entry) => entry.path), [
    'D:/Vaults/One',
    'D:/Vaults/Two'
  ]);
});

test('settings store persists only normalized app theme modes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-settings-'));
  const filePath = path.join(dir, 'settings.json');
  const store = createSettingsStore({ filePath });

  const result = store.setTheme({ mode: 'light' });
  assert.equal(result.ok, true);
  assert.equal(store.getSettings().theme.mode, 'light');

  const reloaded = createSettingsStore({ filePath });
  assert.equal(reloaded.getSettings().theme.mode, 'light');
  assert.equal(store.setTheme({ mode: 'unsupported' }).settings.theme.mode, 'dark');
});
