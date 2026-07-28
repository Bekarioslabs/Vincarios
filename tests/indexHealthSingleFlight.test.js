'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createIndexRefreshCoordinator } = require('../src/main/indexing/indexRefreshCoordinator');
const { createEmbeddingIndexHealthService } = require('../src/main/embeddings/embeddingIndexHealthService');
const { createFullTextIndexHealthService } = require('../src/main/search/fullTextIndexHealthService');
const { createVaultIndexHealthService } = require('../src/main/metadata/vaultIndexHealthService');

test('embedding health shares concurrent refresh work', async () => {
  let calls = 0;
  let release;
  const service = createEmbeddingIndexHealthService({
    refreshCoordinator: createIndexRefreshCoordinator(),
    statusService: {
      setRoot: () => ({ ok: true }),
      getStatus: () => ({ ok: true, state: 'ready', canRefresh: true })
    },
    indexer: {
      rebuildIndex() {
        calls += 1;
        return new Promise((resolve) => { release = resolve; });
      }
    }
  });

  const first = service.refreshIndex();
  const second = service.refreshIndex();
  assert.equal(calls, 1);
  release({ ok: true });
  await Promise.all([first, second]);
  assert.equal(calls, 1);
});

test('full-text health shares concurrent refresh work', async () => {
  let calls = 0;
  let release;
  const service = createFullTextIndexHealthService({
    refreshCoordinator: createIndexRefreshCoordinator(),
    indexer: {
      setRoot: () => ({ ok: true }),
      rebuildIndex() {
        calls += 1;
        return new Promise((resolve) => { release = resolve; });
      }
    },
    statusService: {
      setRoot: () => ({ ok: true }),
      getStatus: () => ({ ok: true, state: 'ready', enabled: true, canRefresh: true })
    }
  });

  const first = service.refreshIndex();
  const second = service.refreshIndex();
  assert.equal(calls, 1);
  release({ ok: true });
  await Promise.all([first, second]);
  assert.equal(calls, 1);
});

test('aggregate vault index health shares concurrent refresh work', async () => {
  let metadataCalls = 0;
  let release;
  const service = createVaultIndexHealthService({
    refreshCoordinator: createIndexRefreshCoordinator(),
    metadataIndexer: {
      rebuildIndex() {
        metadataCalls += 1;
        return new Promise((resolve) => { release = resolve; });
      }
    },
    metadataStatusService: {
      getStatus: () => ({ ok: true, state: 'ready', canRefresh: true })
    },
    embeddingHealthService: {
      getHealth: () => ({ ok: true, state: 'unavailable', canRefresh: false })
    }
  });

  const first = service.refreshIndexes();
  const second = service.refreshIndexes();
  assert.equal(metadataCalls, 1);
  release({ ok: true });
  await Promise.all([first, second]);
  assert.equal(metadataCalls, 1);
});
