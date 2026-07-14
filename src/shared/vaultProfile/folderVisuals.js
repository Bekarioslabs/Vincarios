(function() {
  'use strict';

  const FOLDER_VISUAL_ICON_KEYS = Object.freeze([
    'folder', 'inbox', 'calendar', 'briefcase', 'book',
    'brain', 'archive', 'star', 'compass', 'layers'
  ]);
  const FOLDER_VISUAL_COLOR_KEYS = Object.freeze([
    'blue-200', 'blue-300', 'blue-400', 'blue-500', 'blue-600',
    'green-200', 'green-300', 'green-400', 'green-500', 'green-600',
    'red-200', 'red-300', 'red-400', 'red-500', 'red-600',
    'amber-200', 'amber-300', 'amber-400', 'amber-500', 'amber-600',
    'violet-200', 'violet-300', 'violet-400', 'violet-500', 'violet-600',
    'orange-200', 'orange-300', 'orange-400', 'orange-500', 'orange-600'
  ]);
  const CUSTOM_ICON_PREFIX = '.vitruvios/icons/';

  const DEFAULT_FOLDER_ROLE_VISUALS = Object.freeze({
    inbox: Object.freeze(createBuiltinVisual('inbox', 'amber-400')),
    daily: Object.freeze(createBuiltinVisual('calendar', 'blue-400')),
    projects: Object.freeze(createBuiltinVisual('briefcase', 'violet-400')),
    knowledge: Object.freeze(createBuiltinVisual('book', 'green-400')),
    brain: Object.freeze(createBuiltinVisual('brain', 'orange-400')),
    archive: Object.freeze(createBuiltinVisual('archive', 'red-400'))
  });

  const LEGACY_COLOR_IDS = Object.freeze({
    amber: 'amber-400', green: 'green-400', sky: 'blue-400',
    violet: 'violet-400', orange: 'orange-400', red: 'red-400'
  });
  const LEGACY_HEX_COLORS = Object.freeze({ '#7C3AED': 'violet-600' });
  const iconKeySet = new Set(FOLDER_VISUAL_ICON_KEYS);
  const colorKeySet = new Set(FOLDER_VISUAL_COLOR_KEYS);

  function normalizeRoleVisuals(input) {
    const source = input && typeof input === 'object' ? input : {};
    return Object.keys(DEFAULT_FOLDER_ROLE_VISUALS).reduce((result, role) => {
      const visual = normalizeFolderVisual(source[role]);
      if (visual) result[role] = visual;
      return result;
    }, {});
  }

  function getRoleVisual(role, roleVisuals) {
    const normalizedRole = String(role || '').trim();
    const override = normalizeRoleVisuals(roleVisuals)[normalizedRole];
    const fallback = DEFAULT_FOLDER_ROLE_VISUALS[normalizedRole];
    const visual = cloneVisual(override || fallback);
    const raw = roleVisuals && roleVisuals[normalizedRole];
    if (visual && visual.icon.kind === 'custom' && raw && raw.icon && typeof raw.icon.src === 'string' && raw.icon.src.startsWith('data:image/svg+xml;base64,')) {
      visual.icon.src = raw.icon.src;
    }
    return visual;
  }

  function normalizeTopLevelFolderVisuals(input) {
    const source = input && typeof input === 'object' ? input : {};
    return Object.keys(source).reduce((result, folderPath) => {
      const normalizedPath = normalizeTopLevelPath(folderPath);
      const visual = normalizeFolderVisual(source[folderPath]);
      if (normalizedPath && visual) result[normalizedPath] = visual;
      return result;
    }, {});
  }

  function resolveTopLevelFolderVisual(path, visuals) {
    const normalizedPath = normalizeTopLevelPath(path);
    return normalizedPath ? cloneVisual(normalizeTopLevelFolderVisuals(visuals)[normalizedPath]) : null;
  }

  function normalizeFolderVisual(value) {
    if (!value || typeof value !== 'object') return null;
    const icon = normalizeIcon(value.icon);
    const color = normalizeColor(value.color);
    return icon && color ? { icon, color } : null;
  }

  function normalizeIcon(value) {
    if (typeof value === 'string' && iconKeySet.has(value)) return { kind: 'builtin', id: value };
    if (!value || typeof value !== 'object') return null;
    if (value.kind === 'builtin' && iconKeySet.has(String(value.id || '').trim())) return { kind: 'builtin', id: String(value.id).trim() };
    if (value.kind === 'custom') {
      const iconPath = normalizeCustomIconPath(value.path);
      return iconPath ? { kind: 'custom', path: iconPath } : null;
    }
    return null;
  }

  function normalizeColor(value) {
    if (typeof value === 'string') return normalizeColorId(value);
    if (!value || typeof value !== 'object') return null;
    if (value.kind === 'token') return normalizeColorId(value.id);
    if (value.kind === 'custom') return normalizeLegacyHexColor(value.value);
    return null;
  }

  function normalizeColorId(value) {
    const id = String(value || '').trim();
    const normalized = LEGACY_COLOR_IDS[id] || id;
    return colorKeySet.has(normalized) ? { kind: 'token', id: normalized } : null;
  }

  function normalizeLegacyHexColor(value) {
    const id = LEGACY_HEX_COLORS[String(value || '').trim().toUpperCase()];
    return id ? { kind: 'token', id } : null;
  }

  function normalizeTopLevelPath(value) {
    const normalized = String(value || '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    return normalized && !normalized.includes('/') ? normalized : '';
  }

  function normalizeCustomIconPath(value) {
    const normalized = String(value || '').trim().replace(/\\/g, '/').replace(/^\/+/, '');
    return normalized.startsWith(CUSTOM_ICON_PREFIX) && !normalized.includes('..') && /\.svg$/i.test(normalized) ? normalized : '';
  }

  function createBuiltinVisual(icon, color) {
    return { icon: { kind: 'builtin', id: icon }, color: { kind: 'token', id: color } };
  }

  function cloneVisual(visual) {
    if (!visual) return null;
    const result = { icon: Object.assign({}, visual.icon), color: Object.assign({}, visual.color) };
    if (visual.icon && visual.icon.src) result.icon.src = visual.icon.src;
    return result;
  }

  function getVisualIconId(visual) {
    return visual && visual.icon && visual.icon.kind === 'builtin' ? visual.icon.id : 'folder';
  }

  function getVisualColorToken(visual) {
    return visual && visual.color && visual.color.kind === 'token' ? visual.color.id : '';
  }

  const api = {
    FOLDER_VISUAL_ICON_KEYS,
    FOLDER_VISUAL_COLOR_KEYS,
    CUSTOM_ICON_PREFIX,
    DEFAULT_FOLDER_ROLE_VISUALS,
    getRoleVisual,
    getVisualIconId,
    getVisualColorToken,
    normalizeFolderVisual,
    normalizeRoleVisuals,
    normalizeTopLevelFolderVisuals,
    resolveTopLevelFolderVisual
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosFolderVisuals = Object.freeze(api);
})();