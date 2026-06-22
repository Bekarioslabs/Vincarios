'use strict';

const { IPC_CHANNELS } = require('../../shared/ipc/channels');

function registerAppIpc(ipcMain, options) {
  options = options || {};
  const appName = options.appName || 'ZEUS Agent';
  const version = options.version || '0.1.0';

  ipcMain.handle(IPC_CHANNELS.APP_INFO, () => ({
    name: appName,
    version,
    localFirst: true,
    markdownFirst: true
  }));
}

module.exports = {
  registerAppIpc
};