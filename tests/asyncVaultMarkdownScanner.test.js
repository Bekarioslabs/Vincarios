'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { scanVaultMarkdownDocuments } = require('../src/main/indexing/asyncVaultMarkdownScanner');

test('async vault scanner reads Markdown in bounded batches and skips protected dot folders', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-async-scan-'));
  fs.mkdirSync(path.join(root, 'Notes'));
  fs.mkdirSync(path.join(root, '.vincarios'));
  fs.writeFileSync(path.join(root, 'Notes', 'One.md'), '# One', 'utf8');
  fs.writeFileSync(path.join(root, 'Notes', 'Ignore.txt'), 'No', 'utf8');
  fs.writeFileSync(path.join(root, '.vincarios', 'Private.md'), '# Private', 'utf8');

  const result = await scanVaultMarkdownDocuments(root, {
    fs,
    includeContent: true,
    batchSize: 2
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.documents.map((document) => document.path), ['Notes/One.md']);
  assert.equal(result.documents[0].content, '# One');
});

test('async vault scanner returns a cancellation result between batches', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-async-cancel-'));
  for (let index = 0; index < 6; index += 1) {
    fs.writeFileSync(path.join(root, 'Note-' + index + '.md'), '# Note', 'utf8');
  }
  const controller = new AbortController();
  let progressCalls = 0;

  const result = await scanVaultMarkdownDocuments(root, {
    fs,
    includeContent: true,
    batchSize: 2,
    onProgress() {
      progressCalls += 1;
      controller.abort();
    },
    signal: controller.signal
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'index_canceled');
  assert.equal(progressCalls, 1);
});
