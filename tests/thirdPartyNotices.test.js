'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const notices = fs.readFileSync(path.join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8');

for (const requiredNotice of [
  'Inter Variable',
  'Lucide',
  'Electron',
  '@huggingface/transformers',
  'paraphrase-multilingual-MiniLM-L12-v2',
  'markdown-it 14.3.0',
  'yaml 2.9.0',
  'sharp / libvips',
  'licenses/npm-runtime-licenses.json',
]) {
  test('third-party notices include ' + requiredNotice, () => {
    assert.match(notices, new RegExp(requiredNotice.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  });
}

test('bundled license resources include Apache, LGPL, and Sharp notices', () => {
  for (const fileName of ['Apache-2.0.txt', 'LGPL-3.0-or-later.txt', 'sharp-win32-x64-NOTICE.md']) {
    assert.equal(fs.existsSync(path.join(root, 'licenses', fileName)), true, fileName);
  }
});