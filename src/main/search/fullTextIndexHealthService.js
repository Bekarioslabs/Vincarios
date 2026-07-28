'use strict';

const { createFullTextIndexer } = require('./fullTextIndexer');
const { createFullTextIndexStatusService } = require('./fullTextIndexStatusService');

function createFullTextIndexHealthService(options) {
  options = options || {};
  const indexer = options.indexer || createFullTextIndexer(options);
  const statusService = options.statusService || createFullTextIndexStatusService(options);
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
    const indexerResult = indexer.setRoot(vaultRoot);
    const statusResult = statusService.setRoot(vaultRoot);
    const result = indexerResult.ok ? statusResult : indexerResult;
    notify();
    return result;
  }

  function getHealth() {
    const status = getBaseStatus();
    if (!status.ok) return status;
    if (refreshing && status.enabled) return Object.assign({}, status, { state: 'indexing', canRefresh: false });
    if (stale && status.state === 'ready') return Object.assign({}, status, { state: 'stale' });
    return status;
  }

  async function setEnabled(enabled) {
    if (!indexer || typeof indexer.setEnabled !== 'function') return fail('full_text_unavailable', 'Full-text indexer unavailable.');
    const result = await indexer.setEnabled(enabled === true);
    if (result && result.ok && enabled !== true) stale = false;
    notify();
    return result;
  }

  function refreshIndex(refreshOptions) {
    const operation = () => runRefreshIndex(refreshOptions);
    return refreshCoordinator && typeof refreshCoordinator.run === 'function'
      ? refreshCoordinator.run('full-text:' + rootRevision, operation)
      : operation();
  }

  async function runRefreshIndex(refreshOptions) {
    if (!indexer || typeof indexer.rebuildIndex !== 'function') return fail('full_text_unavailable', 'Full-text indexer unavailable.');
    const status = getBaseStatus();
    if (!status.ok || !status.enabled) return fail('full_text_not_enabled', 'Full-text search is not enabled for this vault.');
    if ((!refreshOptions || refreshOptions.refreshInventory !== false) && freshnessService && typeof freshnessService.refreshSnapshot === 'function') {
      const freshness = freshnessService.refreshSnapshot();
      if (!freshness.ok) return freshness;
    }
    return runRefresh(() => indexer.rebuildIndex(refreshOptions || {}));
  }

  async function deleteIndex() {
    if (!indexer || typeof indexer.deleteIndex !== 'function') return fail('full_text_unavailable', 'Full-text indexer unavailable.');
    const result = await indexer.deleteIndex();
    stale = false;
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

  function subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  async function runRefresh(operation) {
    const refreshRevision = changeRevision;
    refreshing = true;
    notify();
    try {
      const result = await operation();
      if (result && result.ok && changeRevision === refreshRevision) stale = false;
      return result;
    } finally {
      refreshing = false;
      notify();
    }
  }

  function getBaseStatus() {
    return statusService && typeof statusService.getStatus === 'function'
      ? statusService.getStatus()
      : fail('full_text_unavailable', 'Full-text index status unavailable.');
  }

  function notify() {
    const health = getHealth();
    listeners.forEach((listener) => listener(health));
  }

  return Object.freeze({ setRoot, getHealth, setEnabled, refreshIndex, deleteIndex, markStale, subscribe });
}

function fail(code, message) { return { ok: false, code, message, state: 'unavailable', enabled: false, canRefresh: false }; }
module.exports = { createFullTextIndexHealthService };
