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
  fs.writeFileSync(path.join(root, 'Hero.png'), Buffer.from([137, 80, 78, 71]));
  fs.writeFileSync(path.join(root, 'B.txt'), 'hidden from ZEUS');

  const service = createVaultReadService();
  const opened = service.setRoot(root);
  assert.equal(opened.ok, true);
  assert.equal(opened.root, path.resolve(root));

  const listed = service.listFolder('');
  assert.equal(listed.ok, true);
  assert.deepEqual(listed.entries.map((entry) => entry.name), ['00_Inbox', 'A.md', 'Hero.png']);
  assert.deepEqual(listed.entries.map((entry) => entry.kind), ['folder', 'markdown', 'image']);
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

test('vault read service reads image assets as data URLs after path and type validation', () => {
  const root = createTempVault();
  fs.mkdirSync(path.join(root, 'Assets'));
  fs.writeFileSync(path.join(root, 'Assets', 'Hero.png'), Buffer.from([137, 80, 78, 71]));
  fs.writeFileSync(path.join(root, 'Assets', 'Notes.txt'), 'not image');

  const service = createVaultReadService();
  service.setRoot(root);

  const image = service.readImageAsset({ targetPath: 'Hero.png', currentPath: 'Assets/Note.md' });
  assert.equal(image.ok, true);
  assert.equal(image.path, 'Assets/Hero.png');
  assert.equal(image.mimeType, 'image/png');
  assert.match(image.dataUrl, /^data:image\/png;base64,/);

  const text = service.readImageAsset({ targetPath: 'Notes.txt', currentPath: 'Assets/Note.md' });
  assert.equal(text.ok, false);
  assert.equal(text.code, 'not_image');

  const traversal = service.readImageAsset({ targetPath: '../Hero.png', currentPath: '../Unsafe.md' });
  assert.equal(traversal.ok, false);
});
test('vault read service resolves unique Obsidian image embeds by basename inside the vault', () => {
  const root = createTempVault();
  fs.mkdirSync(path.join(root, 'Assets'));
  fs.mkdirSync(path.join(root, 'Notes'));
  fs.writeFileSync(path.join(root, 'Assets', 'Hero.png'), Buffer.from([137, 80, 78, 71]));

  const service = createVaultReadService();
  service.setRoot(root);

  const image = service.readImageAsset({ targetPath: 'Hero.png', currentPath: 'Notes/Note.md' });
  assert.equal(image.ok, true);
  assert.equal(image.path, 'Assets/Hero.png');
});

test('vault read service rejects ambiguous Obsidian image basename embeds', () => {
  const root = createTempVault();
  fs.mkdirSync(path.join(root, 'A'));
  fs.mkdirSync(path.join(root, 'B'));
  fs.writeFileSync(path.join(root, 'A', 'Hero.png'), Buffer.from([137, 80, 78, 71]));
  fs.writeFileSync(path.join(root, 'B', 'Hero.png'), Buffer.from([137, 80, 78, 71]));

  const service = createVaultReadService();
  service.setRoot(root);

  const image = service.readImageAsset({ targetPath: 'Hero.png', currentPath: 'Notes/Note.md' });
  assert.equal(image.ok, false);
  assert.equal(image.code, 'ambiguous_image_link');
});
test('vault read service requires an opened vault', () => {
  const service = createVaultReadService();
  assert.equal(service.listFolder('').code, 'vault_not_open');
  assert.equal(service.readMarkdown('A.md').code, 'vault_not_open');
});

function createTempVault() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'zeus-vault-'));
}