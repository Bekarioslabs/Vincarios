'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { registerEmbeddingIpc } = require('../src/main/ipc/registerEmbeddingIpc');
const { IPC_CHANNELS } = require('../src/shared/ipc/channels');

test('embedding IPC exposes similar-note lookup through embedding-specific channel', async () => {
  const handlers = new Map();
  const ipcMain = { handle(channel, handler) { handlers.set(channel, handler); } };
  const service = {
    findSimilarNotes(targetPath, options) {
      return { ok: true, targetPath, options, candidates: [] };
    }
  };

  const healthService = { async refreshIndex() { return { ok: true }; }, getHealth() { return { ok: true, state: 'ready' }; } };
  registerEmbeddingIpc(ipcMain, service, healthService);
  const result = await handlers.get(IPC_CHANNELS.EMBEDDINGS_FIND_SIMILAR_NOTES)(null, {
    targetPath: 'Notes/A.md',
    limit: 3,
    minimumScorePercent: 70,
    mode: 'content',
    contentWeight: 90,
    metadataWeight: 10,
    scope: 'whole_vault',
    refreshIndex: false
  });

  assert.equal(result.ok, true);
  assert.equal(result.targetPath, 'Notes/A.md');
  assert.deepEqual(result.options, {
    limit: 3,
    minimumScorePercent: 70,
    mode: 'content',
    contentWeight: 90,
    metadataWeight: 10,
    scope: 'whole_vault',
    refreshIndex: false
  });
});

test('embedding IPC fails safely when service is unavailable', async () => {
  const handlers = new Map();
  const ipcMain = { handle(channel, handler) { handlers.set(channel, handler); } };

  registerEmbeddingIpc(ipcMain, null);
  const result = await handlers.get(IPC_CHANNELS.EMBEDDINGS_FIND_SIMILAR_NOTES)(null, { targetPath: 'A.md' });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'embeddings_unavailable');
});


test('embedding IPC exposes read-only index status and explicit index refresh', async () => {
  const handlers = new Map();
  const ipcMain = { handle(channel, handler) { handlers.set(channel, handler); } };
  const healthService = {
    getHealth() { return { ok: true, state: 'ready', documentCount: 4 }; },
    refreshIndex() { return { ok: true, documentCount: 5 }; }
  };

  registerEmbeddingIpc(ipcMain, null, healthService);

  assert.deepEqual(await handlers.get(IPC_CHANNELS.EMBEDDINGS_GET_INDEX_STATUS)(), {
    ok: true,
    state: 'ready',
    documentCount: 4
  });
  assert.deepEqual(await handlers.get(IPC_CHANNELS.EMBEDDINGS_REFRESH_INDEX)(), {
    ok: true,
    documentCount: 5
  });
});

test('embedding IPC keeps index status and refresh unavailable when their services are missing', async () => {
  const handlers = new Map();
  const ipcMain = { handle(channel, handler) { handlers.set(channel, handler); } };

  registerEmbeddingIpc(ipcMain, null, null);

  const status = await handlers.get(IPC_CHANNELS.EMBEDDINGS_GET_INDEX_STATUS)();
  const refresh = await handlers.get(IPC_CHANNELS.EMBEDDINGS_REFRESH_INDEX)();

  assert.equal(status.ok, false);
  assert.equal(status.code, 'embeddings_unavailable');
  assert.equal(refresh.ok, false);
  assert.equal(refresh.code, 'embeddings_unavailable');
});

test('embedding IPC refreshes through index health before a refresh-first similar-note search', async () => {
  const handlers = new Map();
  let refreshCalls = 0;
  let receivedOptions = null;
  const ipcMain = { handle(channel, handler) { handlers.set(channel, handler); } };
  const service = {
    findSimilarNotes(_targetPath, options) {
      receivedOptions = options;
      return { ok: true, candidates: [] };
    }
  };
  const healthService = {
    async refreshIndex() {
      refreshCalls += 1;
      return { ok: true };
    },
    getHealth() { return { ok: true, state: 'ready' }; }
  };

  registerEmbeddingIpc(ipcMain, service, healthService);
  const result = await handlers.get(IPC_CHANNELS.EMBEDDINGS_FIND_SIMILAR_NOTES)(null, {
    targetPath: 'Notes/Example.md',
    refreshIndex: true
  });

  assert.equal(result.ok, true);
  assert.equal(refreshCalls, 1);
  assert.equal(receivedOptions.refreshIndex, false);
});
