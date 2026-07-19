'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createVaultContext } = require('./vaultContext');
const { isImagePath, isMarkdownPath } = require('../../shared/fileTypes');

const PDF_EXTENSION = '.pdf';

function createVaultInventoryService(options) {
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

  function getInventory() {
    if (!vault) return fail('vault_not_open', 'No vault is open.');
    const counts = createEmptyInventory();
    try {
      walk(vault.root, counts);
      return ok(counts);
    } catch (_error) {
      return fail('inventory_unavailable', 'Vault inventory could not be read.');
    }
  }

  function walk(folderPath, counts) {
    fileSystem.readdirSync(folderPath, { withFileTypes: true }).forEach((entry) => {
      if (!entry || String(entry.name || '').startsWith('.')) return;
      const entryPath = path.join(folderPath, entry.name);
      if (entry.isDirectory()) {
        counts.folders += 1;
        walk(entryPath, counts);
        return;
      }
      if (!entry.isFile()) return;
      counts.totalFiles += 1;
      if (isMarkdownPath(entry.name)) counts.markdown += 1;
      else if (isImagePath(entry.name)) counts.images += 1;
      else if (path.extname(entry.name).toLowerCase() === PDF_EXTENSION) counts.pdfs += 1;
      else counts.otherFiles += 1;
    });
  }

  return Object.freeze({ setRoot, getInventory });
}

function createEmptyInventory() {
  return { folders: 0, markdown: 0, images: 0, pdfs: 0, otherFiles: 0, totalFiles: 0 };
}

function ok(value) {
  return Object.assign({ ok: true }, value || {});
}

function fail(code, message) {
  return { ok: false, code, message };
}

module.exports = { createVaultInventoryService, createEmptyInventory };