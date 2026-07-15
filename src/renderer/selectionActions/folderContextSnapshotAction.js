(function() {
  'use strict';

  async function buildFolderContextSnapshot(input) {
    input = input || {};
    const vaultApi = input.vaultApi;
    const path = normalizePath(input.path);
    if (!vaultApi || typeof vaultApi.listFolder !== 'function' || typeof vaultApi.readMarkdown !== 'function') {
      return failure('vault_api_unavailable', 'Folder context failed: vault API unavailable.');
    }
    if (!path) return failure('path_required', 'Select a folder before adding context.');

    const scope = getScopeOptions().normalizeFolderScopeOptions(input.scopeOptions || {});
    const limits = getLimitsApi().normalizeContextLimits(input.limits || {});
    const listed = await listMarkdownFiles({ vaultApi, folderController: input.folderController, path, scope, limits });
    if (!listed.ok) return listed;
    if (!listed.files.length) return failure('no_markdown_files', 'No Markdown notes found in the selected folder scope.');

    const files = [];
    let totalChars = 0;
    let totalLimitReached = false;
    for (const filePath of listed.files) {
      if (totalChars >= limits.maxSelectedFileChars) {
        totalLimitReached = true;
        break;
      }
      const read = await vaultApi.readMarkdown(filePath);
      if (!read || read.ok !== true || typeof read.content !== 'string') continue;
      const remaining = limits.maxSelectedFileChars - totalChars;
      const content = normalizeContent(read.content);
      const truncated = content.length > remaining;
      files.push({ path: normalizePath(read.path || filePath), content: truncated ? content.slice(0, remaining) : content, truncated });
      totalChars += Math.min(content.length, remaining);
      if (truncated) {
        totalLimitReached = true;
        break;
      }
    }

    if (!files.length) return failure('no_readable_markdown_files', 'No readable Markdown notes found in the selected folder scope.');
    const truncated = listed.fileLimitReached || listed.depthLimitReached || listed.folderLimitReached || totalLimitReached;
    return {
      ok: true,
      item: {
        kind: 'folder_snapshot',
        path,
        source: 'folder_context_snapshot',
        scope,
        effectiveLimits: {
          maxDepth: scope.maxDepth,
          maxFiles: scope.maxFiles,
          maxTotalChars: limits.maxSelectedFileChars
        },
        files,
        totalChars,
        truncated,
        truncation: {
          fileLimitReached: listed.fileLimitReached,
          depthLimitReached: listed.depthLimitReached,
          folderLimitReached: listed.folderLimitReached,
          totalLimitReached
        }
      }
    };
  }

  function listMarkdownFiles(input) {
    return getMarkdownScopeReader().listScopedMarkdownFiles(input);
  }

  function normalizeContent(value) {
    return String(value || '').replace(/\r\n?/g, '\n');
  }

  function normalizePath(value) {
    return String(value || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/').trim();
  }

  function failure(code, message) {
    return { ok: false, code, message };
  }

  function getScopeOptions() {
    if (typeof window !== 'undefined' && window.VitruviosFolderScopeOptions) return window.VitruviosFolderScopeOptions;
    if (typeof module !== 'undefined' && module.exports) return require('./folderScopeOptions');
    throw new Error('vitruvios folder scope options API is not available.');
  }

  function getMarkdownScopeReader() {
    if (typeof window !== 'undefined' && window.VitruviosFolderMarkdownScopeReader) return window.VitruviosFolderMarkdownScopeReader;
    if (typeof module !== 'undefined' && module.exports) return require('./folderMarkdownScopeReader');
    throw new Error('vitruvios folder Markdown scope reader is not available.');
  }
  function getLimitsApi() {
    if (typeof window !== 'undefined' && window.VitruviosContextLimits) return window.VitruviosContextLimits;
    if (typeof module !== 'undefined' && module.exports) return require('../context/contextLimits');
    throw new Error('vitruvios context limits API is not available.');
  }

  function getFolderController() {
    if (typeof window !== 'undefined' && window.VitruviosFolderContextController) return window.VitruviosFolderContextController;
    if (typeof module !== 'undefined' && module.exports) return require('../context/folderContextController');
    return null;
  }

  const api = { buildFolderContextSnapshot, listMarkdownFiles };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosFolderContextSnapshotAction = Object.freeze(api);
})();