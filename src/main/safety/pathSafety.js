'use strict';

const {
  normalizeVaultRelativePath,
  resolveInsideVault
} = require('../../shared/pathRules');

function validateVaultRelativePath(relativePath, options) {
  return normalizeVaultRelativePath(relativePath, options);
}

function resolveVaultPath(vaultRoot, relativePath, options) {
  return resolveInsideVault(vaultRoot, relativePath, options);
}

module.exports = {
  validateVaultRelativePath,
  resolveVaultPath
};