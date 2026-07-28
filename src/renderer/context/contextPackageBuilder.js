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
      'These context items were explicitly added by the user through vincarios UI. Plain file-tree selection is not context.',
      '',
      normalizedItems.map((item, index) => renderContextItem(item, index + 1, maxChars)).join('\n')
    ]);
  }

  function renderContextItem(item, index, maxChars) {
    if (item.kind === 'folder_snapshot') return renderFolderSnapshot(item, index);
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

  function renderFolderSnapshot(item, index) {
    const scope = item.scope || {};
    const limits = item.effectiveLimits || {};
    const files = Array.isArray(item.files) ? item.files : [];
    const scopeLabel = scope.scope === 'subfolders'
      ? 'subfolders (maximum depth: ' + String(scope.maxDepth || 1) + ')'
      : 'current folder only';
    const lines = [
      '### Context Item ' + index,
      '',
      'Selected type: folder Markdown snapshot',
      'Path: ' + item.path,
      'Scope: ' + scopeLabel,
      'Effective limits: Markdown only; up to ' + String(limits.maxFiles || scope.maxFiles || files.length) + ' notes; up to ' + String(limits.maxTotalChars || 0) + ' total characters.',
      'Included Markdown notes: ' + String(files.length),
      item.truncated ? 'Status: snapshot truncated by its configured scope or character limit.' : 'Status: full snapshot within configured limits.',
      ''
    ];
    files.forEach((file) => {
      lines.push('#### Included note', 'Path: ' + file.path, file.truncated ? 'Status: content truncated by the total snapshot character limit.' : 'Status: full included note content.', '', '```md', file.content, '```', '');
    });
    return lines.join('\n');
  }

  function normalizeContextItem(item) {
    if (!item) return null;
    const kind = item.kind === 'folder_snapshot' ? 'folder_snapshot' : item.kind === 'folder' ? 'folder' : 'file';
    const path = normalizeContextPath(item.path || '');
    if (!path) return null;
    const normalized = {
      kind,
      path,
      content: typeof item.content === 'string' ? item.content : ''
    };
    if (kind === 'folder_snapshot') {
      normalized.scope = normalizeSnapshotScope(item.scope);
      normalized.effectiveLimits = normalizeSnapshotLimits(item.effectiveLimits);
      normalized.files = normalizeSnapshotFiles(item.files);
      normalized.truncated = item.truncated === true;
    }
    return normalized;
  }

  function normalizeSnapshotScope(scope) {
    scope = scope || {};
    return {
      scope: scope.scope === 'subfolders' ? 'subfolders' : 'current',
      maxDepth: positiveIntegerOrZero(scope.maxDepth),
      maxFiles: positiveIntegerOrZero(scope.maxFiles)
    };
  }

  function normalizeSnapshotLimits(limits) {
    limits = limits || {};
    return {
      maxFiles: positiveIntegerOrZero(limits.maxFiles),
      maxTotalChars: positiveIntegerOrZero(limits.maxTotalChars)
    };
  }

  function normalizeSnapshotFiles(files) {
    return (Array.isArray(files) ? files : []).map((file) => {
      const path = normalizeContextPath(file && file.path);
      if (!path) return null;
      return { path, content: file && typeof file.content === 'string' ? file.content.replace(/\r\n?/g, '\n') : '', truncated: file && file.truncated === true };
    }).filter(Boolean);
  }

  function positiveIntegerOrZero(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
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
    if (typeof window !== 'undefined' && window.VincariosContextLimits) return window.VincariosContextLimits;
    if (typeof module !== 'undefined' && module.exports) return require('./contextLimits');
    throw new Error('vincarios context limits API is not available.');
  }

  function getStateApi() {
    if (typeof window !== 'undefined' && window.VincariosContextState) return window.VincariosContextState;
    if (typeof module !== 'undefined' && module.exports) return require('./contextState');
    return null;
  }

  const api = {
    buildChatContextPackage,
    parentFolderOf
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosContextPackageBuilder = Object.freeze(api);
})();
