'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createVaultIndexHealthService } = require('../src/main/metadata/vaultIndexHealthService');
test('vault index health refreshes metadata and available embeddings through one action', async () => {
  let metadataRuns = 0; let embeddingRuns = 0;
  const service = createVaultIndexHealthService({
    metadataIndexer: { setRoot: () => ({ ok: true }), rebuildIndex: () => { metadataRuns += 1; return { ok: true }; } },
    metadataStatusService: { setRoot: () => ({ ok: true }), getStatus: () => ({ ok: true, state: 'ready', canRefresh: true }) },
    embeddingHealthService: { setRoot: () => ({ ok: true }), getHealth: () => ({ ok: true, state: 'ready', canRefresh: true }), refreshIndex: async () => { embeddingRuns += 1; return { ok: true }; } }
  });
  assert.equal((await service.refreshIndexes()).ok, true);
  assert.equal(metadataRuns, 1); assert.equal(embeddingRuns, 1);
});
test('vault index health stops before embeddings when metadata refresh fails', async () => {
  let embeddingRuns = 0;
  const service = createVaultIndexHealthService({
    metadataIndexer: { rebuildIndex: () => ({ ok: false, code: 'metadata_failed', message: 'Metadata refresh failed.' }) },
    metadataStatusService: { getStatus: () => ({ ok: true, state: 'stale', canRefresh: true }) },
    embeddingHealthService: {
      getHealth: () => ({ ok: true, state: 'stale', canRefresh: true }),
      refreshIndex: async () => { embeddingRuns += 1; return { ok: true }; }
    }
  });

  const result = await service.refreshIndexes();

  assert.equal(result.ok, false);
  assert.equal(embeddingRuns, 0);
});
test('vault index health reports no index when metadata has not been built yet', () => {
  const service = createVaultIndexHealthService({
    metadataStatusService: { getStatus: () => ({ ok: true, state: 'no_index', canRefresh: true }) },
    embeddingHealthService: { getHealth: () => ({ ok: true, state: 'no_index', canRefresh: true }) }
  });

  assert.equal(service.getHealth().state, 'no_index');
});
test('vault index health notifies after a metadata-only refresh', async () => {
  const states = [];
  const service = createVaultIndexHealthService({
    metadataIndexer: { rebuildIndex: () => ({ ok: true, documentCount: 2 }) },
    metadataStatusService: { getStatus: () => ({ ok: true, state: 'ready', canRefresh: true, documentCount: 2 }) },
    embeddingHealthService: { getHealth: () => ({ ok: true, state: 'unavailable', canRefresh: false }) }
  });

  service.subscribe((health) => states.push(health.state));
  await service.refreshIndexes();

  assert.deepEqual(states, ['indexing', 'ready']);
});
test('vault index health includes enabled full-text search and refreshes it through the one index action', async () => {
  let fullTextRuns = 0;
  const service = createVaultIndexHealthService({
    metadataIndexer: { setRoot: () => ({ ok: true }), rebuildIndex: () => ({ ok: true }) },
    metadataStatusService: { setRoot: () => ({ ok: true }), getStatus: () => ({ ok: true, state: 'ready', canRefresh: true }) },
    embeddingHealthService: { setRoot: () => ({ ok: true }), getHealth: () => ({ ok: true, state: 'unavailable', canRefresh: false }) },
    fullTextHealthService: {
      setRoot: () => ({ ok: true }),
      getHealth: () => ({ ok: true, state: 'no_index', enabled: true, canRefresh: true }),
      refreshIndex: async () => { fullTextRuns += 1; return { ok: true }; },
      subscribe: () => () => {}
    }
  });

  const health = service.getHealth();
  assert.equal(health.fullText.state, 'no_index');
  assert.equal(health.state, 'stale');
  assert.equal((await service.refreshIndexes()).ok, true);
  assert.equal(fullTextRuns, 1);
});

