'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DEFAULT_BLOCKED_DOT_SEGMENTS } = require('../../shared/pathRules');
const { isMarkdownPath } = require('./vaultReadService');
const { createVaultContext } = require('./vaultContext');
const { scanVaultMarkdownDocuments } = require('../indexing/asyncVaultMarkdownScanner');

function createVaultMarkdownSource(options) {
  options = options || {};
  const fileSystem = options.fs || fs;
  let vaultRoot = '';
  let vault = null;

  function setRoot(rootPath) {
    if (typeof rootPath !== 'string' || !rootPath.trim()) return fail('invalid_vault_root', 'Vault root is required.');
    const resolvedRoot = path.resolve(rootPath);
    try {
      if (!fileSystem.statSync(resolvedRoot).isDirectory()) return fail('vault_not_directory', 'Vault root must be a directory.');
    } catch (error) {
      return fail('vault_not_found', 'Vault root does not exist.');
    }
    vaultRoot = resolvedRoot;
    vault = createVaultContext(resolvedRoot);
    return ok({ root: vaultRoot });
  }

  function listMarkdownDocuments() {
    return collectMarkdownEntries(true);
  }

  function listMarkdownInventory() {
    return collectMarkdownEntries(false);
  }

  function listMarkdownDocumentsAsync(scanOptions) {
    if (!vaultRoot) return Promise.resolve(fail('vault_not_open', 'No vault is open.'));
    return scanVaultMarkdownDocuments(vaultRoot, Object.assign({}, scanOptions || {}, { fs: fileSystem, includeContent: true }));
  }

  function listMarkdownInventoryAsync(scanOptions) {
    if (!vaultRoot) return Promise.resolve(fail('vault_not_open', 'No vault is open.'));
    return scanVaultMarkdownDocuments(vaultRoot, Object.assign({}, scanOptions || {}, { fs: fileSystem, includeContent: false }));
  }

  function readMarkdownDocument(relativePath, options) {
    options = options || {};
    if (!vault) return fail('vault_not_open', 'No vault is open.');
    const resolved = vault.resolve(relativePath, { allowRoot: false });
    if (!resolved.ok) return resolved;
    if (!isMarkdownPath(resolved.relativePath)) return fail('not_markdown', 'Only Markdown files can be indexed.');
    try {
      const stat = fileSystem.statSync(resolved.absolutePath);
      if (!stat.isFile()) return fail('not_a_file', 'Markdown path is not a file.');
      const document = { path: resolved.relativePath, mtimeMs: stat.mtimeMs };
      if (options.includeContent !== false) document.content = fileSystem.readFileSync(resolved.absolutePath, 'utf8');
      return ok({ document });
    } catch (error) {
      if (error && error.code === 'ENOENT') return fail('markdown_not_found', 'Markdown file does not exist.');
      return fail('markdown_read_failed', 'Markdown file could not be read.');
    }
  }

  function collectMarkdownEntries(includeContent) {
    if (!vaultRoot) return fail('vault_not_open', 'No vault is open.');
    const state = { documents: [], skippedCount: 0 };
    scanFolder('', state, includeContent);
    state.documents.sort((left, right) => left.path.localeCompare(right.path, 'en', { sensitivity: 'base', numeric: true }));
    return ok(state);
  }

  function scanFolder(relativeFolder, state, includeContent) {
    const absoluteFolder = relativeFolder ? path.join(vaultRoot, ...relativeFolder.split('/')) : vaultRoot;
    let entries;
    try {
      entries = fileSystem.readdirSync(absoluteFolder, { withFileTypes: true });
    } catch (error) {
      state.skippedCount += 1;
      return;
    }
    for (const entry of entries) {
      if (isBlockedEntry(entry.name)) continue;
      const relativePath = relativeFolder ? relativeFolder + '/' + entry.name : entry.name;
      const absolutePath = path.join(absoluteFolder, entry.name);
      if (entry.isDirectory()) {
        scanFolder(relativePath, state, includeContent);
      } else if (entry.isFile() && isMarkdownPath(entry.name)) {
        try {
          const stat = fileSystem.statSync(absolutePath);
          const document = { path: relativePath.replace(/\\/g, '/'), mtimeMs: stat.mtimeMs };
          if (includeContent) document.content = fileSystem.readFileSync(absolutePath, 'utf8');
          state.documents.push(document);
        } catch (error) {
          state.skippedCount += 1;
        }
      }
    }
  }

  return Object.freeze({ setRoot, listMarkdownDocuments, listMarkdownInventory, listMarkdownDocumentsAsync, listMarkdownInventoryAsync, readMarkdownDocument });
}

function isBlockedEntry(name) {
  return String(name || '').startsWith('.') && DEFAULT_BLOCKED_DOT_SEGMENTS.has(String(name).toLowerCase());
}
function ok(value) { return Object.assign({ ok: true }, value); }
function fail(code, message) { return { ok: false, code, message }; }

module.exports = { createVaultMarkdownSource };