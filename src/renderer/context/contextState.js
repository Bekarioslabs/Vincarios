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
        contextItems: state.contextItems.map((item) => Object.assign({}, item))
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
    const kind = item.kind === 'folder' ? 'folder' : 'file';
    const path = normalizeContextPath(item.path || '');
    if (!path) return null;
    const normalized = {
      id: kind + ':' + path,
      kind,
      path,
      content: typeof item.content === 'string' ? item.content : ''
    };
    if (item.source) normalized.source = String(item.source);
    if (item.externalPath) normalized.externalPath = String(item.externalPath);
    return normalized;
  }

  function cloneContextItems(items) {
    return Array.isArray(items) ? items.map((item) => Object.assign({}, item)) : [];
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
    if (typeof window !== 'undefined' && window.VitruviosContextIntent) return window.VitruviosContextIntent;
    if (typeof module !== 'undefined' && module.exports) return require('./contextIntent');
    throw new Error('Vitruvios context intent API is not available.');
  }

  function getPackageBuilderApi() {
    if (typeof window !== 'undefined' && window.VitruviosContextPackageBuilder) return window.VitruviosContextPackageBuilder;
    if (typeof module !== 'undefined' && module.exports) return require('./contextPackageBuilder');
    throw new Error('Vitruvios context package builder API is not available.');
  }

  const api = {
    createContextState,
    buildChatContextPackage,
    normalizeContextPath
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosContextState = Object.freeze(api);
})();
