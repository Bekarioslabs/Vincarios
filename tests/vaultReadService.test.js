'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createVaultReadService, isMarkdownPath } = require('../src/main/vault/vaultReadService');

test('isMarkdownPath recognizes Markdown extensions only', () => {
  assert.equal(isMarkdownPath('Note.md'), true);
  assert.equal(isMarkdownPath('Note.markdown'), true);
  assert.equal(isMarkdownPath('image.png'), false);
  assert.equal(isMarkdownPath('Note.md.exe'), false);
});

test('vault read service opens a vault and lists visible folders and Markdown files', () => {
  const root = createTempVault();
  fs.mkdirSync(path.join(root, '00_Inbox'));
  fs.mkdirSync(path.join(root, '.obsidian'));
  fs.writeFileSync(path.join(root, 'A.md'), '# A');
  fs.writeFileSync(path.join(root, 'B.txt'), 'hidden from ZEUS');

  const service = createVaultReadService();
  const opened = service.setRoot(root);
  assert.equal(opened.ok, true);
  assert.equal(opened.root, path.resolve(root));

  const listed = service.listFolder('');
  assert.equal(listed.ok, true);
  assert.deepEqual(listed.entries.map((entry) => entry.name), ['00_Inbox', 'A.md']);
  assert.deepEqual(listed.entries.map((entry) => entry.kind), ['folder', 'markdown']);
});

test('vault read service reads Markdown but rejects other files and protected paths', () => {
  const root = createTempVault();
  fs.writeFileSync(path.join(root, 'A.md'), '# A');
  fs.writeFileSync(path.join(root, 'B.txt'), 'not markdown');
  fs.mkdirSync(path.join(root, '.obsidian'));
  fs.writeFileSync(path.join(root, '.obsidian', 'app.json'), '{}');

  const service = createVaultReadService();
  service.setRoot(root);

  const read = service.readMarkdown('A.md');
  assert.equal(read.ok, true);
  assert.equal(read.path, 'A.md');
  assert.equal(read.content, '# A');

  const text = service.readMarkdown('B.txt');
  assert.equal(text.ok, false);
  assert.equal(text.code, 'not_markdown');

  const protectedFile = service.readMarkdown('.obsidian/app.json');
  assert.equal(protectedFile.ok, false);
  assert.equal(protectedFile.code, 'protected_path');
});

test('vault read service requires an opened vault', () => {
  const service = createVaultReadService();
  assert.equal(service.listFolder('').code, 'vault_not_open');
  assert.equal(service.readMarkdown('A.md').code, 'vault_not_open');
});

function createTempVault() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'zeus-vault-'));
}