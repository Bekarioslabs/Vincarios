(function() {
  'use strict';

  function normalizeRelativePath(value) {
    return String(value || '')
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, '')
      .replace(/\/+/g, '/');
  }

  const api = {
    normalizeRelativePath,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.VincariosVaultPath = Object.freeze(api);
  }
})();