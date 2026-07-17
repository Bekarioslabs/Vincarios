'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createVaultContext } = require('../vault/vaultContext');
const { CURRENT_INTERNAL_NAMESPACE } = require('../../shared/internalNamespace');
const { FULL_TEXT_INDEX_STORAGE, FULL_TEXT_INDEX_VERSION, createEmptyFullTextIndex } = require('../../shared/search/fullTextIndexSchema');

const FULL_TEXT_INDEX_RELATIVE_FOLDER = CURRENT_INTERNAL_NAMESPACE + '/index/search';
const SETTINGS_FILE = 'settings.json';
const MANIFEST_FILE = 'manifest.json';
const TERMS_FILE = 'terms.json';

function createFullTextIndexStore(options) {
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
    const folderPath = path.join(vault.root, CURRENT_INTERNAL_NAMESPACE, 'index', 'search');
    return ok({
      relativeFolder: FULL_TEXT_INDEX_RELATIVE_FOLDER,
      folderPath,
      settingsPath: path.join(folderPath, SETTINGS_FILE),
      manifestPath: path.join(folderPath, MANIFEST_FILE),
      termsPath: path.join(folderPath, TERMS_FILE)
    });
  }

  function getPreference() {
    const location = getLocation();
    if (!location.ok) return location;
    if (!fileSystem.existsSync(location.settingsPath)) return ok({ enabled: false });
    try {
      const payload = JSON.parse(fileSystem.readFileSync(location.settingsPath, 'utf8'));
      return ok({ enabled: payload && payload.enabled === true });
    } catch (error) {
      return fail('invalid_full_text_settings', 'Full-text search settings could not be read.');
    }
  }

  function setEnabled(enabled) {
    const location = getLocation();
    if (!location.ok) return location;
    try {
      fileSystem.mkdirSync(location.folderPath, { recursive: true });
      fileSystem.writeFileSync(location.settingsPath, JSON.stringify({ enabled: enabled === true }, null, 2) + '\n', 'utf8');
      return ok({ enabled: enabled === true });
    } catch (error) {
      return fail('full_text_settings_write_failed', 'Full-text search settings could not be saved.');
    }
  }

  function load() {
    const location = getLocation();
    if (!location.ok) return location;
    const preference = getPreference();
    if (!preference.ok) return preference;
    const manifestExists = fileSystem.existsSync(location.manifestPath);
    const termsExists = fileSystem.existsSync(location.termsPath);
    if (!manifestExists && !termsExists) return ok({ exists: false, enabled: preference.enabled, index: createEmptyFullTextIndex() });
    if (!manifestExists || !termsExists) return fail('invalid_full_text_index', 'Full-text index files are incomplete.');
    try {
      const manifest = JSON.parse(fileSystem.readFileSync(location.manifestPath, 'utf8'));
      const terms = JSON.parse(fileSystem.readFileSync(location.termsPath, 'utf8'));
      if (manifest.version !== FULL_TEXT_INDEX_VERSION || manifest.storage !== FULL_TEXT_INDEX_STORAGE || !isRecord(manifest.documents) || !isRecord(terms.terms)) {
        return fail('invalid_full_text_index', 'Full-text index schema is unsupported.');
      }
      return ok({
        exists: true,
        enabled: preference.enabled,
        index: {
          version: manifest.version,
          storage: manifest.storage,
          enabled: preference.enabled,
          documents: manifest.documents,
          terms: terms.terms
        }
      });
    } catch (error) {
      return fail('invalid_full_text_index', 'Full-text index could not be read.');
    }
  }

  function save(index) {
    const location = getLocation();
    if (!location.ok) return location;
    const normalized = normalizeIndex(index);
    const previousManifest = captureFile(location.manifestPath);
    const previousTerms = captureFile(location.termsPath);
    try {
      fileSystem.mkdirSync(location.folderPath, { recursive: true });
      fileSystem.writeFileSync(location.manifestPath, JSON.stringify({
        version: normalized.version,
        storage: normalized.storage,
        documents: normalized.documents
      }, null, 2) + '\n', 'utf8');
      fileSystem.writeFileSync(location.termsPath, JSON.stringify({ terms: normalized.terms }, null, 2) + '\n', 'utf8');
      return ok({ index: normalized, location });
    } catch (error) {
      restoreFile(location.manifestPath, previousManifest);
      restoreFile(location.termsPath, previousTerms);
      return fail('full_text_index_write_failed', 'Full-text index could not be saved.');
    }
  }

  function deleteIndex() {
    const location = getLocation();
    if (!location.ok) return location;
    try {
      [location.manifestPath, location.termsPath].forEach((filePath) => {
        if (fileSystem.existsSync(filePath)) fileSystem.unlinkSync(filePath);
      });
      return ok({ deleted: true });
    } catch (error) {
      return fail('full_text_index_delete_failed', 'Full-text index could not be deleted.');
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

  return Object.freeze({ setRoot, getLocation, getPreference, setEnabled, load, save, deleteIndex });
}

function normalizeIndex(value) {
  const empty = createEmptyFullTextIndex();
  const source = value && typeof value === 'object' ? value : {};
  return {
    version: FULL_TEXT_INDEX_VERSION,
    storage: FULL_TEXT_INDEX_STORAGE,
    enabled: true,
    documents: isRecord(source.documents) ? source.documents : empty.documents,
    terms: isRecord(source.terms) ? source.terms : empty.terms
  };
}

function isRecord(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function ok(value) { return Object.assign({ ok: true }, value); }
function fail(code, message) { return { ok: false, code, message }; }

module.exports = {
  FULL_TEXT_INDEX_RELATIVE_FOLDER,
  MANIFEST_FILE,
  SETTINGS_FILE,
  TERMS_FILE,
  createFullTextIndexStore
};
