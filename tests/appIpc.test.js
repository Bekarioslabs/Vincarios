'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeExternalUrl, openExternalUrl, registerAppIpc } = require('../src/main/ipc/registerAppIpc');
const { IPC_CHANNELS } = require('../src/shared/ipc/channels');

test('app IPC validates external URLs before opening them', async () => {
  const opened = [];
  const shell = { openExternal: async (url) => opened.push(url) };

  assert.equal(normalizeExternalUrl('https://example.com/path'), 'https://example.com/path');
  assert.equal(normalizeExternalUrl('javascript:alert(1)'), '');
  assert.equal(normalizeExternalUrl('file:///C:/secret.txt'), '');

  assert.deepEqual(await openExternalUrl(shell, 'https://example.com'), { ok: true, url: 'https://example.com/' });
  assert.deepEqual(opened, ['https://example.com/']);
  assert.equal((await openExternalUrl(shell, 'file:///C:/secret.txt')).ok, false);
});

test('app IPC registers app info and external open handlers', () => {
  const handlers = new Map();
  const ipcMain = { handle(channel, handler) { handlers.set(channel, handler); } };
  registerAppIpc(ipcMain, { appName: 'vincarios', version: '0.1.0', shell: { openExternal() {} } });

  assert.equal(handlers.has(IPC_CHANNELS.APP_INFO), true);
  assert.equal(handlers.has(IPC_CHANNELS.APP_OPEN_EXTERNAL), true);
});