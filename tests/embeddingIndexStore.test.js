'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createEmbeddingIndexStore } = require('../src/main/embeddings/embeddingIndexStore');

test('embedding index store resolves inside selected vault .vitruvios/index only', () => {
  const root = createTempVault();
  const store = createEmbeddingIndexStore();
  assert.equal(store.setRoot(root).ok, true);

  const location = store.getIndexLocation();

  assert.equal(location.relativeFolder, '.vitruvios/index');
  assert.equal(location.manifestPath, path.join(root, '.vitruvios', 'index', 'manifest.json'));
  assert.equal(location.documentsPath, path.join(root, '.vitruvios', 'index', 'documents.json'));
});

test('embedding index store saves and loads manifest outside normal vault notes', () => {
  const root = createTempVault();
  const store = createEmbeddingIndexStore();
  store.setRoot(root);

  const saved = store.saveManifest({ modelId: 'model-a', dimensions: 384 });
  const loaded = store.loadManifest();

  assert.equal(saved.ok, true);
  assert.equal(loaded.ok, true);
  assert.equal(loaded.index.model.id, 'model-a');
  assert.equal(fs.existsSync(path.join(root, '.vitruvios', 'index', 'manifest.json')), true);
  assert.equal(fs.existsSync(path.join(root, 'manifest.json')), false);
});

test('embedding index store saves and loads indexed document records', () => {
  const root = createTempVault();
  const store = createEmbeddingIndexStore();
  store.setRoot(root);

  const saved = store.saveDocuments({
    'Notes/One.md': {
      path: 'Notes/One.md',
      hash: 'abc',
      mtimeMs: 12,
      chunks: [{ id: '0', start: 0, end: 4, text: 'test' }],
      vectors: [[1, 2, 3]]
    }
  });
  const loaded = store.loadDocuments();

  assert.equal(saved.ok, true);
  assert.equal(loaded.ok, true);
  assert.equal(loaded.documents['Notes/One.md'].hash, 'abc');
  assert.deepEqual(loaded.documents['Notes/One.md'].vectors[0], [1, 2, 3]);
});
function createTempVault() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vitruvios-embedding-index-'));
}
