(function() {
  'use strict';

  const REASONS = Object.freeze({
    fileRead: 'Requires R and loaded Markdown content.',
    folderRead: 'Requires R on this folder.',
    fileWrite: 'Requires R, W, and loaded Markdown content.',
    fileUpdateReady: ''
  });

  function fileReadReason() {
    return REASONS.fileRead;
  }

  function folderReadReason() {
    return REASONS.folderRead;
  }

  function fileWriteReason() {
    return REASONS.fileWrite;
  }

  function fileUpdateReadyReason() {
    return REASONS.fileUpdateReady;
  }

  function missingPermissionMessage(options) {
    options = options || {};
    const actionId = options.actionId || '';
    const targetKind = options.targetKind === 'folder' ? 'folder' : 'file';
    const path = options.path || '';
    if (actionId === 'file.proposeUpdate') {
      return 'Please enable R and W for this file before proposing a content update: ' + path;
    }
    if (actionId === 'file.suggestTags') {
      return 'Please enable R and W for this file before suggesting tag updates: ' + path;
    }
    const shortcut = options.requiredPermission === 'write' ? 'W' : 'R';
    return 'Please enable ' + shortcut + ' for this ' + targetKind + ': ' + path;
  }

  const api = {
    fileReadReason,
    folderReadReason,
    fileWriteReason,
    fileUpdateReadyReason,
    missingPermissionMessage
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosSelectionActionPermissionText = Object.freeze(api);
})();