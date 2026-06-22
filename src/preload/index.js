'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Keep preload self-contained while BrowserWindow sandbox is enabled.
// Sandboxed preload scripts must not depend on arbitrary local modules.
const IPC_CHANNELS = Object.freeze({
  APP_INFO: 'app:info',
  VAULT_STATE: 'vault:state',
  VAULT_SELECT_FOLDER: 'vault:select-folder',
  VAULT_SET_ROOT: 'vault:set-root',
  VAULT_LIST_FOLDER: 'vault:list-folder',
  VAULT_READ_MARKDOWN: 'vault:read-markdown'
});

const zeus = Object.freeze({
  appInfo() {
    return ipcRenderer.invoke(IPC_CHANNELS.APP_INFO);
  },
  vault: Object.freeze({
    state() {
      return ipcRenderer.invoke(IPC_CHANNELS.VAULT_STATE);
    },
    selectFolder() {
      return ipcRenderer.invoke(IPC_CHANNELS.VAULT_SELECT_FOLDER);
    },
    setRoot(rootPath) {
      return ipcRenderer.invoke(IPC_CHANNELS.VAULT_SET_ROOT, rootPath);
    },
    listFolder(relativePath) {
      return ipcRenderer.invoke(IPC_CHANNELS.VAULT_LIST_FOLDER, relativePath || '');
    },
    readMarkdown(relativePath) {
      return ipcRenderer.invoke(IPC_CHANNELS.VAULT_READ_MARKDOWN, relativePath);
    }
  })
});

contextBridge.exposeInMainWorld('zeus', zeus);