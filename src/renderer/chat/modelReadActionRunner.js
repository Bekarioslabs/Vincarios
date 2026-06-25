(function() {
  'use strict';

  async function runModelReadActions(options) {
    options = options || {};
    const api = options.api;
    const parser = resolveParser(options);
    if (!parser) {
      return {
        handled: false,
        visibleText: String(options.content || ''),
        messages: []
      };
    }

    const calls = parser.parseModelActionCalls(options.content || '');
    const readCalls = calls.filter((call) => call.type === 'list_folder');

    if (readCalls.length === 0) {
      return {
        handled: false,
        visibleText: parser.stripModelActionCalls(options.content || ''),
        messages: []
      };
    }

    const selection = options.selection || null;
    const messages = [];
    const visibleText = parser.stripModelActionCalls(options.content || '');

    for (const call of readCalls) {
      if (!call.path) {
        messages.push('Read action blocked: no folder path was provided.');
        continue;
      }
      if (!isPathInsideActiveSelection(call.path, selection)) {
        messages.push('Read action blocked: select the requested folder in Files first, then try again.');
        continue;
      }
      if (!api || !api.vault || typeof api.vault.listFolder !== 'function') {
        messages.push('Read action failed: vault API unavailable.');
        continue;
      }

      const result = await api.vault.listFolder(call.path);
      messages.push(formatFolderListing(call.path, result));
    }

    return {
      handled: true,
      visibleText,
      messages
    };
  }

  function formatFolderListing(folderPath, result) {
    if (!result || !result.ok) {
      return 'Folder listing failed: ' + ((result && (result.message || result.code)) || 'Unknown error.');
    }

    const entries = Array.isArray(result.entries) ? result.entries : [];
    if (entries.length === 0) {
      return 'Folder listed: ' + folderPath + '\n\nNo supported Markdown folders or files found.';
    }

    const lines = entries.map((entry) => {
      const suffix = entry.kind === 'folder' ? '/' : '';
      return '- ' + (entry.name || entry.path || 'Unnamed') + suffix;
    });
    return 'Folder listed: ' + folderPath + '\n\n' + lines.join('\n');
  }

  function isPathInsideActiveSelection(actionPath, selection) {
    const parser = getParser();
    const normalize = parser && typeof parser.normalizePathLike === 'function' ? parser.normalizePathLike : normalizePathLike;
    const path = normalize(actionPath);
    const selectedPath = normalize(selection && selection.path);
    if (!path || !selectedPath) return false;

    if (selection.kind === 'folder') {
      return path === selectedPath || path.startsWith(selectedPath + '/');
    }

    if (selection.kind === 'file') {
      const parent = getParentFolder(selectedPath);
      return path === parent;
    }

    return false;
  }

  function getParentFolder(filePath) {
    const value = String(filePath || '');
    const index = value.lastIndexOf('/');
    return index > -1 ? value.slice(0, index) : '';
  }

  function resolveParser(options) {
    if (Object.prototype.hasOwnProperty.call(options || {}, 'parser')) return options.parser;
    return getParser();
  }

  function getParser() {
    if (typeof window !== 'undefined' && window.ZeusModelActionParser) return window.ZeusModelActionParser;
    if (typeof window !== 'undefined' && typeof require !== 'function') return null;
    if (typeof require === 'function') {
      try {
        return require('../../shared/actions/modelActionParser');
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  function normalizePathLike(value) {
    return String(value || '')
      .trim()
      .replace(/^['"]|['"]$/g, '')
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, '')
      .replace(/\/+/g, '/');
  }

  const api = {
    runModelReadActions,
    formatFolderListing,
    isPathInsideActiveSelection
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusModelReadActionRunner = Object.freeze(api);
})();