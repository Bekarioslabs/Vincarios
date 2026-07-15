'use strict';

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
  VAULT_LIST_PROFILE_ICONS: 'vault:list-profile-icons'
});

module.exports = {
  IPC_CHANNELS
};
