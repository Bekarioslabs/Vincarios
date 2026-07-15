'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createEmbeddingIndexHealthService } = require('../src/main/embeddings/embeddingIndexHealthService');

test('index health marks a ready embedding index stale after a watched Markdown change', () => {
  let watchCallback = null;
  const statusService = {
    setRoot(root) { return { ok: true, root }; },
    getStatus() { return { ok: true, state: 'ready', canRefresh: true, documentCount: 4, chunkCount: 9 }; }
  };
  const service = createEmbeddingIndexHealthService({
    statusService,
    indexer: { rebuildIndex() { return { ok: true }; } },
    watch(_root, _options, callback) { watchCallback = callback; return { close() {} }; }
  });

  service.setRoot('D:/Vault');
  watchCallback('change', 'Notes/Example.md');

  const health = service.getHealth();
  assert.equal(health.state, 'stale');
  assert.equal(health.documentCount, 4);
  assert.equal(health.canRefresh, true);
});

test('index health ignores protected folders and clears stale state after explicit refresh', async () => {
  let watchCallback = null;
  let refreshCalls = 0;
  const service = createEmbeddingIndexHealthService({
    statusService: {
      setRoot() { return { ok: true }; },
      getStatus() { return { ok: true, state: 'ready', canRefresh: true }; }
    },
    indexer: { async rebuildIndex() { refreshCalls += 1; return { ok: true, indexedDocuments: 2 }; } },
    watch(_root, _options, callback) { watchCallback = callback; return { close() {} }; }
  });

  service.setRoot('D:/Vault');
  watchCallback('change', '.vitruvios/index/documents.json');
  assert.equal(service.getHealth().state, 'ready');

  watchCallback('rename', 'Notes/Changed.md');
  assert.equal(service.getHealth().state, 'stale');
  await service.refreshIndex();

  assert.equal(refreshCalls, 1);
  assert.equal(service.getHealth().state, 'ready');
});

test('index health reports indexing while an explicit refresh is active and notifies subscribers', async () => {
  let resolveRefresh;
  const changes = [];
  const service = createEmbeddingIndexHealthService({
    statusService: {
      setRoot() { return { ok: true }; },
      getStatus() { return { ok: true, state: 'ready', canRefresh: true }; }
    },
    indexer: { rebuildIndex() { return new Promise((resolve) => { resolveRefresh = resolve; }); } },
    watch() { return { close() {} }; }
  });
  service.subscribe((health) => changes.push(health.state));
  service.setRoot('D:/Vault');

  const refresh = service.refreshIndex();
  assert.equal(service.getHealth().state, 'indexing');
  resolveRefresh({ ok: true });
  await refresh;

  assert.equal(service.getHealth().state, 'ready');
  assert.equal(changes.includes('indexing'), true);
});
