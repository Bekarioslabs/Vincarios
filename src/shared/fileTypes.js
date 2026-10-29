(function() {
  'use strict';

  const path = typeof require === 'function' ? require('node:path') : null;

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
    const value = String(filePath || '');
    if (path) return path.extname(value).toLowerCase();
    const name = value.replace(/\\/g, '/').split('/').pop();
    const dot = name.lastIndexOf('.');
    return dot > 0 && name !== '..' ? name.slice(dot).toLowerCase() : '';
  }

  function isMarkdownPath(filePath) {
    return MARKDOWN_EXTENSIONS.includes(getExtension(filePath));
  }

  function stripMarkdownExtension(filePath) {
    const value = String(filePath || '');
    return isMarkdownPath(value) ? value.slice(0, -getExtension(value).length) : value;
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

  const api = Object.freeze({
    MARKDOWN_EXTENSIONS,
    SUPPORTED_IMAGE_EXTENSIONS,
    getImageMimeType,
    getVaultEntryKind,
    isImagePath,
    isMarkdownPath,
    stripMarkdownExtension
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosFileTypes = api;
})();
