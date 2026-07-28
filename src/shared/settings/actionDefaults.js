(function() {
  'use strict';

  const DEFAULT_FOLDER_ACTION_DEFAULTS = Object.freeze({
    folderContext: Object.freeze({ scope: 'current', maxDepth: 3, maxFiles: 50, fileType: 'markdown' }),
    folderSummary: Object.freeze({ scope: 'current', maxDepth: 3, maxFiles: 30, fileType: 'markdown' }),
    fileSummaryMaxChars: 12000
  });

  function normalizeFolderScopeOptions(value, fallback) {
    const input = value || {};
    const defaults = fallback || DEFAULT_FOLDER_ACTION_DEFAULTS.folderContext;
    return Object.freeze({
      scope: input.scope === 'subfolders' ? 'subfolders' : defaults.scope,
      maxDepth: clampInteger(input.maxDepth, 1, 10, defaults.maxDepth),
      maxFiles: clampInteger(input.maxFiles, 1, 200, defaults.maxFiles),
      fileType: 'markdown'
    });
  }

  function normalizeActionDefaults(value) {
    const input = value || {};
    return Object.freeze({
      folderContext: normalizeFolderScopeOptions(input.folderContext, DEFAULT_FOLDER_ACTION_DEFAULTS.folderContext),
      folderSummary: normalizeFolderScopeOptions(input.folderSummary, DEFAULT_FOLDER_ACTION_DEFAULTS.folderSummary),
      fileSummaryMaxChars: clampInteger(input.fileSummaryMaxChars, 1000, 60000, DEFAULT_FOLDER_ACTION_DEFAULTS.fileSummaryMaxChars)
    });
  }

  function getFolderActionDefault(value, key) {
    const defaults = normalizeActionDefaults(value);
    return defaults[key] || defaults.folderContext;
  }

  function clampInteger(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < min) return fallback;
    return Math.max(min, Math.min(max, Math.floor(number)));
  }

  const api = { DEFAULT_FOLDER_ACTION_DEFAULTS, normalizeFolderScopeOptions, normalizeActionDefaults, getFolderActionDefault };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosActionDefaults = Object.freeze(api);
})();