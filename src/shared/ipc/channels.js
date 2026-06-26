'use strict';

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

module.exports = {
  IPC_CHANNELS
};