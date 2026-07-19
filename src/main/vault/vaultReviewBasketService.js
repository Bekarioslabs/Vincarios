'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createVaultContext } = require('./vaultContext');
const { CURRENT_INTERNAL_NAMESPACE } = require('../../shared/internalNamespace');

const REVIEW_BASKET_RELATIVE_PATH = path.join(CURRENT_INTERNAL_NAMESPACE, 'review-basket.json');
const REVIEW_BASKET_VERSION = 1;
const REVIEW_BASKET_ITEM_LIMIT = 80;
const REVIEW_BASKET_MAX_BYTES = 2 * 1024 * 1024;
const PERSISTED_STATUSES = new Set(['open', 'done', 'failed', 'rejected', 'stale']);
const PATH_FIELDS = Object.freeze(['sourcePath', 'targetPath', 'targetFolder', 'templatePlanRootPath']);

function createVaultReviewBasketService(options) {
  options = options || {};
  const fileSystem = options.fs || fs;
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

  function load() {
    const current = requireVault();
    if (!current.ok) return current;
    const filePath = getCachePath(current.vault.root);
    if (!fileSystem.existsSync(filePath)) return ok({ snapshot: { items: [] } });
    try {
      const parsed = JSON.parse(fileSystem.readFileSync(filePath, 'utf8'));
      const snapshot = normalizeSnapshot(current.vault, parsed && parsed.snapshot);
      if (!snapshot.ok) return ok({ snapshot: { items: [] }, warning: 'Review Basket cache could not be restored.' });
      return ok({ snapshot: snapshot.value });
    } catch (_error) {
      return ok({ snapshot: { items: [] }, warning: 'Review Basket cache could not be restored.' });
    }
  }

  function save(payload) {
    const current = requireVault();
    if (!current.ok) return current;
    const snapshot = normalizeSnapshot(current.vault, payload);
    if (!snapshot.ok) return snapshot;
    const serialized = JSON.stringify({ version: REVIEW_BASKET_VERSION, snapshot: snapshot.value }, null, 2) + '\n';
    if (Buffer.byteLength(serialized, 'utf8') > REVIEW_BASKET_MAX_BYTES) {
      return fail('review_snapshot_too_large', 'Review Basket cache exceeds the local size limit.');
    }
    return writeSnapshot(current.vault.root, serialized);
  }

  function normalizeSnapshot(context, payload) {
    const items = payload && Array.isArray(payload.items) ? payload.items : null;
    if (!items || items.length > REVIEW_BASKET_ITEM_LIMIT) {
      return fail('invalid_review_snapshot', 'Review Basket cache is invalid.');
    }
    const normalized = [];
    for (const entry of items) {
      if (!entry || typeof entry !== 'object') return fail('invalid_review_snapshot', 'Review Basket cache is invalid.');
      const item = cloneJson(entry);
      if (!item) return fail('invalid_review_snapshot', 'Review Basket cache is invalid.');
      if (String(item.status || 'open') === 'dismissed') continue;
      item.status = normalizeStatus(item.status);
      if (!validateItemPaths(context, item)) return fail('invalid_review_snapshot', 'Review Basket cache contains an invalid path.');
      normalized.push(item);
    }
    return ok({ value: { items: normalized } });
  }

  function normalizeStatus(value) {
    const status = String(value || 'open').trim().toLowerCase();
    return PERSISTED_STATUSES.has(status) ? status : 'failed';
  }

  function validateItemPaths(context, item) {
    for (const field of PATH_FIELDS) {
      if (!validatePath(context, item[field])) return false;
    }
    if (Array.isArray(item.folders) && !item.folders.every((folder) => validatePath(context, folder))) return false;
    if (Array.isArray(item.files) && !item.files.every((file) => file && validatePath(context, file.path))) return false;
    return true;
  }

  function validatePath(context, value) {
    if (value === undefined || value === null || value === '') return true;
    return context.resolve(String(value), { allowRoot: false }).ok === true;
  }

  function cloneJson(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_error) {
      return null;
    }
  }

  function writeSnapshot(root, serialized) {
    const filePath = getCachePath(root);
    const temporaryPath = filePath + '.tmp';
    try {
      fileSystem.mkdirSync(path.dirname(filePath), { recursive: true });
      fileSystem.writeFileSync(temporaryPath, serialized, 'utf8');
      fileSystem.renameSync(temporaryPath, filePath);
      return ok({ path: REVIEW_BASKET_RELATIVE_PATH });
    } catch (_error) {
      try { if (fileSystem.existsSync(temporaryPath)) fileSystem.unlinkSync(temporaryPath); } catch (_cleanupError) {}
      return fail('review_basket_write_failed', 'Review Basket cache could not be saved.');
    }
  }

  function getCachePath(root) {
    return path.join(root, REVIEW_BASKET_RELATIVE_PATH);
  }

  function requireVault() {
    return vault ? { ok: true, vault } : fail('vault_not_open', 'No vault is open.');
  }

  return Object.freeze({ setRoot, load, save });
}

function ok(value) {
  return Object.assign({ ok: true }, value || {});
}

function fail(code, message) {
  return { ok: false, code, message };
}

module.exports = {
  REVIEW_BASKET_RELATIVE_PATH,
  REVIEW_BASKET_VERSION,
  REVIEW_BASKET_ITEM_LIMIT,
  REVIEW_BASKET_MAX_BYTES,
  createVaultReviewBasketService
};