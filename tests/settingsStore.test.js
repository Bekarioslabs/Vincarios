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

function recoveryFixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-settings-recovery-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return { dir, filePath: path.join(dir, 'settings.json') };
}

test('malformed settings are preserved byte-for-byte before defaults may be saved', (t) => {
  const { dir, filePath } = recoveryFixture(t);
  const original = Buffer.from('{"theme": { broken\n');
  fs.writeFileSync(filePath, original);
  const store = createSettingsStore({ filePath });
  const copies = fs.readdirSync(dir).filter((name) => name.startsWith('settings.json.corrupt-'));
  assert.equal(copies.length, 1);
  assert.deepEqual(fs.readFileSync(path.join(dir, copies[0])), original);
  assert.deepEqual(fs.readFileSync(filePath), original);
  const warning = store.takeLoadWarning();
  assert.equal(warning.code, 'settings_recovered');
  assert.ok(warning.message.includes(copies[0]));
  assert.equal(store.takeLoadWarning(), null);
  assert.equal(store.setTheme({ mode: 'light' }).ok, true);
  assert.equal(JSON.parse(fs.readFileSync(filePath, 'utf8')).theme.mode, 'light');
  assert.deepEqual(fs.readFileSync(path.join(dir, copies[0])), original);
});

for (const code of ['EACCES', 'EIO']) {
  test('unreadable settings block every mutation without quarantine or state changes: ' + code, (t) => {
    const { dir, filePath } = recoveryFixture(t);
    const original = '{"theme":{"mode":"light"}}';
    fs.writeFileSync(filePath, original);
    const fileSystem = Object.assign({}, fs, { readFileSync(target, ...args) {
      if (target === filePath) throw Object.assign(new Error('Private diagnostic details'), { code });
      return fs.readFileSync(target, ...args);
    } });
    const store = createSettingsStore({ filePath, fs: fileSystem });
    const before = store.getSettings();
    const mutations = [
      () => store.setTheme({ mode: 'light' }), () => store.setLimits({ maxListedFiles: 42 }),
      () => store.setActiveProvider('ollama'), () => store.setSelectedProviderModel('ollama', 'example'),
      () => store.setProviderUrlOverride('ollama', 'http://localhost:11435'), () => store.resetProviderUrlOverride('ollama'),
      () => store.setEmbeddingSettings({ similarNotes: { minimumScorePercent: 72 } }),
      () => store.setActionDefaults({}), () => store.setRecentVaults({ recentVaults: [] }),
      () => store.setLayoutPreferences({ panels: { filesCollapsed: true } }),
      () => store.updateSettings((draft) => { draft.theme.mode = 'light'; return draft; })
    ];
    for (const mutate of mutations) assert.deepEqual(mutate(), { ok: false, code: 'settings_read_failed', message: 'App settings could not be read. Check file permissions and restart Vincarios before saving settings.' });
    assert.equal(store.getSettings(), before);
    assert.equal(fs.readFileSync(filePath, 'utf8'), original);
    assert.deepEqual(fs.readdirSync(dir), ['settings.json']);
    assert.equal(store.takeLoadWarning().code, 'settings_read_failed');
    assert.equal(store.takeLoadWarning(), null);
  });
}

test('failed recovery copy blocks saving and leaves the original untouched', (t) => {
  const { dir, filePath } = recoveryFixture(t);
  fs.writeFileSync(filePath, '{broken');
  const fileSystem = Object.assign({}, fs, { openSync() { throw Object.assign(new Error('Denied'), { code: 'EACCES' }); } });
  const store = createSettingsStore({ filePath, fs: fileSystem });
  assert.equal(store.setTheme({ mode: 'light' }).ok, false);
  assert.equal(store.takeLoadWarning().code, 'settings_recovery_failed');
  assert.equal(fs.readFileSync(filePath, 'utf8'), '{broken');
  assert.deepEqual(fs.readdirSync(dir), ['settings.json']);
});

