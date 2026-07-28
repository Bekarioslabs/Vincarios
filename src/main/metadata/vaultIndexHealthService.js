'use strict';

function createVaultIndexHealthService(options) {
  options = options || {};
  const metadataIndexer = options.metadataIndexer;
  const metadataStatusService = options.metadataStatusService;
  const embeddingHealthService = options.embeddingHealthService;
  const fullTextHealthService = options.fullTextHealthService || null;
  const freshnessService = options.freshnessService || null;
  const refreshCoordinator = options.refreshCoordinator || null;
  const listeners = new Set();
  let refreshing = false;
  let metadataStale = false;
  let rootRevision = 0;

  const unsubscribeEmbeddingHealth = embeddingHealthService && typeof embeddingHealthService.subscribe === 'function'
    ? embeddingHealthService.subscribe(notify)
    : null;
  const unsubscribeFullTextHealth = fullTextHealthService && typeof fullTextHealthService.subscribe === 'function'
    ? fullTextHealthService.subscribe(notify)
    : null;

  function setRoot(vaultRoot) {
    metadataStale = false;
    rootRevision += 1;
    const freshnessResult = freshnessService && typeof freshnessService.setRoot === 'function'
      ? freshnessService.setRoot(vaultRoot)
      : { ok: true, skipped: true };
    const metadataIndexResult = metadataIndexer && typeof metadataIndexer.setRoot === 'function'
      ? metadataIndexer.setRoot(vaultRoot)
      : fail('metadata_unavailable', 'Metadata indexer unavailable.');
    const metadataStatusResult = metadataStatusService && typeof metadataStatusService.setRoot === 'function'
      ? metadataStatusService.setRoot(vaultRoot)
      : fail('metadata_unavailable', 'Metadata index status service unavailable.');
    const embeddingResult = embeddingHealthService && typeof embeddingHealthService.setRoot === 'function'
      ? embeddingHealthService.setRoot(vaultRoot)
      : fail('embeddings_unavailable', 'Embedding index health service unavailable.');
    const fullTextResult = fullTextHealthService && typeof fullTextHealthService.setRoot === 'function'
      ? fullTextHealthService.setRoot(vaultRoot)
      : { ok: true, skipped: true };
    const result = freshnessResult.ok && metadataIndexResult.ok && metadataStatusResult.ok
      ? ok({ freshness: freshnessResult, metadata: metadataStatusResult, embeddings: embeddingResult, fullText: fullTextResult })
      : !freshnessResult.ok ? freshnessResult : metadataIndexResult.ok ? metadataStatusResult : metadataIndexResult;
    notify();
    return result;
  }

  function getHealth() {
    const metadata = getMetadataStatus();
    const embeddings = getEmbeddingStatus();
    const fullText = getFullTextStatus();
    return ok({
      state: refreshing ? 'indexing' : deriveState(metadata, embeddings, fullText),
      canRefresh: !refreshing && metadata.canRefresh === true,
      metadata,
      embeddings,
      fullText
    });
  }

  function refreshIndexes(refreshOptions) {
    const operation = () => runRefreshIndexes(refreshOptions);
    return refreshCoordinator && typeof refreshCoordinator.run === 'function'
      ? refreshCoordinator.run('vault-indexes:' + rootRevision, operation)
      : operation();
  }

  async function runRefreshIndexes(refreshOptions) {
    if (!metadataIndexer || typeof metadataIndexer.rebuildIndex !== 'function') {
      return fail('metadata_unavailable', 'Metadata indexer unavailable.');
    }
    refreshing = true;
    notify();
    try {
      const freshness = freshnessService && typeof freshnessService.refreshSnapshot === 'function'
        ? freshnessService.refreshSnapshot()
        : { ok: true, skipped: true };
      if (!freshness.ok) return freshness;

      const metadata = await metadataIndexer.rebuildIndex(refreshOptions || {});
      if (!metadata.ok) return metadata;
      metadataStale = false;

      const embeddings = shouldRefreshEmbeddings()
        ? await embeddingHealthService.refreshIndex(Object.assign({}, refreshOptions, { refreshInventory: false }))
        : { ok: true, skipped: true };
      const fullText = shouldRefreshFullText()
        ? await fullTextHealthService.refreshIndex(Object.assign({}, refreshOptions, { refreshInventory: false }))
        : { ok: true, skipped: true };
      return ok({ freshness, metadata, embeddings, fullText });
    } finally {
      refreshing = false;
      notify();
    }
  }

  async function setFullTextEnabled(enabled) {
    if (!fullTextHealthService || typeof fullTextHealthService.setEnabled !== 'function') {
      return fail('full_text_unavailable', 'Full-text index service unavailable.');
    }
    return fullTextHealthService.setEnabled(enabled === true);
  }

  async function refreshFullText() {
    if (!fullTextHealthService || typeof fullTextHealthService.refreshIndex !== 'function') {
      return fail('full_text_unavailable', 'Full-text index service unavailable.');
    }
    return fullTextHealthService.refreshIndex();
  }

  async function deleteFullText() {
    if (!fullTextHealthService || typeof fullTextHealthService.deleteIndex !== 'function') {
      return fail('full_text_unavailable', 'Full-text index service unavailable.');
    }
    return fullTextHealthService.deleteIndex();
  }

  function applyMetadataChanges(paths) {
    if (!metadataIndexer || typeof metadataIndexer.syncChangedPaths !== 'function') {
      return fail('metadata_incremental_unavailable', 'Incremental metadata updates are unavailable.');
    }
    if (!freshnessService || typeof freshnessService.applyChanges !== 'function') {
      return fail('metadata_incremental_unavailable', 'Incremental vault inventory updates are unavailable.');
    }
    const metadata = metadataIndexer.syncChangedPaths(paths);
    if (!metadata.ok) return metadata;
    const freshness = freshnessService.applyChanges(paths);
    if (!freshness.ok) return freshness;
    metadataStale = false;
    // The shared inventory now decides whether secondary indexes are stale.
    // Do not force a stale flag here: this event may have arrived after a full refresh.
    notify();
    return ok({ metadata, freshness });
  }
  function markStale() {
    if (freshnessService && typeof freshnessService.markStale === 'function') freshnessService.markStale();
    const metadata = getMetadataStatus();
    if (metadata.ok && metadata.state === 'ready') metadataStale = true;
    if (embeddingHealthService && typeof embeddingHealthService.markStale === 'function') embeddingHealthService.markStale();
    if (fullTextHealthService && typeof fullTextHealthService.markStale === 'function') fullTextHealthService.markStale();
    notify();
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

  function close() {
    if (typeof unsubscribeEmbeddingHealth === 'function') unsubscribeEmbeddingHealth();
    if (typeof unsubscribeFullTextHealth === 'function') unsubscribeFullTextHealth();
    listeners.clear();
  }

  function shouldRefreshEmbeddings() {
    const status = getEmbeddingStatus();
    return status.canRefresh === true
      && embeddingHealthService
      && typeof embeddingHealthService.refreshIndex === 'function';
  }

  function shouldRefreshFullText() {
    const status = getFullTextStatus();
    return status.enabled === true
      && status.canRefresh === true
      && fullTextHealthService
      && typeof fullTextHealthService.refreshIndex === 'function';
  }

  function getMetadataStatus() {
    const status = metadataStatusService && typeof metadataStatusService.getStatus === 'function'
      ? metadataStatusService.getStatus()
      : fail('metadata_unavailable', 'Metadata index status service unavailable.');
    return metadataStale && status.ok && status.state === 'ready'
      ? Object.assign({}, status, { state: 'stale' })
      : status;
  }

  function getEmbeddingStatus() {
    return embeddingHealthService && typeof embeddingHealthService.getHealth === 'function'
      ? embeddingHealthService.getHealth()
      : fail('embeddings_unavailable', 'Embedding index health service unavailable.');
  }

  function getFullTextStatus() {
    return fullTextHealthService && typeof fullTextHealthService.getHealth === 'function'
      ? fullTextHealthService.getHealth()
      : { ok: true, state: 'disabled', enabled: false, canRefresh: false };
  }

  return Object.freeze({
    setRoot,
    getHealth,
    refreshIndexes,
    setFullTextEnabled,
    refreshFullText,
    deleteFullText,
    applyMetadataChanges,
    markStale,
    subscribe,
    close
  });
}

function deriveState(metadata, embeddings, fullText) {
  if (!metadata.ok || metadata.state === 'invalid') return 'invalid';
  if (metadata.state === 'no_vault') return 'no_vault';
  if (metadata.state === 'no_index' || (embeddings && embeddings.ok && embeddings.state === 'no_index')) return 'no_index';
  if (metadata.state === 'rebuild_required' || (embeddings && embeddings.ok && embeddings.state === 'rebuild_required')) return 'rebuild_required';
  if (metadata.state !== 'ready') return 'stale';
  if (embeddings && embeddings.ok && !['ready', 'unavailable', 'no_vault'].includes(embeddings.state)) return 'stale';
  if (fullText && fullText.enabled === true && fullText.state !== 'ready') return 'stale';
  return 'ready';
}

function ok(value) {
  return Object.assign({ ok: true }, value);
}

function fail(code, message) {
  return { ok: false, code, message, state: 'unavailable', canRefresh: false };
}

module.exports = { createVaultIndexHealthService };
