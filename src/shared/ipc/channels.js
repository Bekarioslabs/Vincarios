'use strict';

const IPC_CHANNELS = Object.freeze({
  APP_INFO: 'app:info',
  CHAT_SEND: 'chat:send',
  PROVIDER_STATUS: 'provider:status',
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