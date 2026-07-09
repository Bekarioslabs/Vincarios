'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createVaultContext } = require('./vaultContext');
const { createVaultAssetResolver } = require('./vaultAssetResolver');
const { DEFAULT_VAULT_PROFILE } = require('../../shared/vaultProfile/defaults');
const {
  getImageMimeType,
  getVaultEntryKind,
  isImagePath,
  isMarkdownPath
} = require('../../shared/fileTypes');

const MAX_IMAGE_ASSET_BYTES = 15 * 1024 * 1024;

function createVaultReadService(options) {
  options = options || {};
  const fileSystem = options.fs || fs;
  const profile = Object.freeze(Object.assign({}, DEFAULT_VAULT_PROFILE, options.profile || {}));
  const assetResolver = createVaultAssetResolver({ fs: fileSystem });
  let vault = null;

  function setRoot(vaultRoot) {
    if (typeof vaultRoot !== 'string' || !vaultRoot.trim()) {
      return fail('invalid_vault_root', 'Vault root is required.');
    }

    const resolvedRoot = path.resolve(vaultRoot);
    let stat;
    try {
      stat = fileSystem.statSync(resolvedRoot);
    } catch (error) {
      return fail('vault_not_found', 'Vault root does not exist.');
    }

    if (!stat.isDirectory()) {
      return fail('vault_not_directory', 'Vault root must be a directory.');
    }

    vault = createVaultContext(resolvedRoot);
    return ok({ root: vault.root, profile });
  }

  function getState() {
    return {
      hasVault: !!vault,
      root: vault ? vault.root : '',
      profile
    };
  }

  function listFolder(relativePath) {
    const currentVault = requireVault();
    if (!currentVault.ok) return currentVault;

    const resolved = currentVault.vault.resolve(relativePath || '', { allowRoot: true });
    if (!resolved.ok) return resolved;

    let stat;
    try {
      stat = fileSystem.statSync(resolved.absolutePath);
    } catch (error) {
      return fail('folder_not_found', 'Folder does not exist.');
    }

    if (!stat.isDirectory()) {
      return fail('not_a_folder', 'Path is not a folder.');
    }

    const entries = fileSystem.readdirSync(resolved.absolutePath, { withFileTypes: true })
      .filter((entry) => isVisibleSupportedEntry(entry))
      .map((entry) => toFolderEntry(entry, resolved.relativePath))
      .sort(sortEntries);

    return ok({
      folder: resolved.relativePath,
      entries
    });
  }

  function readMarkdown(relativePath) {
    const currentVault = requireVault();
    if (!currentVault.ok) return currentVault;

    const resolved = currentVault.vault.resolve(relativePath || '', { allowRoot: false });
    if (!resolved.ok) return resolved;

    if (!isMarkdownPath(resolved.relativePath)) {
      return fail('not_markdown', 'Only Markdown files can be read.');
    }

    let stat;
    try {
      stat = fileSystem.statSync(resolved.absolutePath);
    } catch (error) {
      return fail('file_not_found', 'Markdown file does not exist.');
    }

    if (!stat.isFile()) {
      return fail('not_a_file', 'Path is not a file.');
    }

    const content = fileSystem.readFileSync(resolved.absolutePath, 'utf8');
    return ok({
      path: resolved.relativePath,
      content,
      bytes: Buffer.byteLength(content, 'utf8'),
      modifiedMs: stat.mtimeMs
    });
  }

  function readImageAsset(payload) {
    payload = payload || {};
    const currentVault = requireVault();
    if (!currentVault.ok) return currentVault;

    const resolvedAsset = assetResolver.resolveImageAsset(currentVault.vault, payload.targetPath || '', payload.currentPath || '');
    if (!resolvedAsset.ok) return resolvedAsset;
    const resolved = resolvedAsset.resolved;

    if (!isImagePath(resolved.relativePath)) {
      return fail('not_image', 'Only supported image files can be read as preview assets.');
    }

    let stat;
    try {
      stat = fileSystem.statSync(resolved.absolutePath);
    } catch (error) {
      return fail('file_not_found', 'Image file does not exist.');
    }

    if (!stat.isFile()) {
      return fail('not_a_file', 'Path is not a file.');
    }

    if (stat.size > MAX_IMAGE_ASSET_BYTES) {
      return fail('image_too_large', 'Image is too large for V1 preview.');
    }

    const mimeType = getImageMimeType(resolved.relativePath);
    const content = fileSystem.readFileSync(resolved.absolutePath);
    return ok({
      path: resolved.relativePath,
      mimeType,
      bytes: stat.size,
      dataUrl: 'data:' + mimeType + ';base64,' + content.toString('base64')
    });
  }

  function requireVault() {
    if (!vault) return fail('vault_not_open', 'No vault is open.');
    return { ok: true, vault };
  }

  return {
    setRoot,
    getState,
    listFolder,
    readMarkdown,
    readImageAsset
  };
}

function isVisibleSupportedEntry(entry) {
  if (entry.name.startsWith('.')) return false;
  if (entry.isDirectory()) return true;
  if (!entry.isFile()) return false;
  return isMarkdownPath(entry.name) || isImagePath(entry.name);
}

function toFolderEntry(entry, parentRelativePath) {
  const relativePath = parentRelativePath
    ? parentRelativePath + '/' + entry.name
    : entry.name;
  return {
    name: entry.name,
    path: relativePath,
    kind: getVaultEntryKind(entry.name, entry.isDirectory())
  };
}

function sortEntries(a, b) {
  if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
  return a.name.localeCompare(b.name, 'de', { sensitivity: 'base', numeric: true });
}

function ok(value) {
  return Object.assign({ ok: true }, value);
}

function fail(code, message) {
  return {
    ok: false,
    code,
    message
  };
}

module.exports = {
  createVaultReadService,
  isMarkdownPath
};