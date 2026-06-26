'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Keep preload self-contained while BrowserWindow sandbox is enabled.
// Sandboxed preload scripts must not depend on arbitrary local modules.
const IPC_CHANNELS = Object.freeze({
  APP_INFO: 'app:info',
  CHAT_SEND: 'chat:send',
  PROVIDER_STATUS: 'provider:status',
  PROVIDER_MODELS: 'provider:models',
  PROVIDER_SET_ACTIVE: 'provider:set-active',
  PROVIDER_SET_MODEL: 'provider:set-model',
  VAULT_STATE: 'vault:state',
  VAULT_SELECT_FOLDER: 'vault:select-folder',
  VAULT_SET_ROOT: 'vault:set-root',
  VAULT_LIST_FOLDER: 'vault:list-folder',
  VAULT_READ_MARKDOWN: 'vault:read-markdown',
  VAULT_CREATE_NOTE: 'vault:create-note',
  VAULT_UPDATE_NOTE: 'vault:update-note'
});

const zeus = Object.freeze({
  appInfo() {
    return ipcRenderer.invoke(IPC_CHANNELS.APP_INFO);
  },
  chat: Object.freeze({
    send(payload) {
      return ipcRenderer.invoke(IPC_CHANNELS.CHAT_SEND, payload);
    }
  }),
  provider: Object.freeze({
    status() {
      return ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_STATUS);
    },
    models(payload) {
      return ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_MODELS, payload);
    },
    setActive(payload) {
      return ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_SET_ACTIVE, payload);
    },
    setModel(payload) {
      return ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_SET_MODEL, payload);
    }
  }),
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
    },
    createNote(payload) {
      return ipcRenderer.invoke(IPC_CHANNELS.VAULT_CREATE_NOTE, payload);
    },
    updateNote(payload) {
      return ipcRenderer.invoke(IPC_CHANNELS.VAULT_UPDATE_NOTE, payload);
    }
  })
});

contextBridge.exposeInMainWorld('zeus', zeus);
