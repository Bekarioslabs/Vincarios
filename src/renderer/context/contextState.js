(function() {
  'use strict';

  function createContextState(options) {
    options = options || {};
    const onChange = typeof options.onChange === 'function' ? options.onChange : null;
    let nextSelectionId = 1;
    let state = createNoneState(true, 0);

    function setFile(path, details) {
      state = createState('file', path, details, state.autoContextEnabled, nextSelectionId);
      nextSelectionId += 1;
      notify();
      return snapshot();
    }

    function setFolder(path, details) {
      state = createState('folder', path, details, state.autoContextEnabled, nextSelectionId);
      nextSelectionId += 1;
      notify();
      return snapshot();
    }

    function setAutoContextEnabled(enabled) {
      state = Object.assign({}, state, {
        autoContextEnabled: enabled === true,
        label: labelForState(state.kind, state.path, enabled === true)
      });
      notify();
      return snapshot();
    }

    function clear() {
      state = createNoneState(state.autoContextEnabled, nextSelectionId);
      nextSelectionId += 1;
      notify();
      return snapshot();
    }

    function snapshot() {
      return Object.assign({}, state);
    }

    function notify() {
      if (onChange) onChange(snapshot());
    }

    return Object.freeze({ setFile, setFolder, setAutoContextEnabled, clear, snapshot });
  }

  function createState(kind, rawPath, details, autoContextEnabled, selectionId) {
    const path = normalizeContextPath(rawPath);
    if (!path) return createNoneState(autoContextEnabled, selectionId);

    return {
      kind: kind === 'folder' ? 'folder' : 'file',
      selectionId: Number.isInteger(selectionId) ? selectionId : 0,
      path,
      content: details && typeof details.content === 'string' ? details.content : '',
      readAllowed: details && Object.prototype.hasOwnProperty.call(details, 'readAllowed') ? details.readAllowed === true : true,
      parentReadAllowed: details && Object.prototype.hasOwnProperty.call(details, 'parentReadAllowed') ? details.parentReadAllowed === true : false,
      autoContextEnabled: autoContextEnabled !== false,
      label: labelForState(kind, path, autoContextEnabled !== false)
    };
  }

  function createNoneState(autoContextEnabled, selectionId) {
    return {
      kind: 'none',
      selectionId: Number.isInteger(selectionId) ? selectionId : 0,
      path: '',
      content: '',
      readAllowed: false,
      parentReadAllowed: false,
      autoContextEnabled: autoContextEnabled !== false,
      label: 'No context target.'
    };
  }

  function labelForState(kind, path, autoContextEnabled) {
    if (!path) return 'No context target.';
    if (!autoContextEnabled) return 'Auto-context off: ' + path;
    if (kind === 'folder') return 'Context folder: ' + path + '/';
    return 'Context file: ' + path;
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

  function looksLikeSelectedTargetRequest(text) {
    return getIntentApi().looksLikeSelectedTargetRequest(text);
  }

  function looksLikeFolderScopedRequest(text) {
    return getIntentApi().looksLikeFolderScopedRequest(text);
  }

  function getIntentApi() {
    if (typeof window !== 'undefined' && window.ZeusContextIntent) return window.ZeusContextIntent;
    if (typeof module !== 'undefined' && module.exports) return require('./contextIntent');
    throw new Error('ZEUS context intent API is not available.');
  }

  function getPackageBuilderApi() {
    if (typeof window !== 'undefined' && window.ZeusContextPackageBuilder) return window.ZeusContextPackageBuilder;
    if (typeof module !== 'undefined' && module.exports) return require('./contextPackageBuilder');
    throw new Error('ZEUS context package builder API is not available.');
  }

  const api = {
    createContextState,
    buildChatContextPackage,
    looksLikeSelectedTargetRequest,
    looksLikeFolderScopedRequest,
    normalizeContextPath
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusContextState = Object.freeze(api);
})();
