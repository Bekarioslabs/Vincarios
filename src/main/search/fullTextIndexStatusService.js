'use strict';

const { createFullTextIndexStore } = require('./fullTextIndexStore');

function createFullTextIndexStatusService(options) {
  options = options || {};
  const indexStore = options.indexStore || createFullTextIndexStore(options);
  const freshnessService = options.freshnessService || null;

  function setRoot(vaultRoot) {
    return indexStore.setRoot(vaultRoot);
  }

  function getStatus() {
    const preference = indexStore.getPreference();
    if (!preference.ok && preference.code === 'vault_not_open') return ok({ state: 'no_vault', enabled: false, canRefresh: false, documentCount: 0, termCount: 0 });
    if (!preference.ok) return ok({ state: 'invalid', enabled: false, canRefresh: false, cacheExists: false, documentCount: 0, termCount: 0 });

    const loaded = indexStore.load();
    if (!preference.enabled) {
      return ok({
        state: 'disabled',
        enabled: false,
        canRefresh: false,
        cacheExists: loaded.ok ? loaded.exists === true : true,
        cacheInvalid: !loaded.ok,
        documentCount: loaded.ok && loaded.exists ? Object.keys(loaded.index.documents || {}).length : 0,
        termCount: loaded.ok && loaded.exists ? Object.keys(loaded.index.terms || {}).length : 0
      });
    }
    if (!loaded.ok) return ok({ state: 'invalid', enabled: true, canRefresh: true, cacheExists: true, documentCount: 0, termCount: 0 });
    if (!loaded.exists) return ok({ state: 'no_index', enabled: true, canRefresh: true, cacheExists: false, documentCount: 0, termCount: 0 });
    if (freshnessService && typeof freshnessService.compareDocuments === 'function') {
      const freshness = freshnessService.compareDocuments(loaded.index.documents);
      if (!freshness.ok || freshness.current !== true) return ok({ state: 'stale', enabled: true, canRefresh: true, cacheExists: true, documentCount: Object.keys(loaded.index.documents || {}).length, termCount: Object.keys(loaded.index.terms || {}).length });
    }
    return ok({
      state: 'ready',
      enabled: true,
      canRefresh: true,
      documentCount: Object.keys(loaded.index.documents || {}).length,
      termCount: Object.keys(loaded.index.terms || {}).length
    });
  }

  return Object.freeze({ setRoot, getStatus });
}

function ok(value) { return Object.assign({ ok: true }, value); }
module.exports = { createFullTextIndexStatusService };
