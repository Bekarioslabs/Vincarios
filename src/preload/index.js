'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Keep preload self-contained while BrowserWindow sandbox is enabled.
// Sandboxed preload scripts must not depend on arbitrary local modules.
const IPC_CHANNELS = Object.freeze({
  APP_INFO: 'app:info',
  APP_OPEN_EXTERNAL: 'app:open-external',
  CHAT_SEND: 'chat:send',
  CHAT_CANCEL: 'chat:cancel',
  PROVIDER_STATUS: 'provider:status',
  PROVIDER_MODELS: 'provider:models',
  PROVIDER_SET_ACTIVE: 'provider:set-active',
  PROVIDER_SET_MODEL: 'provider:set-model',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET_PROVIDER_URL: 'settings:set-provider-url',
  SETTINGS_RESET_PROVIDER_URL: 'settings:reset-provider-url',
  SETTINGS_SET_LAYOUT: 'settings:set-layout',
  SETTINGS_SET_THEME: 'settings:set-theme',
  SETTINGS_SET_LIMITS: 'settings:set-limits',
  SETTINGS_SET_EMBEDDINGS: 'settings:set-embeddings',
  SETTINGS_SET_ACTION_DEFAULTS: 'settings:set-action-defaults',
  SETTINGS_SET_RECENT_VAULTS: 'settings:set-recent-vaults',
  EMBEDDINGS_FIND_SIMILAR_NOTES: 'embeddings:find-similar-notes',
  VAULT_STATE: 'vault:state',
  VAULT_SELECT_FOLDER: 'vault:select-folder',
  VAULT_SET_ROOT: 'vault:set-root',
  VAULT_LIST_FOLDER: 'vault:list-folder',
  VAULT_READ_MARKDOWN: 'vault:read-markdown',
  VAULT_READ_IMAGE_ASSET: 'vault:read-image-asset',
  VAULT_CREATE_NOTE: 'vault:create-note',
  VAULT_CREATE_FOLDER: 'vault:create-folder',
  VAULT_UPDATE_NOTE: 'vault:update-note',
  VAULT_RENAME_FILE: 'vault:rename-file',
  VAULT_GET_PROFILE: 'vault:get-profile',
  VAULT_SET_PROFILE_ROLE: 'vault:set-profile-role',
  VAULT_RESET_PROFILE_ROLE: 'vault:reset-profile-role',
  VAULT_SET_PROFILE_APPEARANCE: 'vault:set-profile-appearance',
  VAULT_LIST_PROFILE_ICONS: 'vault:list-profile-icons'
});

const vitruvios = Object.freeze({
  appInfo() {
    return ipcRenderer.invoke(IPC_CHANNELS.APP_INFO);
  },
  openExternal(url) {
    return ipcRenderer.invoke(IPC_CHANNELS.APP_OPEN_EXTERNAL, url);
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
    setLayout(payload) {
      return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_LAYOUT, payload);
    },
    setTheme(payload) {
      return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_THEME, payload);
    },
    setLimits(payload) {
      return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_LIMITS, payload);
    },
    setEmbeddings(payload) {
      return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_EMBEDDINGS, payload);
    },
    setActionDefaults(payload) {
      return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_ACTION_DEFAULTS, payload);
    },
    setRecentVaults(payload) {
      return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_RECENT_VAULTS, payload);
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
    readImageAsset(payload) {
      return ipcRenderer.invoke(IPC_CHANNELS.VAULT_READ_IMAGE_ASSET, payload);
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
    },
    getProfile() {
      return ipcRenderer.invoke(IPC_CHANNELS.VAULT_GET_PROFILE);
    },
    setProfileRole(payload) {
      return ipcRenderer.invoke(IPC_CHANNELS.VAULT_SET_PROFILE_ROLE, payload);
    },
    resetProfileRole(payload) {
      return ipcRenderer.invoke(IPC_CHANNELS.VAULT_RESET_PROFILE_ROLE, payload);
    },
    setProfileAppearance(payload) {
      return ipcRenderer.invoke(IPC_CHANNELS.VAULT_SET_PROFILE_APPEARANCE, payload);
    },
    listProfileIcons() {
      return ipcRenderer.invoke(IPC_CHANNELS.VAULT_LIST_PROFILE_ICONS);
    }
  })
});

contextBridge.exposeInMainWorld('vitruvios', vitruvios);
