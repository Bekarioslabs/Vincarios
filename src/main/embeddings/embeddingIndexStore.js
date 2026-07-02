'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createVaultContext } = require('../vault/vaultContext');
const { createEmptyEmbeddingIndex, createIndexedDocumentRecord } = require('../../shared/embeddings/embeddingIndexSchema');

const INDEX_RELATIVE_FOLDER = '.zeus/index';
const MANIFEST_FILE = 'manifest.json';
const DOCUMENTS_FILE = 'documents.json';

function createEmbeddingIndexStore(options) {
  options = options || {};
  const fileSystem = options.fs || fs;
  let vault = null;

  function setRoot(vaultRoot) {
    if (typeof vaultRoot !== 'string' || !vaultRoot.trim()) {
      return fail('invalid_vault_root', 'Vault root is required.');
    }
    const resolvedRoot = path.resolve(vaultRoot);
    try {
      const stat = fileSystem.statSync(resolvedRoot);
      if (!stat.isDirectory()) return fail('vault_not_directory', 'Vault root must be a directory.');
    } catch (error) {
      return fail('vault_not_found', 'Vault root does not exist.');
    }
    vault = createVaultContext(resolvedRoot);
    return ok({ root: vault.root });
  }

  function getIndexLocation() {
    const current = requireVault();
    if (!current.ok) return current;
    const indexFolder = path.join(current.vault.root, '.zeus', 'index');
    return {
      ok: true,
      relativeFolder: INDEX_RELATIVE_FOLDER,
      folderPath: indexFolder,
      manifestPath: path.join(indexFolder, MANIFEST_FILE),
      documentsPath: path.join(indexFolder, DOCUMENTS_FILE)
    };
  }

  function loadManifest() {
    const location = getIndexLocation();
    if (!location.ok) return location;
    if (!fileSystem.existsSync(location.manifestPath)) {
      return ok({ index: createEmptyEmbeddingIndex() });
    }
    try {
      return ok({ index: JSON.parse(fileSystem.readFileSync(location.manifestPath, 'utf8')) });
    } catch (error) {
      return fail('invalid_embedding_manifest', 'Embedding index manifest could not be read.');
    }
  }

  function saveManifest(options) {
    const location = getIndexLocation();
    if (!location.ok) return location;
    const index = createEmptyEmbeddingIndex(options || {});
    try {
      fileSystem.mkdirSync(location.folderPath, { recursive: true });
      fileSystem.writeFileSync(location.manifestPath, JSON.stringify(index, null, 2) + '\n', 'utf8');
      if (!fileSystem.existsSync(location.documentsPath)) {
        fileSystem.writeFileSync(location.documentsPath, JSON.stringify({ documents: {} }, null, 2) + '\n', 'utf8');
      }
      return ok({ index, manifestPath: location.manifestPath });
    } catch (error) {
      return fail('embedding_index_write_failed', 'Embedding index manifest could not be written.');
    }
  }

  function loadDocuments() {
    const location = getIndexLocation();
    if (!location.ok) return location;
    if (!fileSystem.existsSync(location.documentsPath)) {
      return ok({ documents: {} });
    }
    try {
      const parsed = JSON.parse(fileSystem.readFileSync(location.documentsPath, 'utf8'));
      return ok({ documents: normalizeDocuments(parsed.documents) });
    } catch (error) {
      return fail('invalid_embedding_documents', 'Embedding index documents could not be read.');
    }
  }

  function saveDocuments(documents) {
    const location = getIndexLocation();
    if (!location.ok) return location;
    const normalized = normalizeDocuments(documents);
    try {
      fileSystem.mkdirSync(location.folderPath, { recursive: true });
      fileSystem.writeFileSync(location.documentsPath, JSON.stringify({ documents: normalized }, null, 2) + '\n', 'utf8');
      return ok({ documents: normalized, documentsPath: location.documentsPath });
    } catch (error) {
      return fail('embedding_documents_write_failed', 'Embedding index documents could not be written.');
    }
  }

  function requireVault() {
    if (!vault) return fail('vault_not_open', 'No vault is open.');
    return { ok: true, vault };
  }

  return Object.freeze({
    setRoot,
    getIndexLocation,
    loadManifest,
    saveManifest,
    loadDocuments,
    saveDocuments
  });
}

function normalizeDocuments(documents) {
  const normalized = {};
  if (!documents || typeof documents !== 'object' || Array.isArray(documents)) return normalized;
  for (const [documentPath, record] of Object.entries(documents)) {
    const indexedRecord = createIndexedDocumentRecord(Object.assign({}, record, { path: documentPath }));
    if (indexedRecord.path) normalized[indexedRecord.path] = indexedRecord;
  }
  return normalized;
}
function ok(value) {
  return Object.assign({ ok: true }, value);
}

function fail(code, message) {
  return { ok: false, code, message };
}

module.exports = {
  INDEX_RELATIVE_FOLDER,
  MANIFEST_FILE,
  DOCUMENTS_FILE,
  createEmbeddingIndexStore
};
