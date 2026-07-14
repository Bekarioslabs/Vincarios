'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createEmbeddingIndexer, splitMarkdownSections } = require('../src/main/embeddings/embeddingIndexer');

test('embedding indexer embeds markdown documents into chunk vectors and saves the index', async () => {
  const runtimeCalls = [];
  const store = createMemoryStore();
  const indexer = createEmbeddingIndexer({
    source: createSource([
      { path: 'Notes/One.md', content: 'Alpha beta gamma delta.', mtimeMs: 10 }
    ]),
    indexStore: store,
    runtime: createRuntime(runtimeCalls),
    modelId: 'test-model',
    dimensions: 3,
    chunkSizeChars: 10,
    chunkOverlapChars: 0
  });

  const result = await indexer.rebuildIndex();

  assert.equal(result.ok, true);
  assert.equal(result.totalDocuments, 1);
  assert.equal(result.indexedDocuments, 1);
  assert.equal(result.skippedDocuments, 0);
  assert.equal(runtimeCalls.length > 1, true);
  assert.equal(store.savedManifest.model.id, 'test-model');
  assert.equal(store.savedDocuments['Notes/One.md'].path, 'Notes/One.md');
  assert.equal(store.savedDocuments['Notes/One.md'].hash.length, 64);
  assert.equal(store.savedDocuments['Notes/One.md'].chunks[0].id, 'Notes/One.md#0');
  assert.deepEqual(store.savedDocuments['Notes/One.md'].vectors[0], [1, 2, 3]);
});

test('embedding indexer skips unchanged documents already in the index', async () => {
  const runtimeCalls = [];
  const store = createMemoryStore({
    'Notes/One.md': {
      path: 'Notes/One.md',
      hash: 'fixed-hash',
      mtimeMs: 10,
      chunks: [{ id: 'old', start: 0, end: 3, text: 'old' }],
      vectors: [[9]],
      bodyChunks: [{ id: 'old', start: 0, end: 3, text: 'old' }],
      bodyVectors: [[9]],
      frontmatterChunks: [],
      frontmatterVectors: []
    }
  });
  const indexer = createEmbeddingIndexer({
    source: createSource([
      { path: 'Notes/One.md', content: 'same', hash: 'fixed-hash', mtimeMs: 10 }
    ]),
    indexStore: store,
    runtime: createRuntime(runtimeCalls),
    modelId: 'test-model',
    dimensions: 3
  });

  const result = await indexer.rebuildIndex();

  assert.equal(result.ok, true);
  assert.equal(result.indexedDocuments, 0);
  assert.equal(result.skippedDocuments, 1);
  assert.equal(runtimeCalls.length, 0);
  assert.equal(store.savedDocuments['Notes/One.md'].chunks[0].id, 'old');
});

function createSource(documents) {
  return {
    listMarkdownDocuments() {
      return { ok: true, documents };
    }
  };
}

function createRuntime(calls) {
  return {
    async embedText(text) {
      calls.push(text);
      return { ok: true, vector: [1, 2, 3], dimensions: 3, modelId: 'test-model' };
    }
  };
}

function createMemoryStore(existingDocuments) {
  const store = {
    savedManifest: null,
    savedDocuments: null,
    loadDocuments() {
      return { ok: true, documents: Object.assign({}, existingDocuments || {}) };
    },
    saveManifest(options) {
      store.savedManifest = { model: { id: options.modelId, dimensions: options.dimensions } };
      return { ok: true, index: store.savedManifest };
    },
    saveDocuments(documents) {
      store.savedDocuments = documents;
      return { ok: true, documents };
    }
  };
  return store;
}


test('embedding indexer stores body and frontmatter vectors separately', async () => {
  const runtimeCalls = [];
  const store = createMemoryStore();
  const indexer = createEmbeddingIndexer({
    source: createSource([
      { path: 'Notes/Tagged.md', content: '---\ntags:\n  - project-a\n---\nBody content only.', mtimeMs: 10 }
    ]),
    indexStore: store,
    runtime: createRuntime(runtimeCalls),
    modelId: 'test-model',
    dimensions: 3,
    chunkSizeChars: 1200,
    chunkOverlapChars: 0
  });

  const result = await indexer.rebuildIndex();

  assert.equal(result.ok, true);
  const record = store.savedDocuments['Notes/Tagged.md'];
  assert.equal(record.bodyChunks[0].text, 'Body content only.');
  assert.equal(record.frontmatterChunks[0].text.includes('project-a'), true);
  assert.deepEqual(record.bodyVectors[0], [1, 2, 3]);
  assert.deepEqual(record.frontmatterVectors[0], [1, 2, 3]);
});

test('splitMarkdownSections removes YAML from body text', () => {
  const result = splitMarkdownSections('---\ntags:\n  - vitruvios\n---\n# Title\nBody');

  assert.equal(result.frontmatterText, 'tags:\n  - vitruvios');
  assert.equal(result.bodyText, '# Title\nBody');
});


test('embedding indexer reindexes unchanged legacy records without split vectors', async () => {
  const runtimeCalls = [];
  const store = createMemoryStore({
    'Notes/Legacy.md': {
      path: 'Notes/Legacy.md',
      hash: 'fixed-hash',
      mtimeMs: 10,
      chunks: [{ id: 'legacy', start: 0, end: 3, text: 'old' }],
      vectors: [[9]]
    }
  });
  const indexer = createEmbeddingIndexer({
    source: createSource([
      { path: 'Notes/Legacy.md', content: 'same', hash: 'fixed-hash', mtimeMs: 10 }
    ]),
    indexStore: store,
    runtime: createRuntime(runtimeCalls),
    modelId: 'test-model',
    dimensions: 3
  });

  const result = await indexer.rebuildIndex();

  assert.equal(result.ok, true);
  assert.equal(result.indexedDocuments, 1);
  assert.equal(result.skippedDocuments, 0);
  assert.equal(runtimeCalls.length > 0, true);
  assert.equal(Array.isArray(store.savedDocuments['Notes/Legacy.md'].bodyVectors), true);
});
