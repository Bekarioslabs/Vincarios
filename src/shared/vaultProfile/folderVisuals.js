(function() {
  'use strict';

  const FOLDER_VISUAL_ICON_KEYS = Object.freeze([
    'folder', 'inbox', 'calendar', 'briefcase', 'book',
    'brain', 'archive', 'star', 'compass', 'layers'
  ]);

  const FOLDER_VISUAL_COLOR_KEYS = Object.freeze([
    'amber', 'green', 'sky', 'violet', 'orange', 'red'
  ]);

  const DEFAULT_TOP_LEVEL_FOLDER_VISUALS = Object.freeze({
    '00_Inbox': Object.freeze({ icon: 'inbox', color: 'amber' }),
    '01_Daily': Object.freeze({ icon: 'calendar', color: 'sky' }),
    '02_Projects': Object.freeze({ icon: 'briefcase', color: 'violet' }),
    '03_Knowledge': Object.freeze({ icon: 'book', color: 'green' }),
    '90_AI_Brain': Object.freeze({ icon: 'brain', color: 'orange' }),
    '99_Archive': Object.freeze({ icon: 'archive', color: 'red' })
  });

  const iconKeySet = new Set(FOLDER_VISUAL_ICON_KEYS);
  const colorKeySet = new Set(FOLDER_VISUAL_COLOR_KEYS);

  function normalizeTopLevelFolderVisuals(input) {
    const source = input && typeof input === 'object' ? input : {};

    return Object.keys(source).reduce((result, path) => {
      const normalizedPath = normalizeTopLevelPath(path);
      const visual = normalizeFolderVisual(source[path]);
      if (normalizedPath && visual) result[normalizedPath] = visual;
      return result;
    }, {});
  }

  function resolveTopLevelFolderVisual(path, visuals) {
    const normalizedPath = normalizeTopLevelPath(path);
    if (!normalizedPath) return null;

    const normalizedVisuals = normalizeTopLevelFolderVisuals(visuals);
    return normalizedVisuals[normalizedPath] || null;
  }

  function getDefaultTopLevelFolderVisual(path) {
    const normalizedPath = normalizeTopLevelPath(path);
    const visual = normalizedPath ? DEFAULT_TOP_LEVEL_FOLDER_VISUALS[normalizedPath] : null;
    return visual ? { icon: visual.icon, color: visual.color } : null;
  }

  function normalizeTopLevelPath(value) {
    const normalized = String(value || '')
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, '');

    return normalized && !normalized.includes('/') ? normalized : null;
  }

  function normalizeFolderVisual(value) {
    if (!value || typeof value !== 'object') return null;

    const icon = String(value.icon || '').trim();
    const color = String(value.color || '').trim();
    if (!iconKeySet.has(icon) || !colorKeySet.has(color)) return null;

    return { icon, color };
  }

  const api = {
    FOLDER_VISUAL_ICON_KEYS,
    FOLDER_VISUAL_COLOR_KEYS,
    DEFAULT_TOP_LEVEL_FOLDER_VISUALS,
    getDefaultTopLevelFolderVisual,
    normalizeTopLevelFolderVisuals,
    resolveTopLevelFolderVisual
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusFolderVisuals = Object.freeze(api);
})();
