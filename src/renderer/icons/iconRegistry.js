(function() {
  'use strict';

  const ICONS = Object.freeze({
    folder: 'folder.svg',
    markdownFile: 'file-text.svg',
    file: 'file.svg',
    image: 'image.svg',
    settings: 'settings.svg',
    refresh: 'refresh-cw.svg',
    chevronLeft: 'chevron-left.svg',
    chevronRight: 'chevron-right.svg',
    chevronDown: 'chevron-down.svg',
    copy: 'copy.svg',
    save: 'save.svg',
    close: 'x.svg',
    check: 'check.svg',
    warning: 'triangle-alert.svg',
    search: 'search.svg',
    send: 'send.svg',
    edit: 'square-pen.svg'
  });

  const api = { ICONS };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusIconRegistry = Object.freeze(api);
})();