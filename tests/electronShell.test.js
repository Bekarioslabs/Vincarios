'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { createWindowOptions } = require('../src/main/app/createMainWindow');
const { IPC_CHANNELS } = require('../src/shared/ipc/channels');
const { DEFAULT_THEME_COLORS } = require('../src/shared/ui/themeDefaults');

test('main window options keep the renderer sandboxed', () => {
  const options = createWindowOptions(path.join('D:', 'ZEUS_AGENT'));

  assert.equal(options.show, true);
  assert.equal(options.backgroundColor, DEFAULT_THEME_COLORS.backgroundPrimary);
  assert.equal(options.webPreferences.contextIsolation, true);
  assert.equal(options.webPreferences.nodeIntegration, false);
  assert.equal(options.webPreferences.sandbox, true);
  assert.equal(options.webPreferences.webSecurity, true);
  assert.equal(options.webPreferences.allowRunningInsecureContent, false);
  assert.match(options.webPreferences.preload, /src[\\/]preload[\\/]index\.js$/);
});

test('IPC channels expose app info, provider, chat, and reviewed vault actions', () => {
  assert.deepEqual(Object.keys(IPC_CHANNELS).sort(), [
    'APP_INFO',
    'CHAT_CANCEL',
    'CHAT_SEND',
    'PROVIDER_MODELS',
    'PROVIDER_SET_ACTIVE',
    'PROVIDER_SET_MODEL',
    'PROVIDER_STATUS',
    'SETTINGS_GET',
    'SETTINGS_RESET_PROVIDER_URL',
    'SETTINGS_RESET_VAULT_ROLE',
    'SETTINGS_SET_LIMITS',
    'SETTINGS_SET_PROVIDER_URL',
    'SETTINGS_SET_VAULT_ROLE',
    'VAULT_CREATE_NOTE',
    'VAULT_LIST_FOLDER',
    'VAULT_READ_MARKDOWN',
    'VAULT_SELECT_FOLDER',
    'VAULT_SET_ROOT',
    'VAULT_STATE',
    'VAULT_UPDATE_NOTE'
  ]);
  assert.equal(IPC_CHANNELS.APP_INFO, 'app:info');
  assert.equal(IPC_CHANNELS.CHAT_SEND, 'chat:send');
  assert.equal(IPC_CHANNELS.CHAT_CANCEL, 'chat:cancel');
  assert.equal(IPC_CHANNELS.PROVIDER_STATUS, 'provider:status');
  assert.equal(IPC_CHANNELS.PROVIDER_MODELS, 'provider:models');
  assert.equal(IPC_CHANNELS.PROVIDER_SET_ACTIVE, 'provider:set-active');
  assert.equal(IPC_CHANNELS.PROVIDER_SET_MODEL, 'provider:set-model');
  assert.equal(IPC_CHANNELS.SETTINGS_GET, 'settings:get');
  assert.equal(IPC_CHANNELS.SETTINGS_SET_PROVIDER_URL, 'settings:set-provider-url');
  assert.equal(IPC_CHANNELS.SETTINGS_RESET_PROVIDER_URL, 'settings:reset-provider-url');
  assert.equal(IPC_CHANNELS.SETTINGS_SET_LIMITS, 'settings:set-limits');
  assert.equal(IPC_CHANNELS.SETTINGS_SET_VAULT_ROLE, 'settings:set-vault-role');
  assert.equal(IPC_CHANNELS.SETTINGS_RESET_VAULT_ROLE, 'settings:reset-vault-role');
  assert.equal(IPC_CHANNELS.VAULT_READ_MARKDOWN, 'vault:read-markdown');
  assert.equal(IPC_CHANNELS.VAULT_CREATE_NOTE, 'vault:create-note');
  assert.equal(IPC_CHANNELS.VAULT_UPDATE_NOTE, 'vault:update-note');
});

test('preload exposes reviewed create note writes through the vault API', () => {
  const preloadSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload', 'index.js'), 'utf8');

  assert.match(preloadSource, /createNote\(payload\)/);
  assert.match(preloadSource, /ipcRenderer\.invoke\(IPC_CHANNELS\.VAULT_CREATE_NOTE, payload\)/);
});
test('preload exposes reviewed update note writes through the vault API', () => {
  const preloadSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload', 'index.js'), 'utf8');

  assert.match(preloadSource, /updateNote\(payload\)/);
  assert.match(preloadSource, /ipcRenderer\.invoke\(IPC_CHANNELS\.VAULT_UPDATE_NOTE, payload\)/);
});

test('preload exposes provider model controls without filesystem access', () => {
  const preloadSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload', 'index.js'), 'utf8');

  assert.match(preloadSource, /models\(payload\)/);
  assert.match(preloadSource, /setActive\(payload\)/);
  assert.match(preloadSource, /setModel\(payload\)/);
  assert.match(preloadSource, /ipcRenderer\.invoke\(IPC_CHANNELS\.PROVIDER_MODELS, payload\)/);
  assert.match(preloadSource, /ipcRenderer\.invoke\(IPC_CHANNELS\.PROVIDER_SET_ACTIVE, payload\)/);
  assert.match(preloadSource, /ipcRenderer\.invoke\(IPC_CHANNELS\.PROVIDER_SET_MODEL, payload\)/);
});

test('preload exposes chat cancel and settings without filesystem access', () => {
  const preloadSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload', 'index.js'), 'utf8');

  assert.match(preloadSource, /cancel\(payload\)/);
  assert.match(preloadSource, /ipcRenderer\.invoke\(IPC_CHANNELS\.CHAT_CANCEL, payload\)/);
  assert.match(preloadSource, /settings: Object\.freeze/);
  assert.match(preloadSource, /setProviderUrl\(payload\)/);
  assert.match(preloadSource, /resetProviderUrl\(payload\)/);
  assert.match(preloadSource, /ipcRenderer\.invoke\(IPC_CHANNELS\.SETTINGS_GET\)/);
  assert.match(preloadSource, /ipcRenderer\.invoke\(IPC_CHANNELS\.SETTINGS_SET_PROVIDER_URL, payload\)/);
  assert.match(preloadSource, /ipcRenderer\.invoke\(IPC_CHANNELS\.SETTINGS_RESET_PROVIDER_URL, payload\)/);
});
