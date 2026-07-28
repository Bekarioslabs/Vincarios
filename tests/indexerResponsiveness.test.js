'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createMetadataIndexer } = require('../src/main/metadata/metadataIndexer');
const { createFullTextIndexer } = require('../src/main/search/fullTextIndexer');

test('metadata rebuild yields to the event loop for large vault snapshots', async () => {
  const documents = createDocuments(1200);
  let heartbeat = false;
  setImmediate(() => { heartbeat = true; });
  const indexer = createMetadataIndexer({
    source: createSource(documents),
    indexStore: createMetadataStore()
  });

  const result = await indexer.rebuildIndex();

  assert.equal(result.ok, true);
  assert.equal(result.documentCount, documents.length);
  assert.equal(heartbeat, true);
});

test('full-text rebuild yields to the event loop for large vault snapshots', async () => {
  const documents = createDocuments(1200);
  let heartbeat = false;
  setImmediate(() => { heartbeat = true; });
  const indexer = createFullTextIndexer({
    source: createSource(documents),
    indexStore: createFullTextStore()
  });

  const result = await indexer.rebuildIndex();

  assert.equal(result.ok, true);
  assert.equal(result.documentCount, documents.length);
  assert.equal(heartbeat, true);
});

function createDocuments(count) {
  return Array.from({ length: count }, (_value, index) => ({
    path: '03_Knowledge/Note-' + index + '.md',
    mtimeMs: index + 1,
    content: '---\ntags: [performance]\n---\n# Note ' + index + '\n\nShared searchable text ' + index + '.'
  }));
}

function createSource(documents) {
  return {
    setRoot: () => ({ ok: true, root: 'fixture' }),
    listMarkdownDocumentsAsync: async () => ({ ok: true, documents })
  };
}

function createMetadataStore() {
  let documents = {};
  return {
    setRoot: () => ({ ok: true, root: 'fixture' }),
    load: () => ({ ok: true, exists: Object.keys(documents).length > 0, documents }),
    save: (nextDocuments) => {
      documents = nextDocuments;
      return { ok: true };
    }
  };
}

function createFullTextStore() {
  let index = { documents: {}, terms: {} };
  return {
    setRoot: () => ({ ok: true, root: 'fixture' }),
    getPreference: () => ({ ok: true, enabled: true }),
    setEnabled: () => ({ ok: true, enabled: true }),
    load: () => ({ ok: true, exists: Object.keys(index.documents).length > 0, index }),
    save: (nextIndex) => {
      index = nextIndex;
      return { ok: true };
    },
    deleteIndex: () => ({ ok: true })
  };
}