test('recovery names do not overwrite earlier copies even at an identical time', (t) => {
  const { dir, filePath } = recoveryFixture(t);
  fs.writeFileSync(filePath, '{broken');
  const now = () => new Date('2026-10-26T18:00:00.000Z');
  const first = createSettingsStore({ filePath, now });
  const names = fs.readdirSync(dir);
  const firstCopy = names.find((name) => name !== 'settings.json');
  assert.ok(firstCopy);
  fs.writeFileSync(path.join(dir, firstCopy), 'Earlier retained bytes');
  const second = createSettingsStore({ filePath, now });
  assert.equal(first.takeLoadWarning().code, 'settings_recovered');
  assert.equal(second.takeLoadWarning().code, 'settings_recovered');
  assert.equal(fs.readdirSync(dir).length, 3);
  assert.equal(fs.readFileSync(path.join(dir, firstCopy), 'utf8'), 'Earlier retained bytes');
});

test('a partial owned recovery copy is removed on failure, never the source', (t) => {
  const { dir, filePath } = recoveryFixture(t);
  fs.writeFileSync(filePath, '{broken');
  const fileSystem = Object.assign({}, fs, { writeFileSync(target, content, ...args) {
    if (typeof target === 'number') {
      fs.writeSync(target, Buffer.from('part'));
      throw Object.assign(new Error('Full disk'), { code: 'ENOSPC' });
    }
    return fs.writeFileSync(target, content, ...args);
  } });
  const store = createSettingsStore({ filePath, fs: fileSystem });
  assert.equal(store.takeLoadWarning().code, 'settings_recovery_failed');
  assert.equal(store.setLimits({ maxListedFiles: 42 }).ok, false);
  assert.equal(fs.readFileSync(filePath, 'utf8'), '{broken');
  assert.deepEqual(fs.readdirSync(dir), ['settings.json']);
});

test('missing and valid settings do not report a recovery warning', (t) => {
  const { filePath } = recoveryFixture(t);
  const missing = createSettingsStore({ filePath });
  assert.equal(missing.takeLoadWarning(), null);
  assert.equal(missing.setTheme({ mode: 'light' }).ok, true);
  const valid = createSettingsStore({ filePath });
  assert.equal(valid.takeLoadWarning(), null);
  assert.equal(valid.getSettings().theme.mode, 'light');
});

test('settings write failure is reported without changing in-memory settings', (t) => {
  const { filePath } = recoveryFixture(t);
  const store = createSettingsStore({ filePath, fs: Object.assign({}, fs, {
    writeFileSync() { throw Object.assign(new Error('Denied'), { code: 'EACCES' }); }
  }) });
  const before = store.getSettings();
  assert.deepEqual(store.setTheme({ mode: 'light' }), { ok: false, code: 'settings_write_failed', message: 'App settings could not be saved. Check file permissions and available disk space, then try again.' });
  assert.equal(store.getSettings(), before);
});

test('invalid JSON root values are preserved rather than treated as a settings object', (t) => {
  const { dir } = recoveryFixture(t);
  for (const [index, content] of ['null', '[]', '"text"', 'true'].entries()) {
    const filePath = path.join(dir, 'settings-' + index + '.json');
    fs.writeFileSync(filePath, content);
    const store = createSettingsStore({ filePath });
    assert.equal(store.takeLoadWarning().code, 'settings_recovered');
    assert.equal(fs.readFileSync(filePath, 'utf8'), content);
  }
});

test('exhausted exclusive recovery names block saves without overwriting any copy', (t) => {
  const { filePath } = recoveryFixture(t);
  fs.writeFileSync(filePath, '{broken');
  let attempts = 0;
  const fileSystem = Object.assign({}, fs, { openSync() {
    attempts += 1;
    throw Object.assign(new Error('Already exists'), { code: 'EEXIST' });
  } });
  const store = createSettingsStore({ filePath, fs: fileSystem });
  assert.equal(attempts, 100);
  assert.equal(store.takeLoadWarning().code, 'settings_recovery_failed');
  assert.equal(store.setTheme({ mode: 'light' }).ok, false);
  assert.equal(fs.readFileSync(filePath, 'utf8'), '{broken');
});
