'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  normalizeVaultRelativePath,
  resolveInsideVault
} = require('../../shared/pathRules');

function validateVaultRelativePath(relativePath, options) {
  return normalizeVaultRelativePath(relativePath, options);
}

function resolveVaultPath(vaultRoot, relativePath, options) {
  const resolved = resolveInsideVault(vaultRoot, relativePath, options);
  if (!resolved.ok) return resolved;
  return enforceCanonicalContainment(resolved, options);
}

function enforceCanonicalContainment(resolved, options) {
  const fileSystem = options && options.fileSystem ? options.fileSystem : fs;
  try {
    const canonicalRoot = realpath(fileSystem, resolved.vaultRoot);
    const existingAncestor = findExistingAncestor(fileSystem, resolved.absolutePath, resolved.vaultRoot);
    const canonicalAncestor = realpath(fileSystem, existingAncestor);
    const relation = path.relative(canonicalRoot, canonicalAncestor);
    if (relation && (relation.startsWith('..') || path.isAbsolute(relation))) {
      return fail('outside_vault', 'Canonical path escapes the vault.');
    }
    const canonicalTarget = path.resolve(canonicalAncestor, path.relative(existingAncestor, resolved.absolutePath));
    const canonicalValidation = normalizeVaultRelativePath(path.relative(canonicalRoot, canonicalTarget), options);
    if (!canonicalValidation.ok) return canonicalValidation;
    return Object.assign({}, resolved, { canonicalRoot });
  } catch (_error) {
    return fail('path_unavailable', 'Vault path could not be resolved safely.');
  }
}

function findExistingAncestor(fileSystem, targetPath, rootPath) {
  let current = targetPath;
  while (current !== rootPath && !fileSystem.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return current;
}

function realpath(fileSystem, targetPath) {
  if (fileSystem.realpathSync && typeof fileSystem.realpathSync.native === 'function') {
    return fileSystem.realpathSync.native(targetPath);
  }
  return fileSystem.realpathSync(targetPath);
}

function fail(code, message) {
  return { ok: false, code, message };
}

module.exports = {
  validateVaultRelativePath,
  resolveVaultPath
};