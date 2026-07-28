const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createIndexSettingsController
} = require('../src/renderer/settings/indexSettingsController');

test('index settings controller renders shared vault and full-text health', () => {
  const panel = createPanel();
  const controller = createIndexSettingsController({
    panel,
    api: {},
    similaritySourceOptions: createSimilaritySourceOptions()
  });

  controller.applyVaultIndexStatus({
    ok: true,
    state: 'stale',
    canRefresh: true,
    metadata: { documentCount: 7 },
    embeddings: { state: 'ready', documentCount: 7, chunkCount: 19 },
    fullText: {
      state: 'ready',
      enabled: true,
      documentCount: 7,
      termCount: 123
    }
  });

  assert.equal(panel.vaultIndexStatus.dataset.indexState, 'stale');
  assert.equal(panel.vaultIndexStatus.textContent, 'Index needs refresh after vault changes.');
  assert.equal(panel.vaultIndexCounts.textContent, '7 Markdown notes indexed. 19 Similar Notes text segments.');
  assert.equal(panel.refreshVaultIndexesButton.textContent, 'Refresh indexes');
  assert.equal(panel.refreshVaultIndexesButton.disabled, false);
  assert.equal(panel.fullTextIndexStatus.dataset.indexState, 'ready');
  assert.equal(panel.fullTextEnabledInput.checked, true);
  assert.equal(panel.fullTextIndexDisclosure.textContent, 'Local cache: 7 notes, 123 terms.');
});

test('index settings controller fails closed when health is unavailable', () => {
  const panel = createPanel();
  const controller = createIndexSettingsController({
    panel,
    api: {},
    similaritySourceOptions: createSimilaritySourceOptions()
  });

  controller.applyVaultIndexStatus(null);

  assert.equal(panel.vaultIndexStatus.dataset.indexState, 'unavailable');
  assert.equal(panel.refreshVaultIndexesButton.disabled, true);
  assert.equal(panel.fullTextIndexStatus.dataset.indexState, 'no_vault');
  assert.equal(panel.fullTextEnabledInput.disabled, true);
});

function createPanel() {
  return {
    vaultIndexStatus: createNode(),
    vaultIndexCounts: createNode(),
    refreshVaultIndexesButton: createNode(),
    fullTextIndexStatus: createNode(),
    fullTextIndexDisclosure: createNode(),
    fullTextEnabledInput: createNode(),
    deleteFullTextButton: createNode()
  };
}

function createNode() {
  return {
    dataset: {},
    textContent: '',
    checked: false,
    disabled: false,
    hidden: false
  };
}

function createSimilaritySourceOptions() {
  return {
    normalize(value) { return value; },
    options() { return []; },
    weightsFor(value) {
      return { mode: value, contentWeight: 1, metadataWeight: 0 };
    }
  };
}
