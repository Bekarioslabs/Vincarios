'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createFullTextIndexHealthService } = require('../src/main/search/fullTextIndexHealthService');

test('full-text health remains optional until explicit opt-in, then becomes stale on vault changes', () => {
  const service = createFullTextIndexHealthService({
    indexer: {
      setRoot: () => ({ ok: true }),
      getPreference: () => ({ ok: true, enabled: false })
    },
    statusService: {
      setRoot: () => ({ ok: true }),
      getStatus: () => ({ ok: true, state: 'disabled', enabled: false, canRefresh: false })
    }
  });

  service.setRoot('D:/Vault');
  assert.equal(service.getHealth().state, 'disabled');
  service.markStale();
  assert.equal(service.getHealth().state, 'disabled');
});

test('full-text health rebuilds only after opt-in and can delete cache without clearing preference', async () => {
  let enabled = false;
  let rebuilds = 0;
  const service = createFullTextIndexHealthService({
    indexer: {
      setRoot: () => ({ ok: true }),
      getPreference: () => ({ ok: true, enabled }),
      setEnabled: (nextEnabled) => { enabled = nextEnabled === true; return { ok: true, enabled }; },
      rebuildIndex: () => { rebuilds += 1; return { ok: true }; },
      deleteIndex: () => ({ ok: true })
    },
    statusService: {
      setRoot: () => ({ ok: true }),
      getStatus: () => ({ ok: true, state: enabled ? 'ready' : 'disabled', enabled, canRefresh: enabled })
    }
  });

  await service.setEnabled(true);
  await service.refreshIndex();
  assert.equal(rebuilds, 1);
  service.markStale();
  assert.equal(service.getHealth().state, 'stale');
  await service.refreshIndex();
  assert.equal(rebuilds, 2);
  assert.equal((await service.deleteIndex()).ok, true);
  assert.equal(enabled, true);
});

test('full-text health toggles the persistent opt-in without forcing a rebuild', async () => {
  let enabled = false;
  let rebuilds = 0;
  const service = createFullTextIndexHealthService({
    indexer: {
      setRoot: () => ({ ok: true }),
      setEnabled: (nextEnabled) => { enabled = nextEnabled === true; return { ok: true, enabled }; },
      rebuildIndex: () => { rebuilds += 1; return { ok: true }; }
    },
    statusService: {
      setRoot: () => ({ ok: true }),
      getStatus: () => ({ ok: true, state: enabled ? 'no_index' : 'disabled', enabled, canRefresh: enabled })
    }
  });

  assert.deepEqual(await service.setEnabled(true), { ok: true, enabled: true });
  assert.equal(rebuilds, 0);
  assert.equal(service.getHealth().state, 'no_index');
  assert.deepEqual(await service.setEnabled(false), { ok: true, enabled: false });
  assert.equal(service.getHealth().state, 'disabled');
});