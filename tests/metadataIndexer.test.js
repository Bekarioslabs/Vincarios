'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { createMetadataIndexer } = require('../src/main/metadata/metadataIndexer');
const { createMetadataIndexStore } = require('../src/main/metadata/metadataIndexStore');

function createVault() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-metadata-indexer-'));
  fs.mkdirSync(path.join(root, '00_Inbox'), { recursive: true });
  fs.writeFileSync(path.join(root, '00_Inbox', 'Valid.md'), '---\ntags: [inbox]\ntype: note\n---\n# Valid title\n', 'utf8');
  fs.writeFileSync(path.join(root, '00_Inbox', 'Broken.md'), '---\ntags: [broken,\n---\n# Broken title\n', 'utf8');
  return root;
}

test('metadata indexer records valid and malformed Markdown without indexing protected folders', async () => {
  const root = createVault();
  const indexer = createMetadataIndexer();
  assert.equal(indexer.setRoot(root).ok, true);

  const rebuilt = await indexer.rebuildIndex();
  assert.equal(rebuilt.ok, true);
  assert.equal(rebuilt.indexedCount, 2);
  assert.equal(rebuilt.malformedCount, 1);

  const store = createMetadataIndexStore();
  store.setRoot(root);
  const loaded = store.load();
  assert.equal(loaded.documents['00_Inbox/Valid.md'].title, 'Valid title');
  assert.deepEqual(loaded.documents['00_Inbox/Valid.md'].fields.tags, ['inbox']);
  assert.equal(loaded.documents['00_Inbox/Broken.md'].frontmatterState, 'invalid');
  assert.equal(Object.keys(loaded.documents).some((entry) => entry.startsWith('.vincarios/')), false);
});

test('metadata indexer reuses unchanged records and rebuilds changed source', async () => {
  const root = createVault();
  const indexer = createMetadataIndexer();
  indexer.setRoot(root);
  await indexer.rebuildIndex();

  const unchanged = await indexer.rebuildIndex();
  assert.equal(unchanged.indexedCount, 0);
  assert.equal(unchanged.reusedCount, 2);

  fs.writeFileSync(path.join(root, '00_Inbox', 'Valid.md'), '# Updated title\n', 'utf8');
  const changed = await indexer.rebuildIndex();
  assert.equal(changed.indexedCount, 1);
  assert.equal(changed.reusedCount, 1);
});

test('metadata indexer updates and removes only changed Markdown paths', async () => {
  const root = createVault();
  const indexer = createMetadataIndexer();
  indexer.setRoot(root);
  await indexer.rebuildIndex();

  fs.writeFileSync(path.join(root, '00_Inbox', 'Valid.md'), '---\ntags: [updated]\n---\n# Updated title\n', 'utf8');
  const updated = indexer.syncChangedPaths(['00_Inbox/Valid.md']);
  assert.equal(updated.ok, true);
  assert.equal(updated.updatedCount, 1);

  const store = createMetadataIndexStore();
  store.setRoot(root);
  assert.deepEqual(store.load().documents['00_Inbox/Valid.md'].fields.tags, ['updated']);

  fs.unlinkSync(path.join(root, '00_Inbox', 'Broken.md'));
  const removed = indexer.syncChangedPaths(['00_Inbox/Broken.md']);
  assert.equal(removed.ok, true);
  assert.equal(removed.removedCount, 1);
  assert.equal(store.load().documents['00_Inbox/Broken.md'], undefined);
});
