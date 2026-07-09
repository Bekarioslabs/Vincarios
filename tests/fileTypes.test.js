'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
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
