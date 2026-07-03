'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Keep preload self-contained while BrowserWindow sandbox is enabled.
// Sandboxed preload scripts must not depend on arbitrary local modules.
const IPC_CHANNELS = Object.freeze({
  APP_INFO: 'app:info',
  CHAT_SEND: 'chat:send',
  CHAT_CANCEL: 'chat:cancel',
  PROVIDER_STATUS: 'provider:status',
  PROVIDER_MODELS: 'provider:models',
  PROVIDER_SET_ACTIVE: 'provider:set-active',
  PROVIDER_SET_MODEL: 'provider:set-model',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET_PROVIDER_URL: 'settings:set-provider-url',
  SETTINGS_RESET_PROVIDER_URL: 'settings:reset-provider-url',
  SETTINGS_SET_LIMITS: 'settings:set-limits',
  SETTINGS_SET_VAULT_ROLE: 'settings:set-vault-role',
  SETTINGS_RESET_VAULT_ROLE: 'settings:reset-vault-role',
  SETTINGS_SET_EMBEDDINGS: 'settings:set-embeddings',
  EMBEDDINGS_FIND_SIMILAR_NOTES: 'embeddings:find-similar-notes',
  VAULT_STATE: 'vault:state',
  VAULT_SELECT_FOLDER: 'vault:select-folder',
  VAULT_SET_ROOT: 'vault:set-root',
  VAULT_LIST_FOLDER: 'vault:list-folder',
  VAULT_READ_MARKDOWN: 'vault:read-markdown',
  VAULT_CREATE_NOTE: 'vault:create-note',
  VAULT_CREATE_FOLDER: 'vault:create-folder',
  VAULT_UPDATE_NOTE: 'vault:update-note',
  VAULT_RENAME_FILE: 'vault:rename-file'
});

const zeus = Object.freeze({
  appInfo() {
    return ipcRenderer.invoke(IPC_CHANNELS.APP_INFO);
  },
  chat: Object.freeze({
    send(payload) {
      return ipcRenderer.invoke(IPC_CHANNELS.CHAT_SEND, payload);
    },
    cancel(payload) {
      return ipcRenderer.invoke(IPC_CHANNELS.CHAT_CANCEL, payload);
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
  settings: Object.freeze({
    get() {
      return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET);
    },
    setProviderUrl(payload) {
      return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_PROVIDER_URL, payload);
    },
    resetProviderUrl(payload) {
      return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_RESET_PROVIDER_URL, payload);
    },
    setLimits(payload) {
      return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_LIMITS, payload);
    },
    setEmbeddings(payload) {
      return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_EMBEDDINGS, payload);
    },
    setVaultRole(payload) {
      return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_VAULT_ROLE, payload);
    },
    resetVaultRole(payload) {
      return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_RESET_VAULT_ROLE, payload);
    }
  }),
  embeddings: Object.freeze({
    findSimilarNotes(payload) {
      return ipcRenderer.invoke(IPC_CHANNELS.EMBEDDINGS_FIND_SIMILAR_NOTES, payload);
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
    createFolder(payload) {
      return ipcRenderer.invoke(IPC_CHANNELS.VAULT_CREATE_FOLDER, payload);
    },
    updateNote(payload) {
      return ipcRenderer.invoke(IPC_CHANNELS.VAULT_UPDATE_NOTE, payload);
    },
    renameFile(payload) {
      return ipcRenderer.invoke(IPC_CHANNELS.VAULT_RENAME_FILE, payload);
    }
  })
});

contextBridge.exposeInMainWorld('zeus', zeus);
