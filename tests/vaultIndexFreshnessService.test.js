'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createVaultIndexFreshnessService } = require('../src/main/vault/vaultIndexFreshnessService');

test('vault index freshness captures one inventory and compares index document paths and mtimes', () => {
  const inventory = [
    { path: 'A.md', mtimeMs: 10 },
    { path: 'Folder/B.md', mtimeMs: 20 }
  ];
  const service = createVaultIndexFreshnessService({
    source: {
      setRoot: () => ({ ok: true }),
      listMarkdownInventory: () => ({ ok: true, documents: inventory, skippedCount: 0 })
    }
  });

  assert.equal(service.setRoot('D:/Vault').ok, true);
  assert.equal(service.compareDocuments({
    'A.md': { mtimeMs: 10 },
    'Folder/B.md': { mtimeMs: 20 }
  }).current, true);
  assert.equal(service.compareDocuments({
    'A.md': { mtimeMs: 11 },
    'Folder/B.md': { mtimeMs: 20 }
  }).current, false);
  assert.equal(service.compareDocuments({
    'A.md': { mtimeMs: 10 }
  }).current, false);

  service.markStale();
  const changed = service.compareDocuments({
    'A.md': { mtimeMs: 10 },
    'Folder/B.md': { mtimeMs: 20 }
  });
  assert.equal(changed.current, false);
  assert.equal(changed.reason, 'vault_changed');
});

test('vault index freshness fails closed when the inventory scan is incomplete', () => {
  const service = createVaultIndexFreshnessService({
    source: {
      setRoot: () => ({ ok: true }),
      listMarkdownInventory: () => ({ ok: true, documents: [], skippedCount: 1 })
    }
  });

  service.setRoot('D:/Vault');
  const compared = service.compareDocuments({});

  assert.equal(compared.ok, true);
  assert.equal(compared.current, false);
  assert.equal(compared.reason, 'inventory_incomplete');
});

test('vault index freshness applies direct Markdown changes without rescanning the vault', () => {
  const records = new Map([['A.md', { path: 'A.md', mtimeMs: 10 }]]);
  const service = createVaultIndexFreshnessService({
    source: {
      setRoot: () => ({ ok: true }),
      listMarkdownInventory: () => ({ ok: true, documents: Array.from(records.values()), skippedCount: 0 }),
      readMarkdownDocument: (path) => records.has(path)
        ? { ok: true, document: records.get(path) }
        : { ok: false, code: 'markdown_not_found' }
    }
  });

  service.setRoot('D:/Vault');
  records.set('A.md', { path: 'A.md', mtimeMs: 20 });
  assert.equal(service.applyChanges(['A.md']).ok, true);
  assert.equal(service.compareDocuments({ 'A.md': { mtimeMs: 20 } }).current, true);
});
