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

  registerEmbeddingIpc(ipcMain, service);
  const result = await handlers.get(IPC_CHANNELS.EMBEDDINGS_FIND_SIMILAR_NOTES)(null, {
    targetPath: 'Notes/A.md',
    limit: 3,
    minimumScorePercent: 70,
    mode: 'content',
    contentWeight: 90,
    metadataWeight: 10,
    refreshIndex: true
  });

  assert.equal(result.ok, true);
  assert.equal(result.targetPath, 'Notes/A.md');
  assert.deepEqual(result.options, {
    limit: 3,
    minimumScorePercent: 70,
    mode: 'content',
    contentWeight: 90,
    metadataWeight: 10,
    refreshIndex: true
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
