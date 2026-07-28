(function() {
  'use strict';

  function createContextState(options) {
    options = options || {};
    const listeners = [];
    if (typeof options.onChange === 'function') listeners.push(options.onChange);
    let nextSelectionId = 1;
    let state = createNoneState(0, []);

    function setFile(path, details) {
      state = createState('file', path, details, nextSelectionId, state.contextItems);
      nextSelectionId += 1;
      notify();
      return snapshot();
    }

    function setFolder(path, details) {
      state = createState('folder', path, details, nextSelectionId, state.contextItems);
      nextSelectionId += 1;
      notify();
      return snapshot();
    }

    function addContextItem(item) {
      const normalized = normalizeContextItem(item);
      if (!normalized) return snapshot();
      const items = state.contextItems.filter((existing) => existing.id !== normalized.id);
      items.push(normalized);
      state = Object.assign({}, state, { contextItems: items });
      notify();
      return snapshot();
    }

    function removeContextItem(id) {
      const normalizedId = String(id || '');
      state = Object.assign({}, state, {
        contextItems: state.contextItems.filter((item) => item.id !== normalizedId)
      });
      notify();
      return snapshot();
    }

    function clearContextItems() {
      state = Object.assign({}, state, { contextItems: [] });
      notify();
      return snapshot();
    }

    function clear() {
      state = createNoneState(nextSelectionId, state.contextItems);
      nextSelectionId += 1;
      notify();
      return snapshot();
    }

    function snapshot() {
      return Object.assign({}, state, {
        contextItems: cloneContextItems(state.contextItems)
      });
    }

    function subscribe(listener) {
      if (typeof listener !== 'function') return function noop() {};
      listeners.push(listener);
      listener(snapshot());
      return function unsubscribe() {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
      };
    }

    function notify() {
      const current = snapshot();
      listeners.slice().forEach((listener) => listener(current));
    }

    return Object.freeze({
      setFile,
      setFolder,
      addContextItem,
      removeContextItem,
      clearContextItems,
      subscribe,
      clear,
      snapshot
    });
  }

  function createState(kind, rawPath, details, selectionId, contextItems) {
    const path = normalizeContextPath(rawPath);
    if (!path) return createNoneState(selectionId, contextItems);

    return {
      kind: kind === 'folder' ? 'folder' : 'file',
      selectionId: Number.isInteger(selectionId) ? selectionId : 0,
      path,
      content: details && typeof details.content === 'string' ? details.content : '',
      readAllowed: details && Object.prototype.hasOwnProperty.call(details, 'readAllowed') ? details.readAllowed === true : true,
      writeAllowed: details && Object.prototype.hasOwnProperty.call(details, 'writeAllowed') ? details.writeAllowed === true : false,
      parentReadAllowed: details && Object.prototype.hasOwnProperty.call(details, 'parentReadAllowed') ? details.parentReadAllowed === true : false,
      contextItems: cloneContextItems(contextItems),
      label: labelForState(kind, path)
    };
  }

  function createNoneState(selectionId, contextItems) {
    return {
      kind: 'none',
      selectionId: Number.isInteger(selectionId) ? selectionId : 0,
      path: '',
      content: '',
      readAllowed: false,
      writeAllowed: false,
      parentReadAllowed: false,
      contextItems: cloneContextItems(contextItems),
      label: 'No selection.'
    };
  }

  function normalizeContextItem(item) {
    if (!item) return null;
    const kind = item.kind === 'folder_snapshot' ? 'folder_snapshot' : item.kind === 'folder' ? 'folder' : 'file';
    const path = normalizeContextPath(item.path || '');
    if (!path) return null;
    const normalized = {
      id: kind + ':' + path,
      kind,
      path,
      content: typeof item.content === 'string' ? item.content : ''
    };
    if (kind === 'folder_snapshot') {
      normalized.scope = normalizeSnapshotScope(item.scope);
      normalized.effectiveLimits = normalizeSnapshotLimits(item.effectiveLimits);
      normalized.files = normalizeSnapshotFiles(item.files);
      normalized.totalChars = positiveIntegerOrZero(item.totalChars);
      normalized.truncated = item.truncated === true;
      normalized.truncation = normalizeSnapshotTruncation(item.truncation);
    }
    if (item.source) normalized.source = String(item.source);
    if (item.externalPath) normalized.externalPath = String(item.externalPath);
    return normalized;
  }

  function normalizeSnapshotScope(scope) {
    scope = scope || {};
    return {
      scope: scope.scope === 'subfolders' ? 'subfolders' : 'current',
      maxDepth: positiveIntegerOrZero(scope.maxDepth),
      maxFiles: positiveIntegerOrZero(scope.maxFiles),
      fileType: scope.fileType === 'markdown' ? 'markdown' : 'markdown'
    };
  }

  function normalizeSnapshotLimits(limits) {
    limits = limits || {};
    return {
      maxDepth: positiveIntegerOrZero(limits.maxDepth),
      maxFiles: positiveIntegerOrZero(limits.maxFiles),
      maxTotalChars: positiveIntegerOrZero(limits.maxTotalChars)
    };
  }

  function normalizeSnapshotFiles(files) {
    return (Array.isArray(files) ? files : []).map((file) => {
      const path = normalizeContextPath(file && file.path);
      if (!path) return null;
      return {
        path,
        content: file && typeof file.content === 'string' ? file.content : '',
        truncated: file && file.truncated === true
      };
    }).filter(Boolean);
  }

  function normalizeSnapshotTruncation(value) {
    value = value || {};
    return {
      fileLimitReached: value.fileLimitReached === true,
      depthLimitReached: value.depthLimitReached === true,
      folderLimitReached: value.folderLimitReached === true,
      totalLimitReached: value.totalLimitReached === true
    };
  }

  function positiveIntegerOrZero(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
  }

  function cloneContextItems(items) {
    return Array.isArray(items) ? items.map((item) => {
      const copy = Object.assign({}, item);
      if (item && item.scope) copy.scope = Object.assign({}, item.scope);
      if (item && item.effectiveLimits) copy.effectiveLimits = Object.assign({}, item.effectiveLimits);
      if (item && item.truncation) copy.truncation = Object.assign({}, item.truncation);
      if (item && Array.isArray(item.files)) copy.files = item.files.map((file) => Object.assign({}, file));
      return copy;
    }) : [];
  }

  function labelForState(kind, path) {
    if (!path) return 'No selection.';
    if (kind === 'folder') return 'Selected folder: ' + path + '/';
    return 'Selected file: ' + path;
  }

  function normalizeContextPath(value) {
    return String(value || '')
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, '')
      .trim();
  }

  function buildChatContextPackage(options) {
    return getPackageBuilderApi().buildChatContextPackage(options);
  }

function getIntentApi() {
    if (typeof window !== 'undefined' && window.VincariosContextIntent) return window.VincariosContextIntent;
    if (typeof module !== 'undefined' && module.exports) return require('./contextIntent');
    throw new Error('vincarios context intent API is not available.');
  }

  function getPackageBuilderApi() {
    if (typeof window !== 'undefined' && window.VincariosContextPackageBuilder) return window.VincariosContextPackageBuilder;
    if (typeof module !== 'undefined' && module.exports) return require('./contextPackageBuilder');
    throw new Error('vincarios context package builder API is not available.');
  }

  const api = {
    createContextState,
    buildChatContextPackage,
    normalizeContextPath
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosContextState = Object.freeze(api);
})();
