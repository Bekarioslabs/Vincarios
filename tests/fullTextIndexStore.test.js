'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { createFullTextIndexStore } = require('../src/main/search/fullTextIndexStore');

function createVault() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vitruvios-full-text-index-'));
}

function createIndex() {
  return {
    version: 1,
    storage: 'vault-vitruvios-full-text-index',
    enabled: true,
    documents: {
      '03_Knowledge/Search.md': { path: '03_Knowledge/Search.md', hash: 'hash', mtimeMs: 1, schemaVersion: 1, headings: [{ level: 1, text: 'Search' }], tokens: ['search'] }
    },
    terms: { search: [{ path: '03_Knowledge/Search.md', heading: true }] }
  };
}

test('full-text store keeps opt-in after deleting its rebuildable cache', () => {
  const root = createVault();
  const store = createFullTextIndexStore();
  assert.equal(store.setRoot(root).ok, true);
  assert.deepEqual(store.getPreference(), { ok: true, enabled: false });
  assert.equal(store.setEnabled(true).ok, true);
  assert.equal(store.save(createIndex()).ok, true);

  const location = store.getLocation();
  assert.equal(fs.existsSync(location.manifestPath), true);
  assert.equal(fs.existsSync(location.termsPath), true);
  assert.equal(store.deleteIndex().ok, true);
  assert.equal(store.getPreference().enabled, true);
  assert.equal(store.load().exists, false);
  assert.equal(fs.existsSync(location.settingsPath), true);
});

test('full-text store fails closed for incomplete cache files', () => {
  const root = createVault();
  const store = createFullTextIndexStore();
  store.setRoot(root);
  store.setEnabled(true);
  const location = store.getLocation();
  fs.mkdirSync(location.folderPath, { recursive: true });
  fs.writeFileSync(location.manifestPath, '{}', 'utf8');

  const loaded = store.load();
  assert.equal(loaded.ok, false);
  assert.equal(loaded.code, 'invalid_full_text_index');
});
