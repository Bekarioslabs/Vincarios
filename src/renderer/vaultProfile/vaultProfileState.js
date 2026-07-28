(function() {
  'use strict';

  function createVaultProfileState(options) {
    options = options || {};
    const api = options.api || null;
    const helpers = options.helpers || getFolderVisualHelpers();
    const theme = options.theme || getThemeHelpers();
    const themePacks = options.themePacks || getThemePackHelpers();
    const listeners = new Set();
    let profile = { roles: {}, appearance: { themeOverride: 'inherit' }, roleVisuals: {} };

    async function load() {
      if (!api || !api.vault || typeof api.vault.getProfile !== 'function') return snapshot();
      const result = await api.vault.getProfile();
      if (result && result.ok) replace(result.profile);
      return snapshot();
    }

    function replace(nextProfile) {
      profile = normalizeProfile(nextProfile);
      notify();
      return snapshot();
    }

    function getFolderVisual(path) {
      const normalizedPath = normalizeTopLevelPath(path);
      if (!normalizedPath || !helpers) return null;
      const role = Object.keys(profile.roles).find((roleId) => profile.roles[roleId] === normalizedPath);
      return role && typeof helpers.getRoleVisual === 'function'
        ? helpers.getRoleVisual(role, profile.roleVisuals)
        : null;
    }

    function getProfile() {
      return snapshot().profile;
    }

    function getThemeOverride() {
      return profile.appearance.themeOverride;
    }

    function getThemeAppearance() {
      return Object.freeze(Object.assign({}, profile.appearance));
    }

    function snapshot() {
      return Object.freeze({
        profile: Object.freeze({
          roles: Object.freeze(Object.assign({}, profile.roles)),
          appearance: Object.freeze(Object.assign({}, profile.appearance)),
          roleVisuals: Object.freeze(Object.assign({}, profile.roleVisuals))
        })
      });
    }

    function subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    }

    function notify() {
      const state = snapshot();
      listeners.forEach((listener) => listener(state));
    }

    function normalizeProfile(value) {
      const input = value || {};
      const roles = {};
      Object.keys(input.roles || {}).forEach((role) => {
        const path = normalizeTopLevelPath(input.roles[role]);
        if (path) roles[role] = path;
      });
      return {
        roles,
        appearance: normalizeAppearance(input.appearance),
        roleVisuals: preserveCustomIconSources(
          helpers && typeof helpers.normalizeRoleVisuals === 'function'
            ? helpers.normalizeRoleVisuals(input.roleVisuals)
            : {},
          input.roleVisuals
        )
      };
    }

    function normalizeAppearance(value) {
      const fallback = 'inherit';
      return {
        themeOverride: theme && typeof theme.normalizeVaultThemeOverride === 'function'
          ? theme.normalizeVaultThemeOverride(value && value.themeOverride)
          : fallback,
        themePackId: themePacks && typeof themePacks.normalizeThemePackId === 'function'
          ? themePacks.normalizeThemePackId(value && value.themePackId)
          : 'default'
      };
    }
    function preserveCustomIconSources(normalizedVisuals, sourceVisuals) {
      const result = Object.assign({}, normalizedVisuals || {});
      Object.keys(result).forEach((roleId) => {
        const sourceIcon = sourceVisuals && sourceVisuals[roleId] && sourceVisuals[roleId].icon;
        if (!sourceIcon || sourceIcon.kind !== 'custom' || typeof sourceIcon.src !== 'string') return;
        if (!sourceIcon.src.startsWith('data:image/svg+xml;base64,')) return;
        if (!result[roleId] || !result[roleId].icon || result[roleId].icon.kind !== 'custom') return;
        if (result[roleId].icon.path !== sourceIcon.path) return;
        result[roleId] = Object.assign({}, result[roleId], {
          icon: Object.assign({}, result[roleId].icon, { src: sourceIcon.src })
        });
      });
      return result;
    }

    return Object.freeze({ load, replace, getFolderVisual, getProfile, getThemeOverride, getThemeAppearance, snapshot, subscribe });
  }

  function normalizeTopLevelPath(value) {
    const path = String(value || '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    return path && !path.includes('/') ? path : '';
  }

  function getThemePackHelpers() {
    if (typeof window !== 'undefined' && window.VincariosThemePacks) return window.VincariosThemePacks;
    if (typeof module !== 'undefined' && module.exports) return require('../../shared/themes/themePacks');
    return null;
  }
  function getThemeHelpers() {
    if (typeof window !== 'undefined' && window.VincariosTheme) return window.VincariosTheme;
    if (typeof module !== 'undefined' && module.exports) return require('../../shared/settings/theme');
    return null;
  }
  function getFolderVisualHelpers() {
    if (typeof window !== 'undefined' && window.VincariosFolderVisuals) return window.VincariosFolderVisuals;
    if (typeof module !== 'undefined' && module.exports) return require('../../shared/vaultProfile/folderVisuals');
    return null;
  }

  const api = { createVaultProfileState };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosVaultProfileState = Object.freeze(api);
})();
