(function() {
  'use strict';

  function buildChatContextPackage(options) {
    options = options || {};
    const selection = options.selection || {};
    const items = Array.isArray(options.contextItems)
      ? options.contextItems
      : Array.isArray(selection.contextItems) ? selection.contextItems : [];
    const limits = getLimitsApi().normalizeContextLimits(options.limits || options);
    const maxChars = Number.isFinite(options.maxChars) ? options.maxChars : limits.maxSelectedFileChars;
    const normalizedItems = items.map(normalizeContextItem).filter(Boolean);

    if (!normalizedItems.length) return emptyContext();

    return context([
      '## Context Basket',
      '',
      'Context source: context_basket',
      'These context items were explicitly added by the user through ZEUS UI. Plain file-tree selection is not context.',
      '',
      normalizedItems.map((item, index) => renderContextItem(item, index + 1, maxChars)).join('\n')
    ]);
  }

  function renderContextItem(item, index, maxChars) {
    if (item.kind === 'folder') {
      return [
        '### Context Item ' + index,
        '',
        'Selected type: folder',
        'Path: ' + item.path,
        'Status: Folder contents are not included. Use a folder listing action to include current level or subfolders.',
        ''
      ].join('\n');
    }

    const rawContent = typeof item.content === 'string' ? item.content.replace(/\r\n?/g, '\n') : '';
    const truncated = rawContent.length > maxChars;
    const body = truncated
      ? rawContent.slice(0, maxChars) + '\n\n[...truncated: context item is longer than ' + maxChars + ' characters...]'
      : rawContent;

    return [
      '### Context Item ' + index,
      '',
      'Selected type: Markdown file',
      'Path: ' + item.path,
      truncated ? 'Status: content truncated.' : 'Status: full provided context content.',
      '',
      '```md',
      body,
      '```',
      ''
    ].join('\n');
  }

  function normalizeContextItem(item) {
    if (!item) return null;
    const kind = item.kind === 'folder' ? 'folder' : 'file';
    const path = normalizeContextPath(item.path || '');
    if (!path) return null;
    return {
      kind,
      path,
      content: typeof item.content === 'string' ? item.content : ''
    };
  }

  function parentFolderOf(path) {
    const normalized = normalizeContextPath(path);
    const index = normalized.lastIndexOf('/');
    return index > 0 ? normalized.slice(0, index) : '';
  }

  function normalizeContextPath(value) {
    const stateApi = getStateApi();
    if (stateApi && typeof stateApi.normalizeContextPath === 'function') return stateApi.normalizeContextPath(value);
    return String(value || '')
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, '')
      .trim();
  }

  function emptyContext() {
    return { shouldAttach: false, content: '' };
  }

  function context(lines) {
    return { shouldAttach: true, content: lines.filter((line) => line !== null && line !== undefined).join('\n') };
  }

  function getLimitsApi() {
    if (typeof window !== 'undefined' && window.ZeusContextLimits) return window.ZeusContextLimits;
    if (typeof module !== 'undefined' && module.exports) return require('./contextLimits');
    throw new Error('ZEUS context limits API is not available.');
  }

  function getStateApi() {
    if (typeof window !== 'undefined' && window.ZeusContextState) return window.ZeusContextState;
    if (typeof module !== 'undefined' && module.exports) return require('./contextState');
    return null;
  }

  const api = {
    buildChatContextPackage,
    parentFolderOf
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusContextPackageBuilder = Object.freeze(api);
})();
