'use strict';

const { IPC_CHANNELS } = require('../../shared/ipc/channels');

function registerSettingsIpc(ipcMain, settingsService) {
  if (!settingsService || typeof settingsService.getSettings !== 'function') {
    throw new Error('Settings service is required.');
  }

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => settingsService.getSettings());

  if (typeof settingsService.setProviderUrlOverride === 'function') {
    ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_PROVIDER_URL, (event, payload) => settingsService.setProviderUrlOverride(
      payload && payload.providerId,
      payload && payload.baseUrl
    ));
  }

  if (typeof settingsService.resetProviderUrlOverride === 'function') {
    ipcMain.handle(IPC_CHANNELS.SETTINGS_RESET_PROVIDER_URL, (event, payload) => settingsService.resetProviderUrlOverride(payload && payload.providerId));
  }

  if (typeof settingsService.setLimits === 'function') {
    ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_LIMITS, (event, payload) => settingsService.setLimits(payload || {}));
  }

  if (typeof settingsService.setEmbeddingSettings === 'function') {
    ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_EMBEDDINGS, (event, payload) => settingsService.setEmbeddingSettings(payload || {}));
  }

  if (typeof settingsService.setVaultProfileRole === 'function') {
    ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_VAULT_ROLE, (event, payload) => settingsService.setVaultProfileRole(
      payload && payload.role,
      payload && payload.folderPath
    ));
  }

  if (typeof settingsService.resetVaultProfileRole === 'function') {
    ipcMain.handle(IPC_CHANNELS.SETTINGS_RESET_VAULT_ROLE, (event, payload) => settingsService.resetVaultProfileRole(payload && payload.role));
  }
}

module.exports = {
  registerSettingsIpc
};
