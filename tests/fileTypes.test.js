'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {
  SUPPORTED_IMAGE_EXTENSIONS,
  getImageMimeType,
  isImagePath,
  getVaultEntryKind
} = require('../src/shared/fileTypes');

test('file types recognize V1 image extensions centrally', () => {
  assert.deepEqual(Array.from(SUPPORTED_IMAGE_EXTENSIONS), ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.bmp', '.ico']);
  assert.equal(isImagePath('Assets/Hero.PNG'), true);
  assert.equal(isImagePath('Assets/Hero.heic'), false);
  assert.equal(isImagePath('Notes/Hero.md'), false);
});

test('file types expose image mime types and vault entry kinds', () => {
  assert.equal(getImageMimeType('A.jpeg'), 'image/jpeg');
  assert.equal(getImageMimeType('A.svg'), 'image/svg+xml');
  assert.equal(getImageMimeType('A.txt'), '');
  assert.equal(getVaultEntryKind('A.md', false), 'markdown');
  assert.equal(getVaultEntryKind('A.png', false), 'image');
  assert.equal(getVaultEntryKind('A.txt', false), 'file');
  assert.equal(getVaultEntryKind('Folder', true), 'folder');
});

test('the shared file-type contract works identically in Node and the browser', () => {
  const api = require('../src/shared/fileTypes');
  const browser = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/shared/fileTypes.js'), 'utf8'), browser);
  const shared = browser.window.VincariosFileTypes;
  assert.ok(shared);
  assert.equal(Object.isFrozen(shared), true);
  for (const filePath of ['A.md', 'A.MARKDOWN', 'Notes\\A.markdown', 'A.markdown.txt', '.md', '..', 'Folder.md/A', 'A.svg', 'A.']) {
    assert.equal(shared.isMarkdownPath(filePath), api.isMarkdownPath(filePath), filePath);
    assert.equal(shared.isImagePath(filePath), api.isImagePath(filePath), filePath);
    assert.equal(shared.getImageMimeType(filePath), api.getImageMimeType(filePath), filePath);
    assert.equal(shared.getVaultEntryKind(filePath, false), api.getVaultEntryKind(filePath, false), filePath);
  }
  assert.equal(shared.stripMarkdownExtension('Notes/Field Guide.MARKDOWN'), 'Notes/Field Guide');
  assert.equal(shared.stripMarkdownExtension('Image.PNG'), 'Image.PNG');
});
