(function() {
  'use strict';

  const DEFAULT_THEME_PACK_ID = 'default';
  const PACKS = Object.freeze([
    Object.freeze({
      id: 'high-contrast',
      label: 'High Contrast',
      baseTheme: 'dark',
      tokens: Object.freeze({
        '--background-primary': '#000000',
        '--background-secondary': '#080b0d',
        '--background-tertiary': '#10161a',
        '--background-modifier-form-field': '#151e23',
        '--background-modifier-border': '#4b6672',
        '--text-normal': '#f8fafc',
        '--text-muted': '#cbd5e1',
        '--text-strong': '#ffffff',
        '--text-readable': '#e5f4f8',
        '--text-on-accent': '#001114',
        '--text-on-primary': '#001114',
        '--icon-on-primary-filter': 'brightness(0) saturate(100%)',
        '--text-accent': '#67e8f9',
        '--text-accent-rgb': '103,232,249',
        '--interactive-accent': '#06b6d4',
        '--interactive-accent-rgb': '6,182,212',
        '--metadata-accent': '#67e8f9',
        '--status-success': '#4ade80',
        '--status-success-rgb': '74,222,128',
        '--status-danger': '#fb7185',
        '--status-danger-rgb': '251,113,133',
        '--status-warning': '#fbbf24',
        '--status-warning-rgb': '251,191,36',
        '--score-strong': '#4ade80',
        '--score-strong-rgb': '74,222,128',
        '--score-medium': '#fbbf24',
        '--score-medium-rgb': '251,191,36',
        '--score-weak': '#fb923c',
        '--score-weak-rgb': '251,146,60',
        '--score-noisy': '#fb7185',
        '--score-noisy-rgb': '251,113,133',
        '--radius-ui-sm': '2px',
        '--radius-ui-md': '3px',
        '--radius-ui-lg': '4px',
        '--radius-control': '3px'
      })
    }),
    Object.freeze({
      id: 'paper',
      label: 'Paper',
      baseTheme: 'light',
      tokens: Object.freeze({
        '--background-primary': '#f8f1e5',
        '--background-secondary': '#efe2cd',
        '--background-tertiary': '#e4d1b5',
        '--background-modifier-form-field': '#fffaf1',
        '--background-modifier-border': '#c9af8d',
        '--text-normal': '#332b21',
        '--text-muted': '#6f6253',
        '--text-strong': '#211a13',
        '--text-readable': '#443729',
        '--text-on-accent': '#241306',
        '--text-on-primary': '#241306',
        '--icon-on-primary-filter': 'brightness(0) saturate(100%)',
        '--text-accent': '#a6531a',
        '--text-accent-rgb': '166,83,26',
        '--interactive-accent': '#e9a85c',
        '--interactive-accent-rgb': '233,168,92',
        '--metadata-accent': '#8d4618',
        '--status-success': '#27824d',
        '--status-success-rgb': '39,130,77',
        '--status-danger': '#bd3d3d',
        '--status-danger-rgb': '189,61,61',
        '--status-warning': '#c77b17',
        '--status-warning-rgb': '199,123,23',
        '--score-strong': '#27824d',
        '--score-strong-rgb': '39,130,77',
        '--score-medium': '#d4941b',
        '--score-medium-rgb': '212,148,27',
        '--score-weak': '#d06428',
        '--score-weak-rgb': '208,100,40',
        '--score-noisy': '#bd3d3d',
        '--score-noisy-rgb': '189,61,61',
        '--radius-ui-sm': '2px',
        '--radius-ui-md': '4px',
        '--radius-ui-lg': '6px',
        '--radius-control': '3px'
      })
    })
  ]);

  function normalizeThemePackId(value) {
    const id = String(value || '').trim();
    return PACKS.some((pack) => pack.id === id) ? id : DEFAULT_THEME_PACK_ID;
  }

  function getBuiltInThemePack(value) {
    const id = normalizeThemePackId(value);
    return PACKS.find((pack) => pack.id === id) || null;
  }

  function listBuiltInThemePacks() {
    return PACKS.map((pack) => Object.freeze({ id: pack.id, label: pack.label, baseTheme: pack.baseTheme }));
  }

  const api = Object.freeze({
    DEFAULT_THEME_PACK_ID,
    normalizeThemePackId,
    getBuiltInThemePack,
    listBuiltInThemePacks
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosThemePacks = api;
})();