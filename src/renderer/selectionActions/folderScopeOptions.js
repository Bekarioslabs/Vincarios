(function() {
  'use strict';

  const defaults = getActionDefaults();
  const DEFAULT_FOLDER_SCOPE_OPTIONS = defaults.DEFAULT_FOLDER_ACTION_DEFAULTS.folderContext;

  function normalizeFolderScopeOptions(options) {
    return defaults.normalizeFolderScopeOptions(options, DEFAULT_FOLDER_SCOPE_OPTIONS);
  }

  function getActionDefaults() {
    if (typeof window !== 'undefined' && window.VincariosActionDefaults) return window.VincariosActionDefaults;
    if (typeof module !== 'undefined' && module.exports) return require('../../shared/settings/actionDefaults');
    throw new Error('vincarios action defaults API is not available.');
  }

  const api = { DEFAULT_FOLDER_SCOPE_OPTIONS, normalizeFolderScopeOptions };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosFolderScopeOptions = Object.freeze(api);
})();
