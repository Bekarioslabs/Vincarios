(function() {
  'use strict';

  function createThemeController(options) {
    options = options || {};
    const api = options.api || {};
    const documentRef = options.document || (typeof document !== 'undefined' ? document : null);
    const matchMediaFn = options.matchMedia || (typeof window !== 'undefined' ? window.matchMedia.bind(window) : null);
    const theme = options.theme || getThemeContract();
    const themePacks = options.themePacks || getThemePackRegistry();
    const mediaQuery = typeof matchMediaFn === 'function' ? matchMediaFn('(prefers-color-scheme: dark)') : null;
    let appTheme = 'dark';
    let vaultOverride = 'inherit';
    let vaultThemePackId = normalizeThemePackId();
    let appliedTokenNames = [];
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
      return setVaultAppearance({ themeOverride: value, themePackId: vaultThemePackId });
    }

    function setVaultAppearance(value) {
      const appearance = value && typeof value === 'object' ? value : {};
      vaultOverride = normalizeVaultThemeOverride(appearance.themeOverride);
      vaultThemePackId = normalizeThemePackId(appearance.themePackId);
      return apply();
    }

    function snapshot() {
      return Object.freeze({
        appTheme,
        vaultOverride,
        vaultThemePackId,
        effectiveTheme: resolveEffectiveTheme()
      });
    }

    function apply() {
      const root = documentRef && documentRef.documentElement;
      const pack = getActivePack();
      if (root && root.dataset) {
        root.dataset.theme = resolveEffectiveTheme();
        root.dataset.themePack = pack ? pack.id : normalizeThemePackId();
      }
      applyPackOverrides(root, pack);
      return snapshot();
    }

    function resolveEffectiveTheme() {
      const pack = getActivePack();
      if (pack) return pack.baseTheme;
      const systemIsDark = mediaQuery ? mediaQuery.matches === true : false;
      return theme && typeof theme.resolveEffectiveTheme === 'function'
        ? theme.resolveEffectiveTheme(appTheme, vaultOverride, systemIsDark)
        : (vaultOverride !== 'inherit' ? vaultOverride : appTheme === 'light' ? 'light' : 'dark');
    }

    function getActivePack() {
      return themePacks && typeof themePacks.getBuiltInThemePack === 'function'
        ? themePacks.getBuiltInThemePack(vaultThemePackId)
        : null;
    }

    function applyPackOverrides(root, pack) {
      if (!root || !root.style || typeof root.style.setProperty !== 'function') return;
      appliedTokenNames.forEach((name) => root.style.removeProperty(name));
      appliedTokenNames = [];
      if (!pack || !pack.tokens) return;
      Object.keys(pack.tokens).forEach((name) => {
        root.style.setProperty(name, pack.tokens[name]);
        appliedTokenNames.push(name);
      });
    }

    function normalizeAppTheme(value) {
      return theme && typeof theme.normalizeAppTheme === 'function' ? theme.normalizeAppTheme(value) : 'dark';
    }

    function normalizeVaultThemeOverride(value) {
      return theme && typeof theme.normalizeVaultThemeOverride === 'function' ? theme.normalizeVaultThemeOverride(value) : 'inherit';
    }

    function normalizeThemePackId(value) {
      return themePacks && typeof themePacks.normalizeThemePackId === 'function'
        ? themePacks.normalizeThemePackId(value)
        : 'default';
    }

    function subscribeToSystemChanges() {
      if (!mediaQuery || systemListenerAttached || typeof mediaQuery.addEventListener !== 'function') return;
      mediaQuery.addEventListener('change', () => apply());
      systemListenerAttached = true;
    }

    return Object.freeze({ load, setAppTheme, setVaultOverride, setVaultAppearance, snapshot });
  }

  function getThemeContract() {
    if (typeof window !== 'undefined' && window.VincariosTheme) return window.VincariosTheme;
    if (typeof module !== 'undefined' && module.exports) return require('../../shared/settings/theme');
    return null;
  }

  function getThemePackRegistry() {
    if (typeof window !== 'undefined' && window.VincariosThemePacks) return window.VincariosThemePacks;
    if (typeof module !== 'undefined' && module.exports) return require('../../shared/themes/themePacks');
    return null;
  }

  const api = { createThemeController };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosThemeController = Object.freeze(api);
})();