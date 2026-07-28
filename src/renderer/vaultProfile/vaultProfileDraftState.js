(function() {
  'use strict';

  function createVaultProfileDraftState(options) {
    options = options || {};
    const helpers = options.helpers || getFolderVisualHelpers();
    let savedProfile = { roles: {}, roleVisuals: {} };
    let drafts = {};
    let initialized = false;

    function reset(profile) {
      savedProfile = normalizeProfile(profile);
      drafts = {};
      initialized = true;
      return snapshot();
    }
    function invalidate() {
      savedProfile = { roles: {}, roleVisuals: {} };
      drafts = {};
      initialized = false;
      return snapshot();
    }

    function hasBase() {
      return initialized;
    }

    function getRole(roleId) {
      const entry = drafts[roleId] || getSavedRole(roleId);
      return cloneRole(entry);
    }

    function updateRole(roleId, nextEntry) {
      const next = normalizeRole(roleId, nextEntry);
      const saved = getSavedRole(roleId);
      if (sameRole(next, saved)) delete drafts[roleId];
      else drafts[roleId] = next;
      return getRole(roleId);
    }

    function commitRole(roleId, profile) {
      savedProfile = normalizeProfile(profile);
      delete drafts[roleId];
      initialized = true;
      return snapshot();
    }

    function isDirty(roleId) {
      return Object.prototype.hasOwnProperty.call(drafts, roleId);
    }

    function getAssignedRole(folderPath) {
      const path = normalizeTopLevelPath(folderPath);
      if (!path) return '';
      const roleIds = new Set(Object.keys(savedProfile.roles).concat(Object.keys(drafts)));
      for (const roleId of roleIds) {
        if (getRole(roleId).folderPath === path) return roleId;
      }
      return '';
    }

    function isFolderAvailable(folderPath, roleId) {
      const assignedRole = getAssignedRole(folderPath);
      return !assignedRole || assignedRole === roleId;
    }

    function snapshot() {
      const copy = {};
      Object.keys(drafts).forEach((roleId) => { copy[roleId] = cloneRole(drafts[roleId]); });
      return Object.freeze({
        initialized,
        profile: Object.freeze(cloneProfile(savedProfile)),
        drafts: Object.freeze(copy)
      });
    }

    function getSavedRole(roleId) {
      const folderPath = normalizeTopLevelPath(savedProfile.roles[roleId]);
      const visual = helpers && typeof helpers.getRoleVisual === 'function'
        ? helpers.getRoleVisual(roleId, savedProfile.roleVisuals)
        : fallbackVisual();
      return normalizeRole(roleId, { folderPath, visual });
    }

    function normalizeProfile(profile) {
      const input = profile || {};
      const roles = {};
      Object.keys(input.roles || {}).forEach((roleId) => {
        const path = normalizeTopLevelPath(input.roles[roleId]);
        if (path) roles[roleId] = path;
      });
      const roleVisuals = helpers && typeof helpers.normalizeRoleVisuals === 'function'
        ? helpers.normalizeRoleVisuals(input.roleVisuals)
        : Object.assign({}, input.roleVisuals || {});
      preserveCustomIconSources(roleVisuals, input.roleVisuals);
      return { roles, roleVisuals };
    }

    function normalizeRole(roleId, entry) {
      const input = entry || {};
      return {
        folderPath: normalizeTopLevelPath(input.folderPath),
        visual: normalizeVisual(roleId, input.visual)
      };
    }

    function normalizeVisual(roleId, visual) {
      const source = visual || fallbackVisual();
      const normalized = helpers && typeof helpers.normalizeRoleVisuals === 'function'
        ? helpers.normalizeRoleVisuals({ [roleId]: source })[roleId]
        : source;
      const result = cloneVisual(normalized || fallbackVisual());
      const sourceIcon = source && source.icon;
      if (sourceIcon && sourceIcon.kind === 'custom' && typeof sourceIcon.src === 'string' && result.icon && result.icon.kind === 'custom' && result.icon.path === sourceIcon.path) {
        result.icon.src = sourceIcon.src;
      }
      return result;
    }

    function preserveCustomIconSources(targetVisuals, sourceVisuals) {
      Object.keys(targetVisuals || {}).forEach((roleId) => {
        const sourceIcon = sourceVisuals && sourceVisuals[roleId] && sourceVisuals[roleId].icon;
        const targetIcon = targetVisuals[roleId] && targetVisuals[roleId].icon;
        if (!sourceIcon || sourceIcon.kind !== 'custom' || typeof sourceIcon.src !== 'string') return;
        if (!targetIcon || targetIcon.kind !== 'custom' || targetIcon.path !== sourceIcon.path) return;
        targetIcon.src = sourceIcon.src;
      });
    }

    function sameRole(left, right) {
      return left.folderPath === right.folderPath && sameVisual(left.visual, right.visual);
    }

    function sameVisual(left, right) {
      const leftIcon = left && left.icon ? left.icon : {};
      const rightIcon = right && right.icon ? right.icon : {};
      const leftColor = left && left.color ? left.color : {};
      const rightColor = right && right.color ? right.color : {};
      return leftIcon.kind === rightIcon.kind
        && leftIcon.id === rightIcon.id
        && leftIcon.path === rightIcon.path
        && leftColor.kind === rightColor.kind
        && leftColor.id === rightColor.id;
    }

    return Object.freeze({ reset, invalidate, hasBase, getRole, updateRole, commitRole, isDirty, getAssignedRole, isFolderAvailable, snapshot });
  }

  function cloneProfile(profile) {
    return {
      roles: Object.assign({}, profile.roles || {}),
      roleVisuals: Object.keys(profile.roleVisuals || {}).reduce((result, roleId) => {
        result[roleId] = cloneVisual(profile.roleVisuals[roleId]);
        return result;
      }, {})
    };
  }

  function cloneRole(entry) {
    return { folderPath: entry.folderPath, visual: cloneVisual(entry.visual) };
  }

  function cloneVisual(visual) {
    const input = visual || fallbackVisual();
    return {
      icon: Object.assign({}, input.icon || fallbackVisual().icon),
      color: Object.assign({}, input.color || fallbackVisual().color)
    };
  }

  function fallbackVisual() {
    return { icon: { kind: 'builtin', id: 'folder' }, color: { kind: 'token', id: 'amber-400' } };
  }

  function normalizeTopLevelPath(value) {
    const path = String(value || '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    return path && !path.includes('/') ? path : '';
  }

  function getFolderVisualHelpers() {
    if (typeof window !== 'undefined' && window.VincariosFolderVisuals) return window.VincariosFolderVisuals;
    if (typeof module !== 'undefined' && module.exports) return require('../../shared/vaultProfile/folderVisuals');
    return null;
  }

  const api = { createVaultProfileDraftState };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosVaultProfileDraftState = Object.freeze(api);
})();