test('vault index health reconciles watcher state against a final inventory snapshot after refresh', async () => {
  let snapshots = 0;
  let embeddingReconciles = 0;
  let fullTextReconciles = 0;
  const service = createVaultIndexHealthService({
    metadataIndexer: { rebuildIndex: () => ({ ok: true }) },
    metadataStatusService: { getStatus: () => ({ ok: true, state: 'ready', canRefresh: true }) },
    embeddingHealthService: {
      getHealth: () => ({ ok: true, state: 'ready', canRefresh: true }),
      refreshIndex: async () => ({ ok: true }),
      reconcileAfterVaultRefresh: () => { embeddingReconciles += 1; return { ok: true, state: 'ready' }; }
    },
    fullTextHealthService: {
      getHealth: () => ({ ok: true, state: 'ready', enabled: true, canRefresh: true }),
      refreshIndex: async () => ({ ok: true }),
      reconcileAfterVaultRefresh: () => { fullTextReconciles += 1; return { ok: true, state: 'ready' }; },
      subscribe: () => () => {}
    },
    freshnessService: { refreshSnapshot: () => { snapshots += 1; return { ok: true }; } }
  });

  assert.equal((await service.refreshIndexes()).ok, true);
  assert.equal(snapshots, 2);
  assert.equal(embeddingReconciles, 1);
  assert.equal(fullTextReconciles, 1);
});

test('vault index health ignores disabled full-text search in aggregate status and refresh', async () => {
  let fullTextRuns = 0;
  const service = createVaultIndexHealthService({
    metadataIndexer: { rebuildIndex: () => ({ ok: true }) },
    metadataStatusService: { getStatus: () => ({ ok: true, state: 'ready', canRefresh: true }) },
    embeddingHealthService: { getHealth: () => ({ ok: true, state: 'unavailable', canRefresh: false }) },
    fullTextHealthService: {
      getHealth: () => ({ ok: true, state: 'disabled', enabled: false, canRefresh: false }),
      refreshIndex: async () => { fullTextRuns += 1; return { ok: true }; },
      subscribe: () => () => {}
    }
  });

  assert.equal(service.getHealth().state, 'ready');
  await service.refreshIndexes();
  assert.equal(fullTextRuns, 0);
});

test('vault index health marks metadata and child indexes stale through one change boundary', () => {
  let embeddingMarks = 0;
  let fullTextMarks = 0;
  const service = createVaultIndexHealthService({
    metadataStatusService: { getStatus: () => ({ ok: true, state: 'ready', canRefresh: true }) },
    embeddingHealthService: {
      getHealth: () => ({ ok: true, state: 'unavailable', canRefresh: false }),
      markStale: () => { embeddingMarks += 1; }
    },
    fullTextHealthService: {
      getHealth: () => ({ ok: true, state: 'disabled', enabled: false, canRefresh: false }),
      markStale: () => { fullTextMarks += 1; },
      subscribe: () => () => {}
    }
  });

  service.markStale();

  assert.equal(service.getHealth().metadata.state, 'stale');
  assert.equal(service.getHealth().state, 'stale');
  assert.equal(embeddingMarks, 1);
  assert.equal(fullTextMarks, 1);
});

test('vault index health does not force secondary indexes stale after a safe incremental update', () => {
  let embeddingMarks = 0;
  let fullTextMarks = 0;
  const service = createVaultIndexHealthService({
    metadataIndexer: { syncChangedPaths: () => ({ ok: true, updatedCount: 1 }) },
    metadataStatusService: { getStatus: () => ({ ok: true, state: 'ready', canRefresh: true }) },
    embeddingHealthService: {
      getHealth: () => ({ ok: true, state: 'ready', canRefresh: true }),
      markStale: () => { embeddingMarks += 1; }
    },
    fullTextHealthService: {
      getHealth: () => ({ ok: true, state: 'ready', enabled: true, canRefresh: true }),
      markStale: () => { fullTextMarks += 1; },
      subscribe: () => () => {}
    },
    freshnessService: { applyChanges: () => ({ ok: true }) }
  });

  assert.equal(service.applyMetadataChanges(['Notes/Updated.md']).ok, true);
  assert.equal(service.getHealth().state, 'ready');
  assert.equal(embeddingMarks, 0);
  assert.equal(fullTextMarks, 0);
});
