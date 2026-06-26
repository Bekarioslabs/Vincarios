(function() {
  'use strict';

  const DEFAULT_CONTEXT_LIMITS = Object.freeze({
    maxSelectedFileChars: 8000,
    maxListedFolders: 100,
    maxListedFiles: 500
  });

  function normalizeContextLimits(options) {
    options = options || {};
    return Object.freeze({
      maxSelectedFileChars: positiveIntegerOrDefault(options.maxSelectedFileChars, DEFAULT_CONTEXT_LIMITS.maxSelectedFileChars),
      maxListedFolders: positiveIntegerOrDefault(options.maxListedFolders, DEFAULT_CONTEXT_LIMITS.maxListedFolders),
      maxListedFiles: positiveIntegerOrDefault(options.maxListedFiles, DEFAULT_CONTEXT_LIMITS.maxListedFiles)
    });
  }

  function positiveIntegerOrDefault(value, fallback) {
    if (!Number.isFinite(value)) return fallback;
    const number = Math.floor(value);
    return number > 0 ? number : fallback;
  }

  const api = {
    DEFAULT_CONTEXT_LIMITS,
    normalizeContextLimits
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusContextLimits = Object.freeze(api);
})();
