'use strict';

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

module.exports = {
  IPC_CHANNELS
};
