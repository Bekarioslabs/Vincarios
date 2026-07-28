'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Keep preload self-contained while BrowserWindow sandbox is enabled.
// Sandboxed preload scripts must not depend on arbitrary local modules.
const IPC_CHANNELS = Object.freeze({
  APP_INFO: 'app:info',
  APP_OPEN_EXTERNAL: 'app:open-external',
  APP_MENU_NAVIGATE: 'app:menu-navigate',
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
  EMBEDDINGS_GET_INDEX_STATUS: 'embeddings:get-index-status',
  EMBEDDINGS_REFRESH_INDEX: 'embeddings:refresh-index',
  EMBEDDINGS_INDEX_HEALTH_CHANGED: 'embeddings:index-health-changed',
  INDEXES_GET_HEALTH: 'indexes:get-health',
  INDEXES_REFRESH: 'indexes:refresh',
  INDEXES_ENABLE_FULL_TEXT: 'indexes:enable-full-text',
  INDEXES_DISABLE_FULL_TEXT: 'indexes:disable-full-text',
  INDEXES_REFRESH_FULL_TEXT: 'indexes:refresh-full-text',
  INDEXES_DELETE_FULL_TEXT: 'indexes:delete-full-text',
  INDEXES_HEALTH_CHANGED: 'indexes:health-changed',
  SEARCH_QUERY: 'search:query',
  TEMPLATE_CREATE_FROM_REVIEW: 'template:create-from-review',
  VAULT_STATE: 'vault:state',
  VAULT_CONTENT_CHANGED: 'vault:content-changed',
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
  VAULT_LIST_PROFILE_ICONS: 'vault:list-profile-icons',
  VAULT_GET_INVENTORY: 'vault:get-inventory',
  VAULT_LIST_RECENT_FILES: 'vault:list-recent-files',
  VAULT_RECORD_RECENT_FILE: 'vault:record-recent-file',
  VAULT_LOAD_REVIEW_BASKET: 'vault:load-review-basket',
  VAULT_SAVE_REVIEW_BASKET: 'vault:save-review-basket'
});

const vincarios = Object.freeze({
  appInfo() {
    return ipcRenderer.invoke(IPC_CHANNELS.APP_INFO);
  },
  openExternal(url) {
    return ipcRenderer.invoke(IPC_CHANNELS.APP_OPEN_EXTERNAL, url);
  },
  appMenu: Object.freeze({
    onNavigate(listener) {
      if (typeof listener !== 'function') return () => {};
      const handler = (_event, destination) => listener(destination);
      ipcRenderer.on(IPC_CHANNELS.APP_MENU_NAVIGATE, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.APP_MENU_NAVIGATE, handler);
    }
  }),
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
    },
    getIndexStatus() {
      return ipcRenderer.invoke(IPC_CHANNELS.EMBEDDINGS_GET_INDEX_STATUS);
    },
    refreshIndex() {
      return ipcRenderer.invoke(IPC_CHANNELS.EMBEDDINGS_REFRESH_INDEX);
    },
    onIndexHealthChanged(listener) {
      if (typeof listener !== 'function') return () => {};
      const handler = (_event, health) => listener(health);
      ipcRenderer.on(IPC_CHANNELS.EMBEDDINGS_INDEX_HEALTH_CHANGED, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.EMBEDDINGS_INDEX_HEALTH_CHANGED, handler);
    }
  }),
  indexes: Object.freeze({
    getHealth() {
      return ipcRenderer.invoke(IPC_CHANNELS.INDEXES_GET_HEALTH);
    },
    refresh() {
      return ipcRenderer.invoke(IPC_CHANNELS.INDEXES_REFRESH);
    },
    setFullTextEnabled(enabled) {
      const channel = enabled === true ? IPC_CHANNELS.INDEXES_ENABLE_FULL_TEXT : IPC_CHANNELS.INDEXES_DISABLE_FULL_TEXT;
      return ipcRenderer.invoke(channel);
    },
    refreshFullText() {
      return ipcRenderer.invoke(IPC_CHANNELS.INDEXES_REFRESH_FULL_TEXT);
    },
    deleteFullText() {
      return ipcRenderer.invoke(IPC_CHANNELS.INDEXES_DELETE_FULL_TEXT);
    },
    onHealthChanged(listener) {
      if (typeof listener !== 'function') return () => {};
      const handler = (_event, health) => listener(health);
      ipcRenderer.on(IPC_CHANNELS.INDEXES_HEALTH_CHANGED, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.INDEXES_HEALTH_CHANGED, handler);
    }
  }),
  search: Object.freeze({
    query(payload) {
      return ipcRenderer.invoke(IPC_CHANNELS.SEARCH_QUERY, payload);
    }
  }),
  templates: Object.freeze({
    createFromReview(payload) {
      return ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_CREATE_FROM_REVIEW, payload);
    }
  }),
  vault: Object.freeze({
    state() {
      return ipcRenderer.invoke(IPC_CHANNELS.VAULT_STATE);
    },
    onChanged(listener) {
      if (typeof listener !== 'function') return () => {};
      const handler = (_event, change) => listener(change);
      ipcRenderer.on(IPC_CHANNELS.VAULT_CONTENT_CHANGED, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.VAULT_CONTENT_CHANGED, handler);
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
    },
    getInventory() {
      return ipcRenderer.invoke(IPC_CHANNELS.VAULT_GET_INVENTORY);
    },
    listRecentFiles() {
      return ipcRenderer.invoke(IPC_CHANNELS.VAULT_LIST_RECENT_FILES);
    },
    recordRecentFile(payload) {
      return ipcRenderer.invoke(IPC_CHANNELS.VAULT_RECORD_RECENT_FILE, payload);
    },
    loadReviewBasket() {
      return ipcRenderer.invoke(IPC_CHANNELS.VAULT_LOAD_REVIEW_BASKET);
    },
    saveReviewBasket(snapshot) {
      return ipcRenderer.invoke(IPC_CHANNELS.VAULT_SAVE_REVIEW_BASKET, snapshot);
    }
  })
});

contextBridge.exposeInMainWorld('vincarios', vincarios);
