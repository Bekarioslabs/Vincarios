'use strict';

const path = require('node:path');

const MARKDOWN_EXTENSIONS = Object.freeze(['.md', '.markdown']);
const SUPPORTED_IMAGE_EXTENSIONS = Object.freeze(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.bmp', '.ico']);

const IMAGE_MIME_TYPES = Object.freeze({
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon'
});

function getExtension(filePath) {
  return path.extname(String(filePath || '')).toLowerCase();
}

function isMarkdownPath(filePath) {
  return MARKDOWN_EXTENSIONS.includes(getExtension(filePath));
}

function isImagePath(filePath) {
  return SUPPORTED_IMAGE_EXTENSIONS.includes(getExtension(filePath));
}

function getImageMimeType(filePath) {
  return IMAGE_MIME_TYPES[getExtension(filePath)] || '';
}

function getVaultEntryKind(filePath, isDirectory) {
  if (isDirectory) return 'folder';
  if (isMarkdownPath(filePath)) return 'markdown';
  if (isImagePath(filePath)) return 'image';
  return 'file';
}

module.exports = {
  MARKDOWN_EXTENSIONS,
  SUPPORTED_IMAGE_EXTENSIONS,
  getImageMimeType,
  getVaultEntryKind,
  isImagePath,
  isMarkdownPath
};
