'use strict';

const { contextBridge, ipcRenderer } = require('electron');
const { IPC_CHANNELS } = require('../shared/ipc/channels');

const zeus = Object.freeze({
  appInfo() {
    return ipcRenderer.invoke(IPC_CHANNELS.APP_INFO);
  }
});

contextBridge.exposeInMainWorld('zeus', zeus);