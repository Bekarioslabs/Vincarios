'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
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

test('IPC channels expose only app info and read-only vault basics', () => {
  assert.deepEqual(Object.keys(IPC_CHANNELS).sort(), [
    'APP_INFO',
    'PROVIDER_STATUS',
    'VAULT_LIST_FOLDER',
    'VAULT_READ_MARKDOWN',
    'VAULT_SELECT_FOLDER',
    'VAULT_SET_ROOT',
    'VAULT_STATE'
  ]);
  assert.equal(IPC_CHANNELS.APP_INFO, 'app:info');
  assert.equal(IPC_CHANNELS.PROVIDER_STATUS, 'provider:status');
  assert.equal(IPC_CHANNELS.VAULT_READ_MARKDOWN, 'vault:read-markdown');
});
