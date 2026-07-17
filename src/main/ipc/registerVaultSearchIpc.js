'use strict';

const { IPC_CHANNELS } = require('../../shared/ipc/channels');

function registerVaultSearchIpc(ipcMain, vaultSearchService) {
  ipcMain.handle(IPC_CHANNELS.SEARCH_QUERY, (_event, payload) => {
    if (!vaultSearchService || typeof vaultSearchService.search !== 'function') {
      return { ok: false, code: 'search_unavailable', message: 'Vault search is unavailable.' };
    }
    return vaultSearchService.search(payload || {});
  });
}

module.exports = { registerVaultSearchIpc };