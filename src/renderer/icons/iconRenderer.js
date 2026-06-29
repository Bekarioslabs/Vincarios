(function() {
  'use strict';

  const ICON_BASE_PATH = './src/renderer/assets/icons/lucide/';

  function getIconPath(name) {
    const registry = getRegistry();
    const fileName = registry && registry.ICONS ? registry.ICONS[name] : null;
    if (!fileName) return '';
    return ICON_BASE_PATH + fileName;
  }

  function createIconElement(name, className) {
    const icon = document.createElement('img');
    icon.className = ['zeus-icon', className || ''].filter(Boolean).join(' ');
    icon.setAttribute('src', getIconPath(name));
    icon.setAttribute('alt', '');
    icon.setAttribute('aria-hidden', 'true');
    icon.setAttribute('draggable', 'false');
    return icon;
  }

  function getRegistry() {
    if (typeof window !== 'undefined' && window.ZeusIconRegistry) return window.ZeusIconRegistry;
    if (typeof module !== 'undefined' && module.exports) return require('./iconRegistry');
    return null;
  }

  const api = { getIconPath, createIconElement };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusIconRenderer = Object.freeze(api);
})();