(function() {
  'use strict';

  function createContextState(options) {
    options = options || {};
    const onChange = typeof options.onChange === 'function' ? options.onChange : null;
    let state = createNoneState();

    function setFile(path) {
      state = createState('file', path);
      notify();
      return snapshot();
    }

    function setFolder(path) {
      state = createState('folder', path);
      notify();
      return snapshot();
    }

    function clear() {
      state = createNoneState();
      notify();
      return snapshot();
    }

    function snapshot() {
      return { ...state };
    }

    function notify() {
      if (onChange) onChange(snapshot());
    }

    return Object.freeze({ setFile, setFolder, clear, snapshot });
  }

  function createState(kind, rawPath) {
    const path = normalizeContextPath(rawPath);
    if (!path) return createNoneState();

    if (kind === 'folder') {
      return {
        kind: 'folder',
        path,
        label: 'Context folder: ' + path + '/'
      };
    }

    return {
      kind: 'file',
      path,
      label: 'Context file: ' + path
    };
  }

  function createNoneState() {
    return {
      kind: 'none',
      path: '',
      label: 'No context target.'
    };
  }

  function normalizeContextPath(value) {
    return String(value || '')
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, '')
      .trim();
  }

  const api = { createContextState, normalizeContextPath };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusContextState = Object.freeze(api);
})();