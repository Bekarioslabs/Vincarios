'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DEFAULT_BLOCKED_DOT_SEGMENTS } = require('../../shared/pathRules');
const { isMarkdownPath } = require('../vault/vaultReadService');

function createEmbeddingMarkdownSource(options) {
  options = options || {};
  const fileSystem = options.fs || fs;
  let vaultRoot = '';

  function setRoot(rootPath) {
    if (typeof rootPath !== 'string' || !rootPath.trim()) {
      return fail('invalid_vault_root', 'Vault root is required.');
    }
    const resolvedRoot = path.resolve(rootPath);
    try {
      const stat = fileSystem.statSync(resolvedRoot);
      if (!stat.isDirectory()) return fail('vault_not_directory', 'Vault root must be a directory.');
    } catch (error) {
      return fail('vault_not_found', 'Vault root does not exist.');
    }
    vaultRoot = resolvedRoot;
    return ok({ root: vaultRoot });
  }

  function listMarkdownDocuments() {
    if (!vaultRoot) return fail('vault_not_open', 'No vault is open.');
    const documents = [];
    scanFolder('', documents);
    documents.sort((a, b) => a.path.localeCompare(b.path, 'en', { sensitivity: 'base', numeric: true }));
    return ok({ documents });
  }

  function scanFolder(relativeFolder, documents) {
    const absoluteFolder = relativeFolder ? path.join(vaultRoot, ...relativeFolder.split('/')) : vaultRoot;
    let entries;
    try {
      entries = fileSystem.readdirSync(absoluteFolder, { withFileTypes: true });
    } catch (error) {
      return;
    }

    for (const entry of entries) {
      if (isBlockedEntry(entry.name)) continue;
      const relativePath = relativeFolder ? relativeFolder + '/' + entry.name : entry.name;
      const absolutePath = path.join(absoluteFolder, entry.name);
      if (entry.isDirectory()) {
        scanFolder(relativePath, documents);
      } else if (entry.isFile() && isMarkdownPath(entry.name)) {
        documents.push(readDocument(relativePath, absolutePath));
      }
    }
  }

  function readDocument(relativePath, absolutePath) {
    const stat = fileSystem.statSync(absolutePath);
    return {
      path: relativePath.replace(/\\/g, '/'),
      content: fileSystem.readFileSync(absolutePath, 'utf8'),
      mtimeMs: stat.mtimeMs
    };
  }

  return Object.freeze({
    setRoot,
    listMarkdownDocuments
  });
}

function isBlockedEntry(name) {
  return String(name || '').startsWith('.') && DEFAULT_BLOCKED_DOT_SEGMENTS.has(String(name).toLowerCase());
}

function ok(value) {
  return Object.assign({ ok: true }, value);
}

function fail(code, message) {
  return { ok: false, code, message };
}

module.exports = {
  createEmbeddingMarkdownSource
};
