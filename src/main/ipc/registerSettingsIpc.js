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

  if (typeof settingsService.setLayoutPreferences === 'function') {
    ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_LAYOUT, (event, payload) => settingsService.setLayoutPreferences(payload || {}));
  }

  if (typeof settingsService.setTheme === 'function') {
    ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_THEME, (event, payload) => settingsService.setTheme(payload || {}));
  }

  if (typeof settingsService.setLimits === 'function') {
    ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_LIMITS, (event, payload) => settingsService.setLimits(payload || {}));
  }

  if (typeof settingsService.setEmbeddingSettings === 'function') {
    ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_EMBEDDINGS, (event, payload) => settingsService.setEmbeddingSettings(payload || {}));
  }

  if (typeof settingsService.setActionDefaults === 'function') {
    ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_ACTION_DEFAULTS, (event, payload) => settingsService.setActionDefaults(payload || {}));
  }

  if (typeof settingsService.setRecentVaults === 'function') {
    ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_RECENT_VAULTS, (event, payload) => settingsService.setRecentVaults(payload || {}));
  }
}

module.exports = {
  registerSettingsIpc
};
