'use strict';

const { IPC_CHANNELS } = require('../../shared/ipc/channels');

function registerVaultIndexIpc(ipcMain, vaultIndexHealthService) {
  ipcMain.handle(IPC_CHANNELS.INDEXES_GET_HEALTH, () => call(vaultIndexHealthService, 'getHealth'));
  ipcMain.handle(IPC_CHANNELS.INDEXES_REFRESH, () => call(vaultIndexHealthService, 'refreshIndexes'));
  ipcMain.handle(IPC_CHANNELS.INDEXES_ENABLE_FULL_TEXT, () => call(vaultIndexHealthService, 'setFullTextEnabled', true));
  ipcMain.handle(IPC_CHANNELS.INDEXES_DISABLE_FULL_TEXT, () => call(vaultIndexHealthService, 'setFullTextEnabled', false));
  ipcMain.handle(IPC_CHANNELS.INDEXES_REFRESH_FULL_TEXT, () => call(vaultIndexHealthService, 'refreshFullText'));
  ipcMain.handle(IPC_CHANNELS.INDEXES_DELETE_FULL_TEXT, () => call(vaultIndexHealthService, 'deleteFullText'));
}

function call(service, method, payload) {
  if (!service || typeof service[method] !== 'function') {
    return { ok: false, code: 'indexes_unavailable', message: 'Vault index health service unavailable.' };
  }
  return arguments.length >= 3 ? service[method](payload) : service[method]();
}

module.exports = { registerVaultIndexIpc };
