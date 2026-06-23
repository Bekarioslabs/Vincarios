'use strict';

const { IPC_CHANNELS } = require('../../shared/ipc/channels');

function registerProviderIpc(ipcMain, providerStatusService) {
  if (!providerStatusService || typeof providerStatusService.getStatus !== 'function') {
    throw new Error('Provider status service is required.');
  }

  ipcMain.handle(IPC_CHANNELS.PROVIDER_STATUS, () => providerStatusService.getStatus());
}

module.exports = {
  registerProviderIpc
};