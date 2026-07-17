'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { registerVaultIndexIpc } = require('../src/main/ipc/registerVaultIndexIpc');
const { IPC_CHANNELS } = require('../src/shared/ipc/channels');

test('vault index IPC exposes aggregate health and one explicit refresh action', async () => {
  const handlers = new Map();
  const ipcMain = { handle(channel, handler) { handlers.set(channel, handler); } };
  const indexHealthService = {
    getHealth() { return { ok: true, state: 'stale', metadata: { state: 'ready' } }; },
    refreshIndexes() { return { ok: true, metadata: { ok: true }, embeddings: { ok: true } }; }
  };

  registerVaultIndexIpc(ipcMain, indexHealthService);

  assert.deepEqual(await handlers.get(IPC_CHANNELS.INDEXES_GET_HEALTH)(), {
    ok: true,
    state: 'stale',
    metadata: { state: 'ready' }
  });
  assert.deepEqual(await handlers.get(IPC_CHANNELS.INDEXES_REFRESH)(), {
    ok: true,
    metadata: { ok: true },
    embeddings: { ok: true }
  });
});

test('vault index IPC fails safely without the aggregate service', async () => {
  const handlers = new Map();
  const ipcMain = { handle(channel, handler) { handlers.set(channel, handler); } };

  registerVaultIndexIpc(ipcMain, null);

  assert.equal((await handlers.get(IPC_CHANNELS.INDEXES_GET_HEALTH)()).code, 'indexes_unavailable');
  assert.equal((await handlers.get(IPC_CHANNELS.INDEXES_REFRESH)()).code, 'indexes_unavailable');
});
test('vault index IPC exposes explicit full-text delete action', async () => {
  const handlers = new Map();
  const ipcMain = { handle(channel, handler) { handlers.set(channel, handler); } };
  const indexHealthService = {
    getHealth() { return { ok: true }; },
    refreshIndexes() { return { ok: true }; },
    deleteFullText() { return { ok: true, deleted: true }; }
  };

  registerVaultIndexIpc(ipcMain, indexHealthService);

  assert.deepEqual(await handlers.get(IPC_CHANNELS.INDEXES_DELETE_FULL_TEXT)(), { ok: true, deleted: true });
});

test('vault index IPC exposes full-text opt-in and its own rebuild action', async () => {
  const handlers = new Map();
  const ipcMain = { handle(channel, handler) { handlers.set(channel, handler); } };
  const indexHealthService = {
    setFullTextEnabled(enabled) { return { ok: true, enabled }; },
    refreshFullText() { return { ok: true, documentCount: 3 }; }
  };

  registerVaultIndexIpc(ipcMain, indexHealthService);

  assert.deepEqual(await handlers.get(IPC_CHANNELS.INDEXES_ENABLE_FULL_TEXT)(), { ok: true, enabled: true });
  assert.deepEqual(await handlers.get(IPC_CHANNELS.INDEXES_DISABLE_FULL_TEXT)(), { ok: true, enabled: false });
  assert.deepEqual(await handlers.get(IPC_CHANNELS.INDEXES_REFRESH_FULL_TEXT)(), { ok: true, documentCount: 3 });
});