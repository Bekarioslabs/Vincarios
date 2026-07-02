'use strict';

const path = require('node:path');
const { createMainWindow } = require('./createMainWindow');
const { registerAppIpc } = require('../ipc/registerAppIpc');
const { registerChatIpc } = require('../ipc/registerChatIpc');
const { registerVaultIpc } = require('../ipc/registerVaultIpc');
const { registerProviderIpc } = require('../ipc/registerProviderIpc');
const { registerSettingsIpc } = require('../ipc/registerSettingsIpc');
const { createProviderChatService } = require('../providers/providerChatService');
const { createProviderStatusService } = require('../providers/providerStatusService');
const { createProviderModelService } = require('../providers/providerModelService');
const { createProviderSettingsState } = require('../providers/providerRegistry');
const { createSettingsStore, toProviderRegistryOptions } = require('../settings/settingsStore');
const { createSettingsService } = require('../settings/settingsService');
const { createVaultReadService } = require('../vault/vaultReadService');
const { createVaultWriteService } = require('../vault/vaultWriteService');
const { getPortableSettingsPath, migrateLegacySettingsToPortable } = require('./portableDataPath');

function bootstrapElectron(electron, options) {
  options = options || {};
  const { app, ipcMain, dialog, BrowserWindow } = electron;
  const projectRoot = options.projectRoot || path.resolve(__dirname, '..', '..', '..');
  const vaultReadService = options.vaultReadService || createVaultReadService();
  const settingsFilePath = options.settingsFilePath || getDefaultSettingsPath(app, projectRoot);
  if (!options.settingsFilePath) {
    migrateLegacySettingsToPortable({ app, projectRoot, portablePath: settingsFilePath });
  }
  const settingsStore = options.settingsStore || createSettingsStore({
    filePath: settingsFilePath,
    initialSettings: options.initialSettings
  });
  const vaultWriteService = options.vaultWriteService || createVaultWriteService({ settingsStore });
  const providerSettingsOptions = Object.assign(
    {},
    options.providerOptions || {},
    toProviderRegistryOptions(settingsStore.getSettings())
  );
  const providerSettingsState = options.providerSettingsState || createProviderSettingsState(providerSettingsOptions);
  const providerOptions = Object.assign({}, options.providerOptions || {}, {
    settingsState: providerSettingsState,
    settingsStore,
    timeoutMs: settingsStore.getSettings().limits.providerTimeoutMs,
    modelListTimeoutMs: settingsStore.getSettings().limits.modelListTimeoutMs
  });
  const settingsService = options.settingsService || createSettingsService({ settingsStore, providerSettingsState });
  const providerStatusService = options.providerStatusService || createProviderStatusService(providerOptions);
  const providerModelService = options.providerModelService || createProviderModelService(Object.assign({}, providerOptions, {
    timeoutMs: providerOptions.modelListTimeoutMs
  }));
  const chatService = options.chatService || createProviderChatService(providerOptions);

  registerChatIpc(ipcMain, chatService);
  registerAppIpc(ipcMain, {
    appName: 'ZEUS Agent',
    version: app.getVersion ? app.getVersion() : '0.1.0'
  });
  registerVaultIpc(ipcMain, dialog, BrowserWindow, vaultReadService, vaultWriteService);
  registerProviderIpc(ipcMain, providerStatusService, providerModelService);
  registerSettingsIpc(ipcMain, settingsService);

  app.whenReady().then(() => {
    createMainWindow(electron, { projectRoot });

    app.on('activate', () => {
      if (electron.BrowserWindow.getAllWindows().length === 0) {
        createMainWindow(electron, { projectRoot });
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

function getDefaultSettingsPath(app, projectRoot) {
  return getPortableSettingsPath(projectRoot);
}

module.exports = {
  bootstrapElectron,
  getDefaultSettingsPath
};
