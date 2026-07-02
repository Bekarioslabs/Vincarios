const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_EMBEDDINGS,
  normalizeAppSettings,
  createSettingsStore
} = require('../src/main/settings/settingsStore');

test('settings expose MiniLM as the V1 bundled embedding default', () => {
  const settings = normalizeAppSettings({});

  assert.equal(DEFAULT_EMBEDDINGS.defaultModelId, 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2');
  assert.equal(DEFAULT_EMBEDDINGS.license, 'apache-2.0');
  assert.equal(settings.embeddings.activeModelSource, 'bundled');
  assert.equal(settings.embeddings.bundledModelId, DEFAULT_EMBEDDINGS.defaultModelId);
  assert.equal(settings.embeddings.dimensions, 384);
  assert.equal(settings.embeddings.indexLocation, 'vault-zeus');
});

test('settings normalize custom local embedding model path without changing provider settings', () => {
  const settings = normalizeAppSettings({
    providers: { activeProviderId: 'ollama' },
    embeddings: {
      activeModelSource: 'custom-local',
      customModelPath: 'D:\\Models\\Embeddings\\minilm',
      reindexRequired: true
    }
  });

  assert.equal(settings.providers.activeProviderId, 'ollama');
  assert.equal(settings.embeddings.activeModelSource, 'custom-local');
  assert.equal(settings.embeddings.customModelPath, 'D:/Models/Embeddings/minilm');
  assert.equal(settings.embeddings.reindexRequired, true);
});

test('settings store can update embedding settings and marks reindex when model source changes', () => {
  const store = createSettingsStore({ initialSettings: {} });
  const result = store.setEmbeddingSettings({ activeModelSource: 'custom-local', customModelPath: 'C:/Models/minilm' });

  assert.equal(result.ok, true);
  assert.equal(result.embeddings.activeModelSource, 'custom-local');
  assert.equal(result.embeddings.customModelPath, 'C:/Models/minilm');
  assert.equal(result.embeddings.reindexRequired, true);
});
