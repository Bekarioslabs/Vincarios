'use strict';

const IPC_CHANNELS = Object.freeze({
  APP_INFO: 'app:info',
  VAULT_STATE: 'vault:state',
  VAULT_SELECT_FOLDER: 'vault:select-folder',
  VAULT_SET_ROOT: 'vault:set-root',
  VAULT_LIST_FOLDER: 'vault:list-folder',
  VAULT_READ_MARKDOWN: 'vault:read-markdown'
});

module.exports = {
  IPC_CHANNELS
};