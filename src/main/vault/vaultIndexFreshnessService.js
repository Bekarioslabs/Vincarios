'use strict';

const { createVaultMarkdownSource } = require('./vaultMarkdownSource');

function createVaultIndexFreshnessService(options) {
  options = options || {};
  const source = options.source || createVaultMarkdownSource(options);
  let snapshot = null;
  let stale = false;

  function setRoot(vaultRoot) {
    snapshot = null;
    stale = false;
    const opened = source.setRoot(vaultRoot);
    if (!opened.ok) return opened;
    return refreshSnapshot();
  }

  function refreshSnapshot() {
    const listed = source.listMarkdownInventory();
    if (!listed.ok) {
      snapshot = null;
      return listed;
    }
    const documents = {};
    (listed.documents || []).forEach((document) => {
      const documentPath = normalizePath(document && document.path);
      if (documentPath) documents[documentPath] = { mtimeMs: normalizeMtime(document && document.mtimeMs) };
    });
    snapshot = Object.freeze({
      documents: Object.freeze(documents),
      complete: Number(listed.skippedCount) === 0
    });
    stale = false;
    return ok({ documentCount: Object.keys(documents).length, complete: snapshot.complete });
  }

  function compareDocuments(indexDocuments) {
    if (!snapshot) return ok({ current: false, reason: 'inventory_unavailable' });
    if (stale) return ok({ current: false, reason: 'vault_changed' });
    if (!snapshot.complete) return ok({ current: false, reason: 'inventory_incomplete' });
    const indexed = normalizeDocuments(indexDocuments);
    const sourcePaths = Object.keys(snapshot.documents).sort();
    const indexedPaths = Object.keys(indexed).sort();
    if (sourcePaths.length !== indexedPaths.length) return ok({ current: false, reason: 'path_mismatch' });
    for (let index = 0; index < sourcePaths.length; index += 1) {
      const sourcePath = sourcePaths[index];
      if (sourcePath !== indexedPaths[index]) return ok({ current: false, reason: 'path_mismatch' });
      if (snapshot.documents[sourcePath].mtimeMs !== indexed[sourcePath].mtimeMs) {
        return ok({ current: false, reason: 'mtime_mismatch' });
      }
    }
    return ok({ current: true, reason: 'current' });
  }

  function applyChanges(paths) {
    if (!snapshot) return fail('inventory_unavailable', 'Vault inventory has not been captured.');
    if (stale) return fail('inventory_stale', 'Vault inventory is stale.');
    if (!snapshot.complete) return fail('inventory_incomplete', 'Vault inventory is incomplete.');
    if (!source || typeof source.readMarkdownDocument !== 'function') return fail('incremental_unavailable', 'Incremental inventory updates are unavailable.');

    const documents = Object.assign({}, snapshot.documents);
    const normalizedPaths = normalizePaths(paths);
    if (!normalizedPaths.length) return fail('invalid_changed_paths', 'At least one Markdown path is required.');
    for (const documentPath of normalizedPaths) {
      const loaded = source.readMarkdownDocument(documentPath, { includeContent: false });
      if (!loaded.ok && loaded.code === 'markdown_not_found') {
        delete documents[documentPath];
        continue;
      }
      if (!loaded.ok) return loaded;
      const document = loaded.document || {};
      const normalizedPath = normalizePath(document.path);
      if (!normalizedPath) return fail('invalid_markdown_path', 'Changed Markdown path is invalid.');
      documents[normalizedPath] = { mtimeMs: normalizeMtime(document.mtimeMs) };
    }
    snapshot = Object.freeze({ documents: Object.freeze(documents), complete: true });
    stale = false;
    return ok({ documentCount: Object.keys(documents).length, complete: true });
  }
  function getSnapshot() {
    return snapshot ? ok(snapshot) : fail('inventory_unavailable', 'Vault inventory has not been captured.');
  }

  function markStale() {
    stale = true;
  }

  return Object.freeze({ setRoot, refreshSnapshot, applyChanges, compareDocuments, getSnapshot, markStale });
}

function normalizeDocuments(documents) {
  const normalized = {};
  Object.entries(documents || {}).forEach(([documentPath, record]) => {
    const normalizedPath = normalizePath(documentPath);
    if (normalizedPath) normalized[normalizedPath] = { mtimeMs: normalizeMtime(record && record.mtimeMs) };
  });
  return normalized;
}

function normalizePath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
}

function normalizePaths(paths) {
  const seen = new Set();
  return (Array.isArray(paths) ? paths : []).reduce((items, value) => {
    const normalizedPath = normalizePath(value);
    if (!normalizedPath || !/\.md$/i.test(normalizedPath) || seen.has(normalizedPath)) return items;
    seen.add(normalizedPath);
    items.push(normalizedPath);
    return items;
  }, []);
}
function normalizeMtime(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function ok(value) { return Object.assign({ ok: true }, value); }
function fail(code, message) { return { ok: false, code, message }; }

module.exports = { createVaultIndexFreshnessService };
