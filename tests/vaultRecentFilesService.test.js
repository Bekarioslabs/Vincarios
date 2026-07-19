'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createVaultRecentFilesService } = require('../src/main/vault/vaultRecentFilesService');

function createVault() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vitruvios-recent-'));
}

function writeMarkdown(root, relativePath) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, '# Note\n', 'utf8');
}

test('recent files stay vault-local, normalized, bounded, and most-recent first', () => {
  const root = createVault();
  writeMarkdown(root, 'Notes/One.md');
  writeMarkdown(root, 'Notes/Two.md');
  const service = createVaultRecentFilesService({ now: () => '2026-07-17T10:00:00.000Z' });
  service.setRoot(root);

  service.record({ path: 'Notes/One.md' });
  service.record({ path: 'Notes/Two.md' });
  service.record({ path: 'Notes/One.md' });

  const result = service.list();
  assert.equal(result.ok, true);
  assert.deepEqual(result.files.map((entry) => entry.path), ['Notes/One.md', 'Notes/Two.md']);
  assert.equal(fs.existsSync(path.join(root, '.vitruvios', 'recent-files.json')), true);
});

test('recent files reject unsafe or missing entries and prune stale files', () => {
  const root = createVault();
  writeMarkdown(root, 'Notes/One.md');
  const service = createVaultRecentFilesService();
  service.setRoot(root);

  assert.equal(service.record({ path: '../outside.md' }).ok, false);
  assert.equal(service.record({ path: 'Notes/Missing.md' }).ok, false);
  service.record({ path: 'Notes/One.md' });
  fs.unlinkSync(path.join(root, 'Notes', 'One.md'));

  assert.deepEqual(service.list().files, []);
});