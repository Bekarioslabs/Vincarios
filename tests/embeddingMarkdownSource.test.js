'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createEmbeddingMarkdownSource } = require('../src/main/embeddings/embeddingMarkdownSource');

test('embedding markdown source scans markdown files recursively and skips protected dot folders', () => {
  const root = createTempVault();
  writeFile(root, 'Notes/One.md', '# One');
  writeFile(root, 'Notes/Two.txt', 'No');
  writeFile(root, 'Nested/Three.markdown', '# Three');
  writeFile(root, '.vitruvios/index/documents.json', '{}');
  writeFile(root, '.obsidian/app.json', '{}');

  const source = createEmbeddingMarkdownSource();
  const opened = source.setRoot(root);
  const listed = source.listMarkdownDocuments();

  assert.equal(opened.ok, true);
  assert.equal(listed.ok, true);
  assert.deepEqual(listed.documents.map((item) => item.path), ['Nested/Three.markdown', 'Notes/One.md']);
  assert.equal(listed.documents[0].content, '# Three');
  assert.equal(Number.isFinite(listed.documents[0].mtimeMs), true);
});

test('embedding markdown source requires an opened vault', () => {
  const source = createEmbeddingMarkdownSource();
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
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vitruvios-embedding-source-'));
}
