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
      requiredPermission: normalizeRequiredPermission(item.requiredPermission),
      userText: String(item.userText || '').trim()
    });
  }


  function normalizeRequiredPermission(value) {
    const permission = String(value || 'read').trim().toLowerCase();
    return permission === 'write' ? 'write' : 'read';
  }

  function formatPermissionShortcut(permission) {
    return normalizeRequiredPermission(permission) === 'write' ? 'W' : 'R';
  }


  function formatMissingPermissionMessage(blockedAction) {
    const blocked = blockedAction || {};
    return formatPermissionShortcut(blocked.requiredPermission) + ' is still disabled for this target: ' + normalizePath(blocked.targetPath || blocked.path || '');
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
    normalizeBlockedAction,
    normalizeRequiredPermission,
    formatPermissionShortcut,
    formatMissingPermissionMessage
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosBlockedActionState = Object.freeze(api);
})();