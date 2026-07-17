'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_DEBOUNCE_MS = 350;

function createVaultChangeService(options) {
  options = options || {};
  const watch = options.watch || fs.watch;
  const schedule = options.setTimeout || setTimeout;
  const cancel = options.clearTimeout || clearTimeout;
  const debounceMs = Number.isFinite(options.debounceMs) ? options.debounceMs : DEFAULT_DEBOUNCE_MS;
  const listeners = new Set();
  let vaultRoot = '';
  let watcher = null;
  let timer = null;
  let pendingMarkdownChange = false;
  let pendingMetadataRebuild = false;
  const pendingMarkdownPaths = new Set();

  function setRoot(nextRoot) {
    closeWatcher();
    vaultRoot = nextRoot || '';
    clearPendingChange();
    if (!vaultRoot) return { ok: true, root: vaultRoot };
    try {
      watcher = watch(vaultRoot, { recursive: true }, (eventType, filename) => onFileSystemChange(eventType, filename));
      return { ok: true, root: vaultRoot };
    } catch (error) {
      watcher = null;
      return { ok: false, code: 'vault_watch_unavailable', message: 'Vault change watcher unavailable.', root: vaultRoot };
    }
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function close() {
    closeWatcher();
    listeners.clear();
    vaultRoot = '';
    clearPendingChange();
  }

  function onFileSystemChange(_eventType, filename) {
    if (!isVisibleVaultChange(filename)) return;
    const change = classifyMarkdownChange(filename);
    pendingMarkdownChange = pendingMarkdownChange || change.affectsMarkdownIndex;
    pendingMetadataRebuild = pendingMetadataRebuild || change.requiresMetadataRebuild;
    if (change.markdownPath) pendingMarkdownPaths.add(change.markdownPath);
    if (timer) return;
    timer = schedule(flush, debounceMs);
  }

  function flush() {
    timer = null;
    const event = Object.freeze({
      root: vaultRoot,
      affectsMarkdownIndex: pendingMarkdownChange,
      markdownPaths: Array.from(pendingMarkdownPaths).sort(),
      requiresMetadataRebuild: pendingMetadataRebuild
    });
    clearPendingChange();
    listeners.forEach((listener) => listener(event));
  }

  function clearPendingChange() {
    pendingMarkdownChange = false;
    pendingMetadataRebuild = false;
    pendingMarkdownPaths.clear();
  }

  function closeWatcher() {
    if (timer) cancel(timer);
    timer = null;
    if (watcher && typeof watcher.close === 'function') watcher.close();
    watcher = null;
  }

  return Object.freeze({ setRoot, subscribe, close });
}

function isVisibleVaultChange(filename) {
  if (filename === undefined || filename === null || filename === '') return true;
  const normalized = normalizeFilename(filename);
  return !normalized.split('/').some((segment) => segment.startsWith('.'));
}

function affectsMarkdownIndex(filename) {
  return classifyMarkdownChange(filename).affectsMarkdownIndex;
}

function classifyMarkdownChange(filename) {
  if (filename === undefined || filename === null || filename === '') {
    return { affectsMarkdownIndex: true, markdownPath: '', requiresMetadataRebuild: true };
  }
  const normalized = normalizeFilename(filename);
  const extension = path.extname(normalized).toLowerCase();
  if (extension === '.md') {
    return { affectsMarkdownIndex: true, markdownPath: normalized, requiresMetadataRebuild: false };
  }
  if (extension === '') {
    return { affectsMarkdownIndex: true, markdownPath: '', requiresMetadataRebuild: true };
  }
  return { affectsMarkdownIndex: false, markdownPath: '', requiresMetadataRebuild: false };
}

function normalizeFilename(filename) {
  return String(filename).replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
}

module.exports = { DEFAULT_DEBOUNCE_MS, affectsMarkdownIndex, classifyMarkdownChange, createVaultChangeService, isVisibleVaultChange };