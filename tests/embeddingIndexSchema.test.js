'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createEmptyEmbeddingIndex,
  createIndexedDocumentRecord,
  shouldReindexDocument
} = require('../src/shared/embeddings/embeddingIndexSchema');

test('embedding index schema creates a local vault index manifest', () => {
  const index = createEmptyEmbeddingIndex({ modelId: 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2', dimensions: 384 });

  assert.equal(index.version, 1);
  assert.equal(index.storage, 'vault-zeus-index');
  assert.equal(index.model.id, 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2');
  assert.equal(index.model.dimensions, 384);
  assert.deepEqual(index.documents, {});
});

test('embedding document records keep path hash mtime chunks and vectors metadata', () => {
  const record = createIndexedDocumentRecord({
    path: '03_Knowledge/Topic.md',
    hash: 'abc123',
    mtimeMs: 1234,
    chunks: [{ id: 'c1', start: 0, end: 12, text: 'Hello world.' }],
    vectors: [[0.1, 0.2, 0.3]]
  });

  assert.equal(record.path, '03_Knowledge/Topic.md');
  assert.equal(record.hash, 'abc123');
  assert.equal(record.mtimeMs, 1234);
  assert.equal(record.chunks[0].id, 'c1');
  assert.deepEqual(record.vectors[0], [0.1, 0.2, 0.3]);
});

test('embedding reindex decision only reindexes changed files or changed models', () => {
  const record = createIndexedDocumentRecord({ path: 'Note.md', hash: 'h1', mtimeMs: 100, chunks: [], vectors: [] });

  assert.equal(shouldReindexDocument(record, { hash: 'h1', mtimeMs: 100, modelChanged: false }), false);
  assert.equal(shouldReindexDocument(record, { hash: 'h2', mtimeMs: 100, modelChanged: false }), true);
  assert.equal(shouldReindexDocument(record, { hash: 'h1', mtimeMs: 101, modelChanged: false }), true);
  assert.equal(shouldReindexDocument(record, { hash: 'h1', mtimeMs: 100, modelChanged: true }), true);
  assert.equal(shouldReindexDocument(null, { hash: 'h1', mtimeMs: 100, modelChanged: false }), true);
});
