'use strict';

const path = require('node:path');
const { resolveVaultPath } = require('../safety/pathSafety');

function createVaultContext(vaultRoot) {
  if (typeof vaultRoot !== 'string' || !vaultRoot.trim()) {
    throw new TypeError('Vault root is required.');
  }

  return {
    root: path.resolve(vaultRoot),
    resolve(relativePath, options) {
      return resolveVaultPath(this.root, relativePath, options);
    }
  };
}

module.exports = {
  createVaultContext
};