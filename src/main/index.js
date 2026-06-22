'use strict';

const { createVaultContext } = require('./vault/vaultContext');
const { bootstrapElectron } = require('./app/bootstrapElectron');

function main() {
  return {
    app: 'ZEUS Agent',
    status: 'scaffold',
    createVaultContext
  };
}

module.exports = {
  main,
  createVaultContext,
  bootstrapElectron
};

if (require.main === module) {
  const electron = require('electron');
  bootstrapElectron(electron);
}