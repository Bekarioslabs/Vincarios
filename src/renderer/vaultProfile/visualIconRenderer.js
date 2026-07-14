(function() {
  'use strict';

  function createFolderVisualIcon(options) {
    const input = options || {};
    const renderer = input.renderer;
    const icon = input.visual && input.visual.icon ? input.visual.icon : { kind: 'builtin', id: 'folder' };
    const className = input.className || '';
    if (!renderer) return null;
    if (icon.kind === 'custom' && isLocalSvgSource(icon.src) && typeof renderer.createIconElementFromSource === 'function') {
      return renderer.createIconElementFromSource(icon.src, className);
    }
    const name = typeof input.resolveBuiltinIconName === 'function'
      ? input.resolveBuiltinIconName(icon.kind === 'builtin' ? icon.id : 'folder')
      : 'folder';
    return typeof renderer.createIconElement === 'function' ? renderer.createIconElement(name, className) : null;
  }

  function isLocalSvgSource(value) {
    return typeof value === 'string' && value.startsWith('data:image/svg+xml;base64,');
  }

  const api = { createFolderVisualIcon, isLocalSvgSource };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosVaultProfileVisualIconRenderer = Object.freeze(api);
})();