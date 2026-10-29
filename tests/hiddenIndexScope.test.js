'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createVaultMarkdownSource } = require('../src/main/vault/vaultMarkdownSource');
const { createMetadataIndexer } = require('../src/main/metadata/metadataIndexer');
const { createMetadataIndexStore } = require('../src/main/metadata/metadataIndexStore');
const { createFullTextIndexer } = require('../src/main/search/fullTextIndexer');
const { createFullTextIndexStore } = require('../src/main/search/fullTextIndexStore');
const { createEmbeddingIndexer } = require('../src/main/embeddings/embeddingIndexer');
const { createEmbeddingIndexStore } = require('../src/main/embeddings/embeddingIndexStore');

for (const kind of ['metadata', 'full-text', 'embedding']) {
  test(kind + ' rebuild removes legacy hidden entries without changing notes or backups', async (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-hidden-index-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const contents = { 'Notes/Visible.md': '# Current\n', 'Notes/.history/Old.md': '# Private old draft\n' };
    const documents = Object.entries(contents).map(([notePath, content]) => {
      const file = path.join(root, ...notePath.split('/'));
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content);
      return { path: notePath, content, mtimeMs: fs.statSync(file).mtimeMs };
    });
    const realSource = createVaultMarkdownSource();
    let seedLegacy = true;
    const source = Object.assign({}, realSource, {
      listMarkdownDocumentsAsync: (options) => seedLegacy
        ? Promise.resolve({ ok: true, documents }) : realSource.listMarkdownDocumentsAsync(options)
    });
    const stores = { metadata: createMetadataIndexStore, 'full-text': createFullTextIndexStore, embedding: createEmbeddingIndexStore };
    const factories = { metadata: createMetadataIndexer, 'full-text': createFullTextIndexer, embedding: createEmbeddingIndexer };
    const store = stores[kind]();
    const indexer = factories[kind]({ source, indexStore: store, modelId: 'synthetic', dimensions: 3,
      runtime: { async embedText() { return { ok: true, vector: [1, 2, 3] }; } } });
    assert.equal(indexer.setRoot(root).ok, true);
    if (kind === 'full-text') assert.equal(indexer.setEnabled(true).ok, true);
    const readPaths = () => {
      const loaded = kind === 'embedding' ? store.loadDocuments() : store.load();
      assert.equal(loaded.ok, true);
      return Object.keys(kind === 'full-text' ? loaded.index.documents : loaded.documents).sort();
    };
    assert.equal((await indexer.rebuildIndex()).ok, true);
    assert.deepEqual(readPaths(), Object.keys(contents).sort());
    seedLegacy = false;
    assert.equal((await indexer.rebuildIndex()).ok, true);
    assert.deepEqual(readPaths(), ['Notes/Visible.md']);
    for (const [notePath, content] of Object.entries(contents)) {
      assert.equal(fs.readFileSync(path.join(root, ...notePath.split('/')), 'utf8'), content);
    }
  });
}
