'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createVaultContext } = require('../src/main/vault/vaultContext');

test('createVaultContext resolves paths through the safety layer', () => {
  const vault = createVaultContext(path.join('D:', 'Vault'));
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