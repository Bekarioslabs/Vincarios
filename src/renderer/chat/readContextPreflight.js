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

    const result = target.recursive === true
      ? await listFolderTree(api.vault, target)
      : await api.vault.listFolder(target.path);
    const message = target.recursive === true
      ? formatRecursiveFolderListing(target, result)
      : formatFolderListing(target, result);

    return {
      handled: true,
      message,
      historyContent: message
    };
  }

  function resolveReadTarget(selection, userText, intent) {
    const recursive = typeof intent.hasRecursiveFolderWorkSignal === 'function' && intent.hasRecursiveFolderWorkSignal(userText);

    if (selection.kind === 'folder' && intent.hasFolderWorkSignal(userText)) {
      return {
        kind: 'folder',
        path: normalizePath(selection.path),
        readAllowed: selection.readAllowed === true,
        selectionId: selection.selectionId || 0,
        recursive
      };
    }

    if (selection.kind === 'file' && intent.looksLikeFolderScopedRequest(userText)) {
      const parent = parentFolderOf(selection.path);
      if (!parent) return null;
      return {
        kind: 'folder',
        path: parent,
        readAllowed: selection.parentReadAllowed === true,
        selectionId: selection.selectionId || 0,
        recursive
      };
    }

    return null;
  }

  async function listFolderTree(vaultApi, target) {
    const maxFolders = Number.isFinite(target.maxFolders) ? target.maxFolders : 100;
    const queue = [target.path];
    const visited = new Set();
    const folders = [];

    while (queue.length > 0 && visited.size < maxFolders) {
      const folderPath = queue.shift();
      if (visited.has(folderPath)) continue;
      visited.add(folderPath);

      const result = await vaultApi.listFolder(folderPath);
      if (!result || !result.ok) {
        folders.push({ path: folderPath, ok: false, message: result && (result.message || result.code) || 'Unknown error.', entries: [] });
        continue;
      }

      const entries = Array.isArray(result.entries) ? result.entries : [];
      folders.push({ path: folderPath, ok: true, entries });
      entries.forEach((entry) => {
        if (entry && entry.kind === 'folder' && entry.path) queue.push(normalizePath(entry.path));
      });
    }

    return {
      ok: true,
      truncated: queue.length > 0,
      folders
    };
  }

  function formatRecursiveFolderListing(target, result) {
    if (!result || !result.ok) {
      return 'Recursive folder listing failed for current selection ' + target.selectionId + ': ' + ((result && (result.message || result.code)) || 'Unknown error.');
    }

    const lines = [
      'Recursive folder listing for current selection ' + target.selectionId + ': ' + target.path,
      '',
      'Only real folder-listing results are shown. Markdown file contents were not read.',
      ''
    ];

    result.folders.forEach((folder) => {
      lines.push('## ' + folder.path + '/');
      if (!folder.ok) {
        lines.push('- Listing failed: ' + folder.message);
        lines.push('');
        return;
      }

      if (!folder.entries.length) {
        lines.push('- No supported Markdown folders or files found.');
        lines.push('');
        return;
      }

      folder.entries.forEach((entry) => {
        const suffix = entry.kind === 'folder' ? '/' : '';
        lines.push('- ' + (entry.name || entry.path || 'Unnamed') + suffix);
      });
      lines.push('');
    });

    if (result.truncated) lines.push('[Listing stopped because the folder limit was reached.]');
    return lines.join('\n').trim();
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
    formatFolderListing,
    formatRecursiveFolderListing,
    listFolderTree
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusReadContextPreflight = Object.freeze(api);
})();