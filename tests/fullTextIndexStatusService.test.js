'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createFullTextIndexStatusService } = require('../src/main/search/fullTextIndexStatusService');

test('full-text status keeps cache deletion available while the feature is disabled', () => {
  const service = createFullTextIndexStatusService({
    indexStore: {
      setRoot: () => ({ ok: true }),
      getPreference: () => ({ ok: true, enabled: false }),
      load: () => ({ ok: true, exists: true, index: { documents: { 'A.md': {} }, terms: {} } })
    }
  });

  const status = service.getStatus();

  assert.equal(status.state, 'disabled');
  assert.equal(status.cacheExists, true);
});

test('full-text status reports an enabled cache stale when vault inventory differs', () => {
  const service = createFullTextIndexStatusService({
    indexStore: {
      setRoot: () => ({ ok: true }),
      getPreference: () => ({ ok: true, enabled: true }),
      load: () => ({ ok: true, exists: true, index: { documents: { 'A.md': { mtimeMs: 1 } }, terms: {} } })
    },
    freshnessService: { compareDocuments: () => ({ ok: true, current: false }) }
  });

  assert.equal(service.getStatus().state, 'stale');
});
