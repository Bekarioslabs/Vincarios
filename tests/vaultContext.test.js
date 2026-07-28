'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createVaultContext } = require('../src/main/vault/vaultContext');

test('createVaultContext resolves paths through the safety layer', (t) => {
  const vaultRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-vault-context-'));
  t.after(() => fs.rmSync(vaultRoot, { recursive: true, force: true }));
  const vault = createVaultContext(vaultRoot);
  const safe = vault.resolve('00_Inbox/Test.md');

  assert.equal(safe.ok, true);
  assert.equal(safe.relativePath, '00_Inbox/Test.md');

  const blocked = vault.resolve('.obsidian/app.json');
  assert.equal(blocked.ok, false);
  assert.equal(blocked.code, 'protected_path');
});

test('createVaultContext requires a root path', () => {
  assert.throws(() => createVaultContext(''), /Vault root is required/);
});