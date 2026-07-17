'use strict';

const { createMetadataIndexStore } = require('./metadataIndexStore');
const { METADATA_INDEX_VERSION } = require('../../shared/metadata/metadataIndexSchema');

function createMetadataIndexStatusService(options) {
  options = options || {};
  const freshnessService = options.freshnessService || null;
  const indexStore = options.indexStore || createMetadataIndexStore(options);

  function setRoot(vaultRoot) {
    return indexStore.setRoot(vaultRoot);
  }

  function getStatus() {
    const loaded = indexStore.load();
    if (!loaded.ok && loaded.code === 'vault_not_open') return ok({ state: 'no_vault', canRefresh: false, documentCount: 0 });
    if (!loaded.ok) return ok({ state: 'invalid', canRefresh: true, documentCount: 0 });
    if (!loaded.exists) return ok({ state: 'no_index', canRefresh: true, documentCount: 0 });
    if (loaded.index.version !== METADATA_INDEX_VERSION) return ok({ state: 'rebuild_required', canRefresh: true, documentCount: countDocuments(loaded.documents) });
    if (freshnessService && typeof freshnessService.compareDocuments === 'function') {
      const freshness = freshnessService.compareDocuments(loaded.documents);
      if (!freshness.ok || freshness.current !== true) return ok({ state: 'stale', canRefresh: true, documentCount: countDocuments(loaded.documents) });
    }
    return ok({ state: 'ready', canRefresh: true, documentCount: countDocuments(loaded.documents) });
  }

  return Object.freeze({ setRoot, getStatus });
}
function countDocuments(documents) { return documents && typeof documents === 'object' ? Object.keys(documents).length : 0; }
function ok(value) { return Object.assign({ ok: true }, value); }
module.exports = { createMetadataIndexStatusService };
