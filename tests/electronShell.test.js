'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createWindowOptions } = require('../src/main/app/createMainWindow');
const { IPC_CHANNELS } = require('../src/shared/ipc/channels');

test('main window options keep the renderer sandboxed', () => {
  const options = createWindowOptions(path.join('D:', 'ZEUS_AGENT'));

  assert.equal(options.webPreferences.contextIsolation, true);
  assert.equal(options.webPreferences.nodeIntegration, false);
  assert.equal(options.webPreferences.sandbox, true);
  assert.equal(options.webPreferences.webSecurity, true);
  assert.equal(options.webPreferences.allowRunningInsecureContent, false);
  assert.match(options.webPreferences.preload, /src[\\/]preload[\\/]index\.js$/);
});

test('IPC channels start with a minimal app namespace', () => {
  assert.deepEqual(Object.keys(IPC_CHANNELS), ['APP_INFO']);
  assert.equal(IPC_CHANNELS.APP_INFO, 'app:info');
});