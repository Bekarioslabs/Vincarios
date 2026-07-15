(function() {
  'use strict';

  function createThemeController(options) {
    options = options || {};
    const api = options.api || {};
    const documentRef = options.document || (typeof document !== 'undefined' ? document : null);
    const matchMediaFn = options.matchMedia || (typeof window !== 'undefined' ? window.matchMedia.bind(window) : null);
    const theme = options.theme || getThemeContract();
    const mediaQuery = typeof matchMediaFn === 'function' ? matchMediaFn('(prefers-color-scheme: dark)') : null;
    let appTheme = 'dark';
    let vaultOverride = 'inherit';
    let systemListenerAttached = false;

    async function load() {
      let settings = null;
      if (api.settings && typeof api.settings.get === 'function') {
        try {
          settings = await api.settings.get();
        } catch (error) {
          settings = null;
        }
      }
      appTheme = normalizeAppTheme(settings && settings.theme && settings.theme.mode);
      subscribeToSystemChanges();
      return apply();
    }

    function setAppTheme(value) {
      appTheme = normalizeAppTheme(value && typeof value === 'object' ? value.mode : value);
      return apply();
    }

    function setVaultOverride(value) {
      vaultOverride = normalizeVaultThemeOverride(value);
      return apply();
    }

    function snapshot() {
      return Object.freeze({ appTheme, vaultOverride, effectiveTheme: resolveEffectiveTheme() });
    }

    function apply() {
      const root = documentRef && documentRef.documentElement;
      if (root && root.dataset) root.dataset.theme = resolveEffectiveTheme();
      return snapshot();
    }

    function resolveEffectiveTheme() {
      const systemIsDark = mediaQuery ? mediaQuery.matches === true : false;
      return theme && typeof theme.resolveEffectiveTheme === 'function'
        ? theme.resolveEffectiveTheme(appTheme, vaultOverride, systemIsDark)
        : (vaultOverride !== 'inherit' ? vaultOverride : appTheme === 'light' ? 'light' : 'dark');
    }

    function normalizeAppTheme(value) {
      return theme && typeof theme.normalizeAppTheme === 'function' ? theme.normalizeAppTheme(value) : 'dark';
    }

    function normalizeVaultThemeOverride(value) {
      return theme && typeof theme.normalizeVaultThemeOverride === 'function' ? theme.normalizeVaultThemeOverride(value) : 'inherit';
    }

    function subscribeToSystemChanges() {
      if (!mediaQuery || systemListenerAttached || typeof mediaQuery.addEventListener !== 'function') return;
      mediaQuery.addEventListener('change', () => apply());
      systemListenerAttached = true;
    }

    return Object.freeze({ load, setAppTheme, setVaultOverride, snapshot });
  }

  function getThemeContract() {
    if (typeof window !== 'undefined' && window.VitruviosTheme) return window.VitruviosTheme;
    if (typeof module !== 'undefined' && module.exports) return require('../../shared/settings/theme');
    return null;
  }

  const api = { createThemeController };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosThemeController = Object.freeze(api);
})();