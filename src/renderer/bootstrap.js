(function() {
  'use strict';

  function bootstrapZeus(api, root) {
    if (!window.ZeusShell || typeof window.ZeusShell.mountShell !== 'function') {
      throw new Error('ZEUS shell module is not available.');
    }
    return window.ZeusShell.mountShell(root, api);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { bootstrapZeus };
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
      bootstrapZeus(window.zeus, document.getElementById('app'));
    });
  }
})();