(function() {
  'use strict';

  function createFolderVisualState(options) {
    options = options || {};
    const api = options.api || null;
    const helpers = options.helpers || getFolderVisualHelpers();
    const listeners = new Set();
    let overrides = {};

    async function load() {
      if (!api || !api.vault || typeof api.vault.getFolderVisuals !== 'function') return snapshot();
      const result = await api.vault.getFolderVisuals();
      if (result && result.ok) {
        overrides = normalizeOverrides(result.visuals);
        notify();
      }
      return snapshot();
    }

    function get(path) {
      if (!helpers) return null;
      const override = helpers.resolveTopLevelFolderVisual(path, overrides);
      return override || helpers.getDefaultTopLevelFolderVisual(path);
    }

    async function set(path, visual) {
      if (!api || !api.vault || typeof api.vault.setFolderVisual !== 'function') {
        return { ok: false, code: 'folder_visuals_unavailable', message: 'Folder appearance service unavailable.' };
      }
      const result = await api.vault.setFolderVisual({ path, visual });
      if (result && result.ok) {
        overrides = normalizeOverrides(result.visuals);
        notify();
      }
      return result;
    }

    async function clear(path) {
      if (!api || !api.vault || typeof api.vault.clearFolderVisual !== 'function') {
        return { ok: false, code: 'folder_visuals_unavailable', message: 'Folder appearance service unavailable.' };
      }
      const result = await api.vault.clearFolderVisual({ path });
      if (result && result.ok) {
        overrides = normalizeOverrides(result.visuals);
        notify();
      }
      return result;
    }

    function snapshot() {
      return Object.freeze({ overrides: Object.assign({}, overrides) });
    }

    function subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    }

    function notify() {
      listeners.forEach((listener) => listener(snapshot()));
    }

    function normalizeOverrides(value) {
      return helpers && typeof helpers.normalizeTopLevelFolderVisuals === 'function'
        ? helpers.normalizeTopLevelFolderVisuals(value)
        : {};
    }

    return Object.freeze({ load, get, set, clear, snapshot, subscribe });
  }

  function getFolderVisualHelpers() {
    if (typeof window !== 'undefined' && window.ZeusFolderVisuals) return window.ZeusFolderVisuals;
    if (typeof module !== 'undefined' && module.exports) return require('../../shared/vaultProfile/folderVisuals');
    return null;
  }

  const api = { createFolderVisualState };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusFolderVisualState = Object.freeze(api);
})();
