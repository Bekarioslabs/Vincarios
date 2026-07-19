'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createVaultInventoryService } = require('../src/main/vault/vaultInventoryService');

test('counts visible vault folders and file types without reading file content', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vitruvios-inventory-'));
  try {
    fs.mkdirSync(path.join(root, 'Notes'));
    fs.mkdirSync(path.join(root, 'Assets'));
    fs.mkdirSync(path.join(root, '.vitruvios'));
    fs.writeFileSync(path.join(root, 'Notes', 'Welcome.md'), '# Welcome');
    fs.writeFileSync(path.join(root, 'Assets', 'cover.png'), 'not-an-image');
    fs.writeFileSync(path.join(root, 'Assets', 'brief.pdf'), 'not-a-pdf');
    fs.writeFileSync(path.join(root, 'archive.zip'), 'not-a-zip');
    fs.writeFileSync(path.join(root, '.vitruvios', 'recent-files.json'), '{}');

    const service = createVaultInventoryService();
    assert.equal(service.setRoot(root).ok, true);

    assert.deepEqual(service.getInventory(), {
      ok: true,
      folders: 2,
      markdown: 1,
      images: 1,
      pdfs: 1,
      otherFiles: 1,
      totalFiles: 4
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('requires an open vault before reading inventory', () => {
  const service = createVaultInventoryService();
  assert.deepEqual(service.getInventory(), {
    ok: false,
    code: 'vault_not_open',
    message: 'No vault is open.'
  });
});
