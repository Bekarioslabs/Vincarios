(function() {
  'use strict';

  function normalizePermissionPath(path) {
    return String(path || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  }

  async function collectRecursivePermissionPaths(rootPath, listFolder) {
    const root = normalizePermissionPath(rootPath);
    const paths = [];
    const seen = new Set();

    function add(path) {
      const normalized = normalizePermissionPath(path);
      if (seen.has(normalized)) return;
      seen.add(normalized);
      paths.push(normalized);
    }

    async function visitFolder(folderPath) {
      const result = await listFolder(folderPath);
      if (!result || !result.ok) return;

      const entries = Array.isArray(result.entries) ? result.entries : [];
      for (const entry of entries) {
        if (!entry || !entry.path) continue;
        add(entry.path);
        if (entry.kind === 'folder') await visitFolder(entry.path);
      }
    }

    add(root);
    await visitFolder(root);
    return paths;
  }

  const api = { collectRecursivePermissionPaths };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.VitruviosPermissionPathCollector = api;
  }
})();
