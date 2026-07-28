(function() {
  'use strict';

  const APP_THEME_MODES = Object.freeze(['dark', 'light', 'system']);
  const VAULT_THEME_OVERRIDES = Object.freeze(['inherit', 'dark', 'light']);

  function normalizeAppTheme(value) {
    return APP_THEME_MODES.includes(value) ? value : 'dark';
  }

  function normalizeVaultThemeOverride(value) {
    return VAULT_THEME_OVERRIDES.includes(value) ? value : 'inherit';
  }

  function resolveEffectiveTheme(appTheme, vaultThemeOverride, systemIsDark) {
    const override = normalizeVaultThemeOverride(vaultThemeOverride);
    if (override !== 'inherit') return override;

    const theme = normalizeAppTheme(appTheme);
    if (theme === 'system') return systemIsDark ? 'dark' : 'light';
    return theme;
  }

  const api = Object.freeze({
    APP_THEME_MODES,
    VAULT_THEME_OVERRIDES,
    normalizeAppTheme,
    normalizeVaultThemeOverride,
    resolveEffectiveTheme
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosTheme = api;
})();