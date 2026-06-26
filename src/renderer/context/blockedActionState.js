(function() {
  'use strict';

  function createBlockedActionState() {
    let blocked = null;
    let nextId = 1;

    function set(action) {
      blocked = normalizeBlockedAction(action, nextId);
      nextId += 1;
      return snapshot();
    }

    function clear(id) {
      if (id && blocked && blocked.id !== id) return snapshot();
      blocked = null;
      return null;
    }

    function snapshot() {
      return blocked ? Object.assign({}, blocked) : null;
    }

    function hasBlocked() {
      return blocked !== null;
    }

    return Object.freeze({ set, clear, snapshot, hasBlocked });
  }

  function normalizeBlockedAction(action, nextId) {
    const item = action || {};
    return Object.freeze({
      id: String(item.id || 'blocked-' + nextId),
      type: String(item.type || '').trim(),
      selectionId: Number.isInteger(item.selectionId) ? item.selectionId : 0,
      targetPath: normalizePath(item.targetPath || item.path || ''),
      targetKind: String(item.targetKind || item.kind || 'file').trim() || 'file',
      requiredPermission: String(item.requiredPermission || 'read').trim() || 'read',
      userText: String(item.userText || '').trim()
    });
  }

  function normalizePath(value) {
    return String(value || '')
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, '')
      .replace(/\/+/g, '/');
  }

  const api = {
    createBlockedActionState,
    normalizeBlockedAction
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusBlockedActionState = Object.freeze(api);
})();