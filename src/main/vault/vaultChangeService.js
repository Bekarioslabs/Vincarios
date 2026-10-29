'use strict';

const { isMarkdownPath } = require('../../shared/fileTypes');

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_DEBOUNCE_MS = 350;

function createVaultChangeService(options) {
  options = options || {};
  const fileSystem = options.fs || fs;
  const watch = options.watch || fs.watch;
  const schedule = options.setTimeout || setTimeout;
  const cancel = options.clearTimeout || clearTimeout;
  const debounceMs = Number.isFinite(options.debounceMs) ? options.debounceMs : DEFAULT_DEBOUNCE_MS;
  const listeners = new Set();
  let vaultRoot = '';
  let watcher = null;
  let watcherRevision = 0;
  let timer = null;
  let pendingMarkdownChange = false;
  let pendingMetadataRebuild = false;
  const pendingMarkdownPaths = new Set();

  function setRoot(nextRoot) {
    closeWatcher();
    vaultRoot = nextRoot || '';
    clearPendingChange();
    if (!vaultRoot) return { ok: true, root: vaultRoot };
    const revision = watcherRevision;
    try {
      watcher = watch(vaultRoot, { recursive: true }, (eventType, filename) => {
        if (revision === watcherRevision && watcher) onFileSystemChange(eventType, filename);
      });
      if (typeof watcher.on === 'function') watcher.on('error', () => onWatcherError(revision));
      return { ok: true, root: vaultRoot };
    } catch (error) {
      onWatcherError(revision);
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
    const revision = watcherRevision;
    timer = schedule(() => {
      if (revision === watcherRevision && watcher) flush();
    }, debounceMs);
  }

  function onWatcherError(revision) {
    if (revision !== watcherRevision) return;
    closeWatcher();
    clearPendingChange();
    const event = Object.freeze({
      root: vaultRoot,
      affectsMarkdownIndex: true,
      requiresMetadataRebuild: true,
      markdownPaths: [],
      watcherUnavailable: true,
      code: 'vault_watch_unavailable'
    });
    listeners.forEach((listener) => listener(event));
  }

  function flush() {
    timer = null;
    let rootAvailable = false;
    try {
      // A deletion-pending Windows directory can still stat as a directory.
      rootAvailable = fileSystem.existsSync(vaultRoot) && fileSystem.statSync(vaultRoot).isDirectory();
    } catch (_error) {}
    if (!rootAvailable) {
      onWatcherError(watcherRevision);
      return;
    }
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
    watcherRevision += 1;
    if (timer) cancel(timer);
    timer = null;
    const previousWatcher = watcher;
    watcher = null;
    if (previousWatcher && typeof previousWatcher.close === 'function') previousWatcher.close();
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
  if (isMarkdownPath(normalized)) {
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
