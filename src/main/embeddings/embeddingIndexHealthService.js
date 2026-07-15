'use strict';

const fs = require('node:fs');
const path = require('node:path');

function createEmbeddingIndexHealthService(options) {
  options = options || {};
  const statusService = options.statusService;
  const indexer = options.indexer;
  const watch = options.watch || fs.watch;
  const listeners = new Set();
  let watcher = null;
  let stale = false;
  let refreshing = false;

  function setRoot(vaultRoot) {
    closeWatcher();
    stale = false;
    refreshing = false;
    const result = statusService && typeof statusService.setRoot === 'function'
      ? statusService.setRoot(vaultRoot)
      : fail('embedding_index_unavailable', 'Embedding index status service unavailable.');
    if (result.ok && vaultRoot) startWatcher(vaultRoot);
    notify();
    return result;
  }

  function getHealth() {
    if (refreshing) return Object.assign({}, getBaseStatus(), { state: 'indexing', canRefresh: false });
    const status = getBaseStatus();
    if (stale && status.state === 'ready') return Object.assign({}, status, { state: 'stale', canRefresh: true });
    return status;
  }

  async function refreshIndex() {
    if (!indexer || typeof indexer.rebuildIndex !== 'function') {
      return fail('embeddings_unavailable', 'Embedding indexer unavailable.');
    }
    refreshing = true;
    notify();
    try {
      const result = await indexer.rebuildIndex();
      if (result && result.ok) stale = false;
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

  function startWatcher(vaultRoot) {
    try {
      watcher = watch(vaultRoot, { recursive: true }, (_eventType, filename) => {
        if (!isRelevantChange(filename)) return;
        stale = true;
        notify();
      });
    } catch (error) {
      watcher = null;
    }
  }

  function closeWatcher() {
    if (watcher && typeof watcher.close === 'function') watcher.close();
    watcher = null;
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

  return Object.freeze({ setRoot, getHealth, refreshIndex, subscribe, close: closeWatcher });
}

function isRelevantChange(filename) {
  if (filename === undefined || filename === null || filename === '') return true;
  const normalized = String(filename).replace(/\\/g, '/');
  const segments = normalized.split('/');
  if (segments.some((segment) => segment.startsWith('.'))) return false;
  return path.extname(normalized).toLowerCase() === '.md';
}

function fail(code, message) {
  return { ok: false, code, message, state: 'unavailable', canRefresh: false };
}

module.exports = { createEmbeddingIndexHealthService, isRelevantChange };
