'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createVaultContext } = require('./vaultContext');
const { isMarkdownPath } = require('../../shared/fileTypes');
const { CURRENT_INTERNAL_NAMESPACE } = require('../../shared/internalNamespace');

const RECENT_FILES_RELATIVE_PATH = path.join(CURRENT_INTERNAL_NAMESPACE, 'recent-files.json');
const RECENT_FILES_VERSION = 1;
const RECENT_FILES_LIMIT = 12;

function createVaultRecentFilesService(options) {
  options = options || {};
  const fileSystem = options.fs || fs;
  const now = typeof options.now === 'function' ? options.now : () => new Date().toISOString();
  let vault = null;

  function setRoot(vaultRoot) {
    if (typeof vaultRoot !== 'string' || !vaultRoot.trim()) return fail('invalid_vault_root', 'Vault root is required.');
    const root = path.resolve(vaultRoot);
    try {
      if (!fileSystem.statSync(root).isDirectory()) return fail('vault_not_directory', 'Vault root must be a directory.');
    } catch (_error) {
      return fail('vault_not_found', 'Vault root does not exist.');
    }
    vault = createVaultContext(root);
    return ok({ root: vault.root });
  }

  function list() {
    const current = requireVault();
    if (!current.ok) return current;
    const stored = readEntries(current.vault.root);
    if (!stored.ok) return stored;
    const entries = stored.entries.filter((entry) => isExistingMarkdown(current.vault, entry.path));
    if (entries.length !== stored.entries.length) writeEntries(current.vault.root, entries);
    return ok({ files: entries });
  }

  function record(payload) {
    const current = requireVault();
    if (!current.ok) return current;
    const resolved = resolveMarkdownPath(current.vault, payload && payload.path);
    if (!resolved.ok) return resolved;
    if (!isExistingMarkdown(current.vault, resolved.path)) return fail('file_not_found', 'Markdown file does not exist.');

    const stored = readEntries(current.vault.root);
    if (!stored.ok) return stored;
    const entries = [{ path: resolved.path, openedAt: String(now()) }]
      .concat(stored.entries.filter((entry) => entry.path !== resolved.path && isExistingMarkdown(current.vault, entry.path)))
      .slice(0, RECENT_FILES_LIMIT);
    const saved = writeEntries(current.vault.root, entries);
    if (!saved.ok) return saved;
    return ok({ files: entries });
  }

  function resolveMarkdownPath(context, requestedPath) {
    const resolved = context.resolve(requestedPath || '', { allowRoot: false });
    if (!resolved.ok) return resolved;
    if (!isMarkdownPath(resolved.relativePath)) return fail('not_markdown', 'Only Markdown files can be recorded as recent files.');
    return ok({ path: resolved.relativePath });
  }

  function readEntries(root) {
    const filePath = path.join(root, RECENT_FILES_RELATIVE_PATH);
    if (!fileSystem.existsSync(filePath)) return ok({ entries: [] });
    try {
      const parsed = JSON.parse(fileSystem.readFileSync(filePath, 'utf8'));
      const items = Array.isArray(parsed && parsed.files) ? parsed.files : [];
      const seen = new Set();
      const entries = items.reduce((result, entry) => {
        const requestedPath = String(entry && entry.path || '');
        const resolved = resolveMarkdownPath(createVaultContext(root), requestedPath);
        if (!resolved.ok || seen.has(resolved.path)) return result;
        seen.add(resolved.path);
        result.push({ path: resolved.path, openedAt: String(entry && entry.openedAt || '') });
        return result;
      }, []).slice(0, RECENT_FILES_LIMIT);
      return ok({ entries });
    } catch (_error) {
      return ok({ entries: [] });
    }
  }

  function writeEntries(root, entries) {
    const filePath = path.join(root, RECENT_FILES_RELATIVE_PATH);
    const temporaryPath = filePath + '.tmp';
    const payload = {
      version: RECENT_FILES_VERSION,
      files: entries.map((entry) => ({ path: entry.path, openedAt: entry.openedAt }))
    };
    try {
      fileSystem.mkdirSync(path.dirname(filePath), { recursive: true });
      fileSystem.writeFileSync(temporaryPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
      fileSystem.renameSync(temporaryPath, filePath);
      return ok({ path: RECENT_FILES_RELATIVE_PATH });
    } catch (_error) {
      try { if (fileSystem.existsSync(temporaryPath)) fileSystem.unlinkSync(temporaryPath); } catch (_cleanupError) {}
      return fail('recent_files_write_failed', 'Recent files could not be saved.');
    }
  }

  function isExistingMarkdown(context, relativePath) {
    const resolved = resolveMarkdownPath(context, relativePath);
    if (!resolved.ok) return false;
    try {
      return fileSystem.statSync(context.resolve(resolved.path, { allowRoot: false }).absolutePath).isFile();
    } catch (_error) {
      return false;
    }
  }

  function requireVault() {
    return vault ? { ok: true, vault } : fail('vault_not_open', 'No vault is open.');
  }

  return Object.freeze({ setRoot, list, record });
}

function ok(value) {
  return Object.assign({ ok: true }, value || {});
}

function fail(code, message) {
  return { ok: false, code, message };
}

module.exports = {
  RECENT_FILES_RELATIVE_PATH,
  RECENT_FILES_VERSION,
  RECENT_FILES_LIMIT,
  createVaultRecentFilesService
};