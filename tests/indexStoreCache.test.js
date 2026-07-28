'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createEmbeddingIndexStore } = require('../src/main/embeddings/embeddingIndexStore');
const { createFullTextIndexStore } = require('../src/main/search/fullTextIndexStore');
const { createMetadataIndexStore } = require('../src/main/metadata/metadataIndexStore');

test('embedding store parses unchanged manifest and documents only once', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-embedding-cache-'));
  const writer = createEmbeddingIndexStore();
  writer.setRoot(root);
  writer.saveIndex({ modelId: 'model-a', dimensions: 2 }, {
    'Note.md': { path: 'Note.md', hash: 'hash', mtimeMs: 1, chunks: [], vectors: [] }
  });
  const reads = new Map();
  const store = createEmbeddingIndexStore({ fs: countingFs(reads) });
  store.setRoot(root);

  store.loadDocuments();
  store.loadManifest();
  store.loadDocuments();

  assert.equal(reads.get('manifest.json'), 1);
  assert.equal(reads.get('documents.json'), 1);
});

test('full-text store parses unchanged manifest and terms only once', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-search-cache-'));
  const writer = createFullTextIndexStore();
  writer.setRoot(root);
  writer.setEnabled(true);
  writer.save({
    documents: { 'Note.md': { path: 'Note.md', hash: 'hash', mtimeMs: 1 } },
    terms: { note: [{ path: 'Note.md' }] }
  });
  const reads = new Map();
  const store = createFullTextIndexStore({ fs: countingFs(reads) });
  store.setRoot(root);

  store.load();
  store.load();

  assert.equal(reads.get('manifest.json'), 1);
  assert.equal(reads.get('terms.json'), 1);
});

test('metadata store parses unchanged manifest and records only once', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-metadata-cache-'));
  const writer = createMetadataIndexStore();
  writer.setRoot(root);
  writer.save({
    'Note.md': { path: 'Note.md', hash: 'hash', mtimeMs: 1, title: 'Note', frontmatterState: 'none', fields: {} }
  });
  const reads = new Map();
  const store = createMetadataIndexStore({ fs: countingFs(reads) });
  store.setRoot(root);

  store.load();
  store.load();

  assert.equal(reads.get('manifest.json'), 1);
  assert.equal(reads.get('records.json'), 1);
});
function countingFs(reads) {
  return new Proxy(fs, {
    get(target, property) {
      if (property !== 'readFileSync') return target[property];
      return (filePath, ...args) => {
        const name = path.basename(String(filePath));
        reads.set(name, (reads.get(name) || 0) + 1);
        return target.readFileSync(filePath, ...args);
      };
    }
  });
}
