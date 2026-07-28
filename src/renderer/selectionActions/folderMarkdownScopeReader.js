(function() {
  'use strict';

  async function listScopedMarkdownFiles(input) {
    input = input || {};
    const vaultApi = input.vaultApi;
    const path = normalizePath(input.path);
    if (!vaultApi) return failure('vault_api_unavailable', 'Folder scope failed: vault API unavailable.');
    if (!path) return failure('path_required', 'Select a folder first.');

    const scope = getScopeOptions().normalizeFolderScopeOptions(input.scopeOptions || {});
    if (scope.scope !== 'subfolders') {
      if (typeof vaultApi.listFolder !== 'function') return failure('vault_api_unavailable', 'Folder scope failed: vault API unavailable.');
      return listCurrentFolderMarkdown(vaultApi, path, scope.maxFiles);
    }

    const controller = input.folderController || getFolderController();
    if (!controller || typeof controller.listFolderTree !== 'function') return failure('folder_controller_unavailable', 'Folder scope failed: folder controller unavailable.');
    const result = await controller.listFolderTree(vaultApi, {
      kind: 'folder',
      path,
      readAllowed: true,
      recursive: true,
      maxDepth: scope.maxDepth,
      limits: Object.assign({}, input.limits || {}, { maxListedFiles: scope.maxFiles })
    });
    if (!result || result.ok !== true) return failure('list_failed', 'Folder scope failed: could not inspect folder tree.');
    const markdown = [];
    (Array.isArray(result.folders) ? result.folders : []).forEach((folder) => {
      if (!folder || folder.ok === false) return;
      filterMarkdownEntries(folder.entries).forEach((entry) => markdown.push(normalizePath(entry.path)));
    });
    return {
      ok: true,
      files: markdown.slice(0, scope.maxFiles),
      fileLimitReached: result.fileLimitReached === true || markdown.length > scope.maxFiles,
      depthLimitReached: result.depthLimitReached === true,
      folderLimitReached: result.truncated === true
    };
  }

  async function listCurrentFolderMarkdown(vaultApi, path, maxFiles) {
    const result = await vaultApi.listFolder(path);
    if (!result || result.ok !== true) return failure('list_failed', 'Folder scope failed: ' + String((result && (result.message || result.code)) || 'Could not list folder.'));
    const markdown = filterMarkdownEntries(result.entries).map((entry) => normalizePath(entry.path)).filter(Boolean);
    return {
      ok: true,
      files: markdown.slice(0, maxFiles),
      fileLimitReached: markdown.length > maxFiles,
      depthLimitReached: false,
      folderLimitReached: false
    };
  }

  function filterMarkdownEntries(entries) {
    return (Array.isArray(entries) ? entries : []).filter((entry) => entry && (entry.kind === 'markdown' || /\.(md|markdown)$/i.test(String(entry.path || entry.name || ''))));
  }

  function normalizePath(value) {
    return getVaultPathApi().normalizeRelativePath(value);
  }

  function getVaultPathApi() {
    if (typeof window !== 'undefined' && window.VincariosVaultPath) return window.VincariosVaultPath;
    if (typeof require === 'function') return require('../path/vaultPath');
    throw new Error('Vault path contract unavailable.');
  }

  function failure(code, message) {
    return { ok: false, code, message };
  }

  function getScopeOptions() {
    if (typeof window !== 'undefined' && window.VincariosFolderScopeOptions) return window.VincariosFolderScopeOptions;
    if (typeof module !== 'undefined' && module.exports) return require('./folderScopeOptions');
    throw new Error('vincarios folder scope options API is not available.');
  }

  function getFolderController() {
    if (typeof window !== 'undefined' && window.VincariosFolderContextController) return window.VincariosFolderContextController;
    if (typeof module !== 'undefined' && module.exports) return require('../context/folderContextController');
    return null;
  }

  const api = { listScopedMarkdownFiles };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosFolderMarkdownScopeReader = Object.freeze(api);
})();