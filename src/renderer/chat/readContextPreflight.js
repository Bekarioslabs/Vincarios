(function() {
  'use strict';

  async function runReadContextPreflight(options) {
    options = options || {};
    const selection = options.selection || null;
    const userText = String(options.userText || '');
    const api = options.api;
    const intent = getIntentApi();
    if (!selection || !selection.path || !intent) return { handled: false };

    const target = resolveReadTarget(selection, userText, intent);
    if (!target) return { handled: false };

    if (target.readAllowed !== true) {
      return {
        handled: true,
        message: 'Please enable R for this folder before I list it: ' + target.path,
        historyContent: 'Read blocked for current selection ' + target.selectionId + ': ' + target.path
      };
    }

    if (!api || !api.vault || typeof api.vault.listFolder !== 'function') {
      return {
        handled: true,
        message: 'Folder listing failed: vault API unavailable.',
        historyContent: 'Folder listing failed for current selection ' + target.selectionId + ': vault API unavailable.'
      };
    }

    const result = await api.vault.listFolder(target.path);
    const message = formatFolderListing(target, result);
    return {
      handled: true,
      message,
      historyContent: message
    };
  }

  function resolveReadTarget(selection, userText, intent) {
    if (selection.kind === 'folder' && intent.hasFolderWorkSignal(userText)) {
      return {
        kind: 'folder',
        path: normalizePath(selection.path),
        readAllowed: selection.readAllowed === true,
        selectionId: selection.selectionId || 0
      };
    }

    if (selection.kind === 'file' && intent.looksLikeFolderScopedRequest(userText)) {
      const parent = parentFolderOf(selection.path);
      if (!parent) return null;
      return {
        kind: 'folder',
        path: parent,
        readAllowed: selection.parentReadAllowed === true,
        selectionId: selection.selectionId || 0
      };
    }

    return null;
  }

  function formatFolderListing(target, result) {
    if (!result || !result.ok) {
      return 'Folder listing failed for current selection ' + target.selectionId + ': ' + ((result && (result.message || result.code)) || 'Unknown error.');
    }

    const entries = Array.isArray(result.entries) ? result.entries : [];
    const header = 'Folder listed for current selection ' + target.selectionId + ': ' + target.path;
    if (entries.length === 0) return header + '\n\nNo supported Markdown folders or files found.';

    return header + '\n\n' + entries.map((entry) => {
      const suffix = entry.kind === 'folder' ? '/' : '';
      return '- ' + (entry.name || entry.path || 'Unnamed') + suffix;
    }).join('\n');
  }

  function parentFolderOf(filePath) {
    const normalized = normalizePath(filePath);
    const index = normalized.lastIndexOf('/');
    return index > -1 ? normalized.slice(0, index) : '';
  }

  function normalizePath(value) {
    return String(value || '')
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, '')
      .replace(/\/+/g, '/');
  }

  function getIntentApi() {
    if (typeof window !== 'undefined' && window.ZeusContextIntent) return window.ZeusContextIntent;
    if (typeof module !== 'undefined' && module.exports) return require('../context/contextIntent');
    return null;
  }

  const api = {
    runReadContextPreflight,
    resolveReadTarget,
    formatFolderListing
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusReadContextPreflight = Object.freeze(api);
})();