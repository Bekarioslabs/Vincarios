'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createMetadataIndexStatusService } = require('../src/main/metadata/metadataIndexStatusService');

test('metadata index status reports missing, ready, and invalid cache states', () => {
  let result = { ok: true, exists: false };
  const service = createMetadataIndexStatusService({ indexStore: { setRoot: () => ({ ok: true }), load: () => result } });
  assert.equal(service.getStatus().state, 'no_index');
  result = { ok: true, exists: true, index: { version: 1 }, documents: { 'A.md': {} } };
  assert.equal(service.getStatus().state, 'ready');
  result = { ok: false, code: 'invalid_metadata_index' };
  assert.equal(service.getStatus().state, 'invalid');
});

test('metadata index status reports stale when the shared vault inventory differs', () => {
  const service = createMetadataIndexStatusService({
    indexStore: {
      setRoot: () => ({ ok: true }),
      load: () => ({ ok: true, exists: true, index: { version: 1 }, documents: { 'A.md': { mtimeMs: 1 } } })
    },
    freshnessService: { compareDocuments: () => ({ ok: true, current: false }) }
  });

  assert.equal(service.getStatus().state, 'stale');
});
