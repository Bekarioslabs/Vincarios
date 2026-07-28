'use strict';

function createEmbeddingIndexHealthService(options) {
  options = options || {};
  const statusService = options.statusService;
  const indexer = options.indexer;
  const freshnessService = options.freshnessService || null;
  const refreshCoordinator = options.refreshCoordinator || null;
  const listeners = new Set();
  let stale = false;
  let refreshing = false;
  let changeRevision = 0;
  let rootRevision = 0;

  function setRoot(vaultRoot) {
    stale = false;
    refreshing = false;
    changeRevision = 0;
    rootRevision += 1;
    const result = statusService && typeof statusService.setRoot === 'function'
      ? statusService.setRoot(vaultRoot)
      : fail('embedding_index_unavailable', 'Embedding index status service unavailable.');
    notify();
    return result;
  }

  function markStale() {
    changeRevision += 1;
    const status = getBaseStatus();
    if (!status.ok || status.state !== 'ready') return;
    stale = true;
    notify();
  }

  function getHealth() {
    if (refreshing) return Object.assign({}, getBaseStatus(), { state: 'indexing', canRefresh: false });
    const status = getBaseStatus();
    if (stale && status.state === 'ready') return Object.assign({}, status, { state: 'stale', canRefresh: true });
    return status;
  }

  function refreshIndex(refreshOptions) {
    const operation = () => runRefresh(refreshOptions);
    return refreshCoordinator && typeof refreshCoordinator.run === 'function'
      ? refreshCoordinator.run('embeddings:' + rootRevision, operation)
      : operation();
  }

  async function runRefresh(refreshOptions) {
    if (!indexer || typeof indexer.rebuildIndex !== 'function') {
      return fail('embeddings_unavailable', 'Embedding indexer unavailable.');
    }
    const refreshRevision = changeRevision;
    refreshing = true;
    notify();
    try {
      if ((!refreshOptions || refreshOptions.refreshInventory !== false) && freshnessService && typeof freshnessService.refreshSnapshot === 'function') {
        const freshness = freshnessService.refreshSnapshot();
        if (!freshness.ok) return freshness;
      }
      const result = await indexer.rebuildIndex(refreshOptions || {});
      if (result && result.ok && changeRevision === refreshRevision) stale = false;
      return result;
    } finally {
      refreshing = false;
      notify();
    }
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function notify() {
    const health = getHealth();
    listeners.forEach((listener) => listener(health));
  }

  function getBaseStatus() {
    if (!statusService || typeof statusService.getStatus !== 'function') {
      return fail('embedding_index_unavailable', 'Embedding index status service unavailable.');
    }
    return statusService.getStatus();
  }

  return Object.freeze({ setRoot, markStale, getHealth, refreshIndex, subscribe });
}

function fail(code, message) {
  return { ok: false, code, message, state: 'unavailable', canRefresh: false };
}

module.exports = { createEmbeddingIndexHealthService };
