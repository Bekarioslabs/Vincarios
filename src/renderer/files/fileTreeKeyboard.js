(function() {
  'use strict';

  const NAVIGATION_KEYS = Object.freeze({
    ArrowUp: true,
    ArrowDown: true,
    ArrowLeft: true,
    ArrowRight: true,
    PageUp: true,
    PageDown: true,
    Home: true,
    End: true
  });

  function isFileTreeNavigationKey(key) {
    return !!NAVIGATION_KEYS[key];
  }

  function isFileTreeRenameShortcut(event) {
    if (!event) return false;
    return event.key === 'F2' && !event.ctrlKey && !event.metaKey && !event.altKey;
  }

  function getFileTreeNavigation(options) {
    options = options || {};
    const rows = Array.isArray(options.rows) ? options.rows : [];
    const maxIndex = Math.max(0, rows.length - 1);
    const currentIndex = clampIndex(options.currentIndex, maxIndex);
    const pageSize = Math.max(1, Number(options.pageSize) || 8);

    switch (options.key) {
      case 'ArrowUp':
        return focusCommand(currentIndex - 1, maxIndex);
      case 'ArrowDown':
        return focusCommand(currentIndex + 1, maxIndex);
      case 'Home':
        return focusCommand(0, maxIndex);
      case 'End':
        return focusCommand(maxIndex, maxIndex);
      case 'PageUp':
        return focusCommand(currentIndex - pageSize, maxIndex);
      case 'PageDown':
        return focusCommand(currentIndex + pageSize, maxIndex);
      case 'ArrowRight':
        return { type: 'expand', nextIndex: currentIndex };
      case 'ArrowLeft':
        return { type: 'collapse', nextIndex: currentIndex };
      default:
        return { type: 'none', nextIndex: currentIndex };
    }
  }

  function focusCommand(nextIndex, maxIndex) {
    return {
      type: 'focus',
      nextIndex: clampIndex(nextIndex, maxIndex)
    };
  }

  function clampIndex(value, maxIndex) {
    const number = Number.isFinite(Number(value)) ? Number(value) : 0;
    return Math.min(Math.max(0, number), maxIndex);
  }

  const api = {
    getFileTreeNavigation,
    isFileTreeNavigationKey,
    isFileTreeRenameShortcut
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosFileTreeKeyboard = Object.freeze(api);
})();
