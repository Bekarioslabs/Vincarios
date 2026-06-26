'use strict';

const { IPC_CHANNELS } = require('../../shared/ipc/channels');

function registerProviderIpc(ipcMain, providerStatusService, providerModelService) {
  if (!providerStatusService || typeof providerStatusService.getStatus !== 'function') {
    throw new Error('Provider status service is required.');
  }

  ipcMain.handle(IPC_CHANNELS.PROVIDER_STATUS, () => providerStatusService.getStatus());

  if (!providerModelService) return;
  if (typeof providerModelService.listModels === 'function') {
    ipcMain.handle(IPC_CHANNELS.PROVIDER_MODELS, (event, payload) => providerModelService.listModels(payload));
  }
  if (typeof providerModelService.setActiveProvider === 'function') {
    ipcMain.handle(IPC_CHANNELS.PROVIDER_SET_ACTIVE, (event, payload) => providerModelService.setActiveProvider(payload && payload.providerId));
  }
  if (typeof providerModelService.setSelectedModel === 'function') {
    ipcMain.handle(IPC_CHANNELS.PROVIDER_SET_MODEL, (event, payload) => providerModelService.setSelectedModel(payload && payload.providerId, payload && payload.model));
  }
}

module.exports = {
  registerProviderIpc
};