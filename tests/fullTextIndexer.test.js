'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { createFullTextIndexer } = require('../src/main/search/fullTextIndexer');
const { createFullTextIndexStore } = require('../src/main/search/fullTextIndexStore');

function createVault() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-full-text-indexer-'));
  fs.mkdirSync(path.join(root, '03_Knowledge'), { recursive: true });
  fs.writeFileSync(path.join(root, '03_Knowledge', 'Search.md'), '---\ntags: [hidden-yaml]\n---\n# Search heading\n\nExact text match.', 'utf8');
  fs.mkdirSync(path.join(root, '.vincarios'), { recursive: true });
  fs.writeFileSync(path.join(root, '.vincarios', 'Ignored.md'), '# Ignore', 'utf8');
  return root;
}

test('full-text indexer requires explicit opt-in and builds token references without protected notes', async () => {
  const root = createVault();
  const indexer = createFullTextIndexer();
  assert.equal(indexer.setRoot(root).ok, true);
  assert.equal((await indexer.rebuildIndex()).code, 'full_text_not_enabled');

  assert.equal(indexer.setEnabled(true).ok, true);
  const rebuilt = await indexer.rebuildIndex();
  assert.equal(rebuilt.ok, true);
  assert.equal(rebuilt.documentCount, 1);
  assert.equal(rebuilt.indexedCount, 1);

  const store = createFullTextIndexStore();
  store.setRoot(root);
  const loaded = store.load();
  assert.deepEqual(loaded.index.terms.search, [{ path: '03_Knowledge/Search.md', heading: true }]);
  assert.deepEqual(loaded.index.terms.exact, [{ path: '03_Knowledge/Search.md', heading: false }]);
  assert.equal(loaded.index.terms.hidden, undefined);
  assert.equal(loaded.index.documents['.vincarios/Ignored.md'], undefined);
});

test('full-text indexer reuses unchanged records and preserves enabled state after cache deletion', async () => {
  const root = createVault();
  const indexer = createFullTextIndexer();
  indexer.setRoot(root);
  indexer.setEnabled(true);
  await indexer.rebuildIndex();

  const unchanged = await indexer.rebuildIndex();
  assert.equal(unchanged.indexedCount, 0);
  assert.equal(unchanged.reusedCount, 1);

  assert.equal(indexer.deleteIndex().ok, true);
  assert.equal(indexer.getPreference().enabled, true);
});
