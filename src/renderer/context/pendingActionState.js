(function() {
  'use strict';

  function createPendingActionState() {
    let pending = null;
    let nextId = 1;

    function set(action) {
      pending = normalizePendingAction(action, nextId);
      nextId += 1;
      return snapshot();
    }

    function clear() {
      pending = null;
      return null;
    }

    function snapshot() {
      return pending ? Object.assign({}, pending) : null;
    }

    function hasPending() {
      return pending !== null;
    }

    return Object.freeze({ set, clear, snapshot, hasPending });
  }

  function normalizePendingAction(action, nextId) {
    const item = action || {};
    return Object.freeze({
      id: String(item.id || 'pending-' + nextId),
      type: String(item.type || '').trim(),
      selectionId: Number.isInteger(item.selectionId) ? item.selectionId : 0,
      targetPath: normalizePath(item.targetPath || item.path || ''),
      targetKind: String(item.targetKind || item.kind || 'folder').trim() || 'folder'
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
    createPendingActionState,
    normalizePendingAction
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusPendingActionState = Object.freeze(api);
})();
