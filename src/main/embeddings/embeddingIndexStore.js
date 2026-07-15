'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { createVaultContext } = require('../vault/vaultContext');
const { CURRENT_INTERNAL_NAMESPACE } = require('../../shared/internalNamespace');
const { createEmptyEmbeddingIndex, createIndexedDocumentRecord } = require('../../shared/embeddings/embeddingIndexSchema');

const INDEX_RELATIVE_FOLDER = CURRENT_INTERNAL_NAMESPACE + '/index';
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
    const indexFolder = path.join(current.vault.root, CURRENT_INTERNAL_NAMESPACE, 'index');
    return {
      ok: true,
      relativeFolder: INDEX_RELATIVE_FOLDER,
      folderPath: indexFolder,
      manifestPath: path.join(indexFolder, MANIFEST_FILE),
      documentsPath: path.join(indexFolder, DOCUMENTS_FILE)
    };
  }

  function inspect() {
    const location = getIndexLocation();
    if (!location.ok) return location;
    const manifestExists = fileSystem.existsSync(location.manifestPath);
    const documentsExists = fileSystem.existsSync(location.documentsPath);
    if (!manifestExists && !documentsExists) return ok({ exists: false, manifest: null, documents: {} });
    if (!manifestExists || !documentsExists) {
      return fail('invalid_embedding_index', 'Embedding index files are incomplete.');
    }
    try {
      const manifest = JSON.parse(fileSystem.readFileSync(location.manifestPath, 'utf8'));
      const documentPayload = JSON.parse(fileSystem.readFileSync(location.documentsPath, 'utf8'));
      return ok({ exists: true, manifest, documents: normalizeDocuments(documentPayload.documents) });
    } catch (error) {
      return fail('invalid_embedding_index', 'Embedding index could not be read.');
    }
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

  function saveIndex(options, documents) {
    const location = getIndexLocation();
    if (!location.ok) return location;
    const index = createEmptyEmbeddingIndex(options || {});
    const normalized = normalizeDocuments(documents);
    const previousManifest = captureFile(location.manifestPath);
    const previousDocuments = captureFile(location.documentsPath);
    try {
      fileSystem.mkdirSync(location.folderPath, { recursive: true });
      fileSystem.writeFileSync(location.manifestPath, JSON.stringify(index, null, 2) + '\n', 'utf8');
      fileSystem.writeFileSync(location.documentsPath, JSON.stringify({ documents: normalized }, null, 2) + '\n', 'utf8');
      return ok({ index, documents: normalized, manifestPath: location.manifestPath, documentsPath: location.documentsPath });
    } catch (error) {
      restoreFile(location.manifestPath, previousManifest);
      restoreFile(location.documentsPath, previousDocuments);
      return fail('embedding_index_write_failed', 'Embedding index could not be saved.');
    }
  }

  function captureFile(filePath) {
    if (!fileSystem.existsSync(filePath)) return { exists: false, content: '' };
    return { exists: true, content: fileSystem.readFileSync(filePath, 'utf8') };
  }

  function restoreFile(filePath, snapshot) {
    try {
      if (snapshot && snapshot.exists) {
        fileSystem.writeFileSync(filePath, snapshot.content, 'utf8');
      } else if (fileSystem.existsSync(filePath)) {
        fileSystem.unlinkSync(filePath);
      }
    } catch (error) {
      // A restore failure leaves the original write error as the actionable result.
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
    inspect,
    loadManifest,
    saveIndex,
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
