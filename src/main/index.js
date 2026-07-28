'use strict';

const { createVaultContext } = require('./vault/vaultContext');
const { bootstrapElectron } = require('./app/bootstrapElectron');

function main() {
  return {
    app: 'vincarios',
    status: 'scaffold',
    createVaultContext
  };
}

function shouldBootstrapElectron(processLike) {
  const proc = processLike || process;
  return !!(proc.versions && proc.versions.electron && proc.type !== 'renderer');
}

module.exports = {
  main,
  createVaultContext,
  bootstrapElectron,
  shouldBootstrapElectron
};

if (shouldBootstrapElectron()) {
  const electron = require('electron');
  bootstrapElectron(electron);
} else if (require.main === module) {
  console.log(main());
}