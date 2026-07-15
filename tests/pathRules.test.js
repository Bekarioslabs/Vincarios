'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {
  normalizeVaultRelativePath,
  resolveInsideVault,
  isBlockedDotPath
} = require('../src/shared/pathRules');

test('normalizes simple vault-relative paths', () => {
  assert.deepEqual(normalizeVaultRelativePath('  00_Inbox\\Note.md  '), {
    ok: true,
    value: '00_Inbox/Note.md'
  });
  assert.deepEqual(normalizeVaultRelativePath('./02_Projekte//StarLu/Tasks.md'), {
    ok: true,
    value: '02_Projekte/StarLu/Tasks.md'
  });
});

test('rejects absolute, URL, drive-qualified, and traversal paths', () => {
  const cases = [
    'C:\\Users\\beka\\secret.md',
    'D:/Vitruvios_AGENT/vitruvios/Note.md',
    '/etc/passwd',
    '\\\\server\\share\\file.md',
    'file:///D:/vault/file.md',
    '../outside.md',
    '00_Inbox/../../outside.md'
  ];

  for (const input of cases) {
    assert.equal(normalizeVaultRelativePath(input).ok, false, input);
  }
});

test('blocks protected dot folders anywhere in the relative path', () => {
  const cases = [
    '.obsidian/app.json',
    '90_AI_Brain/.vitruvios/config.json',
    '00_Inbox/.vitruvios/config.json',
    '.git/config'
  ];

  for (const input of cases) {
    const result = normalizeVaultRelativePath(input);
    assert.equal(result.ok, false, input);
    assert.equal(result.code, 'protected_path');
    assert.equal(isBlockedDotPath(input), true);
  }
});

test('can allow or reject vault root depending on operation', () => {
  assert.deepEqual(normalizeVaultRelativePath(''), { ok: true, value: '' });
  const result = normalizeVaultRelativePath('', { allowRoot: false });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'root_not_allowed');
});

test('resolves safe paths inside the vault root only', () => {
  const root = path.join('D:', 'Vault');
  const safe = resolveInsideVault(root, '03_Wissen/Note.md');

  assert.equal(safe.ok, true);
  assert.equal(safe.relativePath, '03_Wissen/Note.md');
  assert.equal(safe.absolutePath, path.resolve(root, '03_Wissen', 'Note.md'));

  const unsafe = resolveInsideVault(root, '../Other/Note.md');
  assert.equal(unsafe.ok, false);
});