'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createEmptyEmbeddingIndex,
  createIndexedDocumentRecord,
  shouldReindexDocument,
  createEmbeddingFingerprint
} = require('../src/shared/embeddings/embeddingIndexSchema');

test('embedding index schema creates a local vault index manifest', () => {
  const index = createEmptyEmbeddingIndex({ modelId: 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2', dimensions: 384 });

  assert.equal(index.version, 1);
  assert.equal(index.storage, 'vault-vincarios-index');
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


test('embedding document records keep split body and frontmatter vectors', () => {
  const record = createIndexedDocumentRecord({
    path: '03_Knowledge/Topic.md',
    bodyChunks: [{ id: 'body', start: 0, end: 4, text: 'Body' }],
    bodyVectors: [[0.1, 0.2]],
    frontmatterChunks: [{ id: 'yaml', start: 0, end: 9, text: 'tags: ai' }],
    frontmatterVectors: [[0.9, 0.8]]
  });

  assert.equal(record.bodyChunks[0].id, 'body');
  assert.deepEqual(record.bodyVectors[0], [0.1, 0.2]);
  assert.equal(record.frontmatterChunks[0].id, 'yaml');
  assert.deepEqual(record.frontmatterVectors[0], [0.9, 0.8]);
});


test('embedding fingerprint captures the model and index compatibility contract', () => {
  const fingerprint = createEmbeddingFingerprint({
    modelId: 'model-a',
    dimensions: 384,
    revision: 'rev-1',
    indexVersion: 1
  });

  assert.deepEqual(fingerprint, {
    modelId: 'model-a',
    dimensions: 384,
    revision: 'rev-1',
    indexVersion: 1
  });
});
