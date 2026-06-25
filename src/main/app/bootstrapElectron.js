'use strict';

const path = require('node:path');
const { createMainWindow } = require('./createMainWindow');
const { registerAppIpc } = require('../ipc/registerAppIpc');
const { registerChatIpc } = require('../ipc/registerChatIpc');
const { registerVaultIpc } = require('../ipc/registerVaultIpc');
const { registerProviderIpc } = require('../ipc/registerProviderIpc');
const { createProviderChatService } = require('../providers/providerChatService');
const { createProviderStatusService } = require('../providers/providerStatusService');
const { createVaultReadService } = require('../vault/vaultReadService');
const { createVaultWriteService } = require('../vault/vaultWriteService');

function bootstrapElectron(electron, options) {
  options = options || {};
  const { app, ipcMain, dialog, BrowserWindow } = electron;
  const projectRoot = options.projectRoot || path.resolve(__dirname, '..', '..', '..');
  const vaultReadService = options.vaultReadService || createVaultReadService();
  const vaultWriteService = options.vaultWriteService || createVaultWriteService();
  const providerStatusService = options.providerStatusService || createProviderStatusService(options.providerOptions);
  const chatService = options.chatService || createProviderChatService(options.providerOptions);

  registerChatIpc(ipcMain, chatService);
  registerAppIpc(ipcMain, {
    appName: 'ZEUS Agent',
    version: app.getVersion ? app.getVersion() : '0.1.0'
  });
  registerVaultIpc(ipcMain, dialog, BrowserWindow, vaultReadService, vaultWriteService);
  registerProviderIpc(ipcMain, providerStatusService);

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

module.exports = {
  bootstrapElectron
};