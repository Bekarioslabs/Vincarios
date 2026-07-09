'use strict';

const path = require('node:path');
const { isImagePath } = require('../../shared/fileTypes');

function createVaultAssetResolver(options) {
  options = options || {};
  const fileSystem = options.fs;
  if (!fileSystem) throw new TypeError('Asset resolver requires a filesystem adapter.');

  function resolveImageAsset(vaultContext, targetPath, currentPath) {
    const normalizedTarget = normalizeSlashes(targetPath);
    if (!normalizedTarget) return fail('invalid_image_target', 'Image target is required.');

    const preferredPath = resolveRelativeTargetPath(normalizedTarget, currentPath);
    const preferred = vaultContext.resolve(preferredPath, { allowRoot: false });
    if (!preferred.ok) return preferred;

    if (fileExists(preferred.absolutePath)) return ok({ resolved: preferred });
    if (normalizedTarget.includes('/')) return fail('file_not_found', 'Image file does not exist.');

    const matches = findAssetBasenameMatches(vaultContext.root, normalizedTarget, isImagePath);
    if (matches.length === 1) {
      const resolved = vaultContext.resolve(matches[0], { allowRoot: false });
      return resolved.ok ? ok({ resolved }) : resolved;
    }
    if (matches.length > 1) return fail('ambiguous_image_link', 'Image link matches multiple files in the vault.');
    return fail('file_not_found', 'Image file does not exist.');
  }

  function fileExists(absolutePath) {
    try {
      return fileSystem.statSync(absolutePath).isFile();
    } catch (error) {
      return false;
    }
  }

  function findAssetBasenameMatches(root, targetName, acceptsPath) {
    const matches = [];
    const wanted = String(targetName || '').toLowerCase();
    walkVisibleFolders(root, '', (relativeFolder, entry) => {
      if (!entry.isFile()) return;
      if (!acceptsPath(entry.name)) return;
      if (entry.name.toLowerCase() !== wanted) return;
      matches.push(relativeFolder ? relativeFolder + '/' + entry.name : entry.name);
    });
    return matches;
  }

  function walkVisibleFolders(root, relativeFolder, visit) {
    const absoluteFolder = path.join(root, relativeFolder);
    let entries;
    try {
      entries = fileSystem.readdirSync(absoluteFolder, { withFileTypes: true });
    } catch (error) {
      return;
    }

    entries.forEach((entry) => {
      if (entry.name.startsWith('.')) return;
      const relativePath = relativeFolder ? relativeFolder + '/' + entry.name : entry.name;
      if (entry.isDirectory()) {
        walkVisibleFolders(root, relativePath, visit);
        return;
      }
      visit(relativeFolder, entry);
    });
  }

  return {
    resolveImageAsset,
    resolveRelativeTargetPath,
    findAssetBasenameMatches
  };
}

function resolveRelativeTargetPath(targetPath, currentPath) {
  const normalizedTarget = normalizeSlashes(targetPath);
  const normalizedCurrent = normalizeSlashes(currentPath);
  if (!normalizedTarget || normalizedTarget.includes('/')) return normalizedTarget;
  const currentFolder = parentFolder(normalizedCurrent);
  return currentFolder ? currentFolder + '/' + normalizedTarget : normalizedTarget;
}

function parentFolder(value) {
  const clean = normalizeSlashes(value);
  const index = clean.lastIndexOf('/');
  return index === -1 ? '' : clean.slice(0, index);
}

function normalizeSlashes(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').split('#')[0].split('?')[0].trim();
}

function ok(value) {
  return Object.assign({ ok: true }, value);
}

function fail(code, message) {
  return { ok: false, code, message };
}

module.exports = {
  createVaultAssetResolver,
  resolveRelativeTargetPath
};