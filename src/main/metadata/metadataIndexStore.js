'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createVaultContext } = require('../vault/vaultContext');
const { CURRENT_INTERNAL_NAMESPACE } = require('../../shared/internalNamespace');
const { createEmptyMetadataIndex, createMetadataRecord } = require('../../shared/metadata/metadataIndexSchema');

const METADATA_INDEX_RELATIVE_FOLDER = CURRENT_INTERNAL_NAMESPACE + '/index/metadata';
const MANIFEST_FILE = 'manifest.json';
const RECORDS_FILE = 'records.json';

function createMetadataIndexStore(options) {
  options = options || {};
  const fileSystem = options.fs || fs;
  let vault = null;

  function setRoot(vaultRoot) {
    if (!String(vaultRoot || '').trim()) return fail('invalid_vault_root', 'Vault root is required.');
    const root = path.resolve(vaultRoot);
    try {
      if (!fileSystem.statSync(root).isDirectory()) return fail('vault_not_directory', 'Vault root must be a directory.');
    } catch (error) {
      return fail('vault_not_found', 'Vault root does not exist.');
    }
    vault = createVaultContext(root);
    return ok({ root: vault.root });
  }

  function getLocation() {
    if (!vault) return fail('vault_not_open', 'No vault is open.');
    const folderPath = path.join(vault.root, CURRENT_INTERNAL_NAMESPACE, 'index', 'metadata');
    return ok({
      relativeFolder: METADATA_INDEX_RELATIVE_FOLDER,
      folderPath,
      manifestPath: path.join(folderPath, MANIFEST_FILE),
      recordsPath: path.join(folderPath, RECORDS_FILE)
    });
  }

  function load() {
    const location = getLocation();
    if (!location.ok) return location;
    const manifestExists = fileSystem.existsSync(location.manifestPath);
    const recordsExists = fileSystem.existsSync(location.recordsPath);
    if (!manifestExists && !recordsExists) return ok({ exists: false, index: createEmptyMetadataIndex(), documents: {} });
    if (!manifestExists || !recordsExists) return fail('invalid_metadata_index', 'Metadata index files are incomplete.');
    try {
      const manifest = JSON.parse(fileSystem.readFileSync(location.manifestPath, 'utf8'));
      const payload = JSON.parse(fileSystem.readFileSync(location.recordsPath, 'utf8'));
      const index = createEmptyMetadataIndex();
      if (manifest.version !== index.version || manifest.storage !== index.storage) return fail('invalid_metadata_index', 'Metadata index schema is unsupported.');
      return ok({ exists: true, index: manifest, documents: normalizeDocuments(payload.documents) });
    } catch (error) {
      return fail('invalid_metadata_index', 'Metadata index could not be read.');
    }
  }

  function save(documents) {
    const location = getLocation();
    if (!location.ok) return location;
    const index = createEmptyMetadataIndex();
    const normalized = normalizeDocuments(documents);
    const previousManifest = captureFile(location.manifestPath);
    const previousRecords = captureFile(location.recordsPath);
    try {
      fileSystem.mkdirSync(location.folderPath, { recursive: true });
      fileSystem.writeFileSync(location.manifestPath, JSON.stringify(index, null, 2) + '\n', 'utf8');
      fileSystem.writeFileSync(location.recordsPath, JSON.stringify({ documents: normalized }, null, 2) + '\n', 'utf8');
      return ok({ index, documents: normalized, location });
    } catch (error) {
      restoreFile(location.manifestPath, previousManifest);
      restoreFile(location.recordsPath, previousRecords);
      return fail('metadata_index_write_failed', 'Metadata index could not be saved.');
    }
  }

  function captureFile(filePath) {
    if (!fileSystem.existsSync(filePath)) return { exists: false, content: '' };
    return { exists: true, content: fileSystem.readFileSync(filePath, 'utf8') };
  }

  function restoreFile(filePath, snapshot) {
    try {
      if (snapshot && snapshot.exists) fileSystem.writeFileSync(filePath, snapshot.content, 'utf8');
      else if (fileSystem.existsSync(filePath)) fileSystem.unlinkSync(filePath);
    } catch (error) {
      // The original cache write error remains the actionable result.
    }
  }

  return Object.freeze({ setRoot, getLocation, load, save });
}

function normalizeDocuments(documents) {
  const normalized = {};
  if (!documents || typeof documents !== 'object' || Array.isArray(documents)) return normalized;
  Object.entries(documents).forEach(([documentPath, record]) => {
    const normalizedRecord = createMetadataRecord(Object.assign({}, record, { path: documentPath }));
    if (normalizedRecord.path) normalized[normalizedRecord.path] = normalizedRecord;
  });
  return normalized;
}

function ok(value) { return Object.assign({ ok: true }, value); }
function fail(code, message) { return { ok: false, code, message }; }

module.exports = { METADATA_INDEX_RELATIVE_FOLDER, MANIFEST_FILE, RECORDS_FILE, createMetadataIndexStore };
