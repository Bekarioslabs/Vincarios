'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createVaultMarkdownSource } = require('../src/main/vault/vaultMarkdownSource');

test('vault Markdown source scans markdown files recursively and skips protected dot folders', () => {
  const root = createTempVault();
  writeFile(root, 'Notes/One.md', '# One');
  writeFile(root, 'Notes/Two.txt', 'No');
  writeFile(root, 'Nested/Three.markdown', '# Three');
  writeFile(root, '.vincarios/index/documents.json', '{}');
  writeFile(root, '.obsidian/app.json', '{}');

  const source = createVaultMarkdownSource();
  const opened = source.setRoot(root);
  const listed = source.listMarkdownDocuments();

  assert.equal(opened.ok, true);
  assert.equal(listed.ok, true);
  assert.deepEqual(listed.documents.map((item) => item.path), ['Nested/Three.markdown', 'Notes/One.md']);
  assert.equal(listed.documents[0].content, '# Three');
  assert.equal(Number.isFinite(listed.documents[0].mtimeMs), true);
});

test('vault Markdown source requires an opened vault', () => {
  const source = createVaultMarkdownSource();
  const result = source.listMarkdownDocuments();

  assert.equal(result.ok, false);
  assert.equal(result.code, 'vault_not_open');
});

function writeFile(root, relativePath, content) {
  const absolutePath = path.join(root, ...relativePath.split('/'));
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, 'utf8');
}

function createTempVault() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-embedding-source-'));
}

test('vault Markdown source exposes a lightweight inventory and skips files that disappear during scanning', () => {
  let rootStat = true;
  const source = createVaultMarkdownSource({
    fs: {
      statSync() {
        if (rootStat) {
          rootStat = false;
          return { isDirectory: () => true };
        }
        throw new Error('File disappeared');
      },
      readdirSync() {
        return [{ name: 'Gone.md', isDirectory: () => false, isFile: () => true }];
      },
      readFileSync() {
        throw new Error('File disappeared');
      }
    }
  });

  source.setRoot('D:/Vault');
  const inventory = source.listMarkdownInventory();
  const documents = source.listMarkdownDocuments();

  assert.equal(inventory.ok, true);
  assert.equal(inventory.skippedCount, 1);
  assert.deepEqual(inventory.documents, []);
  assert.equal(documents.ok, true);
  assert.equal(documents.skippedCount, 1);
});
