'use strict';

const path = require('node:path');
const { createMainWindow } = require('./createMainWindow');
const { registerAppIpc } = require('../ipc/registerAppIpc');

function bootstrapElectron(electron, options) {
  options = options || {};
  const { app, ipcMain } = electron;
  const projectRoot = options.projectRoot || path.resolve(__dirname, '..', '..', '..');

  registerAppIpc(ipcMain, {
    appName: 'ZEUS Agent',
    version: app.getVersion ? app.getVersion() : '0.1.0'
  });

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