'use strict';

const SAME_ROLE_SCOPE = 'same_role';
const WHOLE_VAULT_SCOPE = 'whole_vault';

function createEmbeddingCandidateEligibility() {
  function describePath(relativePath, profile) {
    const path = normalizePath(relativePath);
    return { path, role: resolveRole(path, profile), area: getTopLevelArea(path) };
  }

  function isEligible(input) {
    const target = describePath(input && input.targetPath, input && input.profile);
    const candidate = describePath(input && input.candidatePath, input && input.profile);
    const scope = normalizeScope(input && input.scope);
    if (!target.path || !candidate.path) return { eligible: false, scope, targetRole: target.role, candidateRole: candidate.role };
    if (scope === WHOLE_VAULT_SCOPE) return { eligible: true, scope, targetRole: target.role, candidateRole: candidate.role };
    if (target.role) {
      return { eligible: target.role === candidate.role, scope, targetRole: target.role, candidateRole: candidate.role };
    }
    return {
      eligible: target.area ? target.area === candidate.area : !candidate.role && !candidate.area,
      scope,
      targetRole: '',
      candidateRole: candidate.role
    };
  }

  return Object.freeze({ describePath, isEligible });
}

function resolveRole(relativePath, profile) {
  const path = normalizePath(relativePath).toLocaleLowerCase();
  const roles = profile && profile.roles && typeof profile.roles === 'object' ? profile.roles : {};
  return Object.keys(roles)
    .map((role) => ({ role, path: normalizePath(roles[role]).toLocaleLowerCase() }))
    .filter((entry) => entry.path && (path === entry.path || path.startsWith(entry.path + '/')))
    .sort((left, right) => right.path.length - left.path.length)[0]?.role || '';
}

function normalizeScope(value) {
  return value === WHOLE_VAULT_SCOPE ? WHOLE_VAULT_SCOPE : SAME_ROLE_SCOPE;
}

function normalizePath(value) {
  return String(value || '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
}

function getTopLevelArea(relativePath) {
  const parts = normalizePath(relativePath).split('/').filter(Boolean);
  return parts.length > 1 ? parts[0].toLocaleLowerCase() : '';
}

module.exports = {
  SAME_ROLE_SCOPE,
  WHOLE_VAULT_SCOPE,
  createEmbeddingCandidateEligibility,
  normalizeScope,
  resolveRole
};