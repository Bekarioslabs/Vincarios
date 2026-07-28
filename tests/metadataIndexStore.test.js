'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { createMetadataIndexStore } = require('../src/main/metadata/metadataIndexStore');

function createVault() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-metadata-index-'));
}

test('metadata index store persists records separately under the selected vault', () => {
  const root = createVault();
  const store = createMetadataIndexStore();
  assert.equal(store.setRoot(root).ok, true);

  const saved = store.save({
    '00_Inbox/Note.md': {
      path: '00_Inbox/Note.md', hash: 'a', mtimeMs: 1, schemaVersion: 1, title: 'Note', frontmatterState: 'none', fields: {}
    }
  });
  assert.equal(saved.ok, true);
  assert.equal(fs.existsSync(path.join(root, '.vincarios', 'index', 'metadata', 'manifest.json')), true);

  const loaded = store.load();
  assert.equal(loaded.ok, true);
  assert.equal(loaded.exists, true);
  assert.equal(loaded.documents['00_Inbox/Note.md'].title, 'Note');
});

test('metadata index store fails closed for incomplete or invalid cache files', () => {
  const root = createVault();
  const store = createMetadataIndexStore();
  store.setRoot(root);
  const location = store.getLocation();
  fs.mkdirSync(location.folderPath, { recursive: true });
  fs.writeFileSync(location.manifestPath, '{invalid', 'utf8');

  const loaded = store.load();
  assert.equal(loaded.ok, false);
  assert.equal(loaded.code, 'invalid_metadata_index');
});

test('metadata index store restores the previous cache when a save fails', () => {
  const root = createVault();
  const seeded = createMetadataIndexStore();
  seeded.setRoot(root);
  seeded.save({
    '00_Inbox/Original.md': { path: '00_Inbox/Original.md', hash: 'original', mtimeMs: 1, title: 'Original', frontmatterState: 'none', fields: {} }
  });

  const failingFs = Object.create(fs);
  let writes = 0;
  failingFs.writeFileSync = (...args) => {
    writes += 1;
    if (writes === 2) throw new Error('simulated records write failure');
    return fs.writeFileSync(...args);
  };
  const failing = createMetadataIndexStore({ fs: failingFs });
  failing.setRoot(root);
  const result = failing.save({
    '00_Inbox/New.md': { path: '00_Inbox/New.md', hash: 'new', mtimeMs: 2, title: 'New', frontmatterState: 'none', fields: {} }
  });

  assert.equal(result.ok, false);
  const restored = seeded.load();
  assert.equal(restored.documents['00_Inbox/Original.md'].title, 'Original');
  assert.equal(restored.documents['00_Inbox/New.md'], undefined);
});