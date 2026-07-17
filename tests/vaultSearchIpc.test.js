'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { registerVaultSearchIpc } = require('../src/main/ipc/registerVaultSearchIpc');
const { IPC_CHANNELS } = require('../src/shared/ipc/channels');

test('vault search IPC exposes a read-only query channel', async () => {
  const handlers = new Map();
  const ipcMain = { handle(channel, handler) { handlers.set(channel, handler); } };
  const service = { search(payload) { return { ok: true, query: payload.query, results: [] }; } };

  registerVaultSearchIpc(ipcMain, service);
  assert.deepEqual(await handlers.get(IPC_CHANNELS.SEARCH_QUERY)(null, { query: 'atlas' }), {
    ok: true,
    query: 'atlas',
    results: []
  });
});

test('vault search IPC fails closed when the service is unavailable', async () => {
  const handlers = new Map();
  const ipcMain = { handle(channel, handler) { handlers.set(channel, handler); } };

  registerVaultSearchIpc(ipcMain, null);
  const result = await handlers.get(IPC_CHANNELS.SEARCH_QUERY)(null, { query: 'atlas' });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'search_unavailable');
});