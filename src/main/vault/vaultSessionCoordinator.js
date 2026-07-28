'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { CURRENT_INTERNAL_NAMESPACE } = require('../../shared/internalNamespace');
const { migrateInternalNamespaceDirectory } = require('../app/internalNamespaceMigration');

function createVaultSessionCoordinator(options) {
  const input = options || {};
  const fileSystem = input.fs || fs;
  const pathApi = input.pathApi || path;
  const validateRoot = input.validateRoot || ((root) => validateVaultRoot(root, fileSystem, pathApi));
  const authorizeRoot = input.authorizeRoot || (() => ({ ok: true }));
  const migrateNamespace = input.migrateNamespace || ((payload) => migrateInternalNamespaceDirectory(payload));
  const services = normalizeServices(input.services);
  let activeRoot = '';

  function activateRoot(candidateRoot, context) {
    const validated = validateRoot(candidateRoot);
    if (!validated || validated.ok === false) {
      return validated || fail('invalid_vault_root', 'Vault root is invalid.');
    }

    const root = validated.root;
    const authorization = authorizeRoot({
      root,
      source: context && context.source ? context.source : 'trusted'
    });
    if (!authorization || authorization.ok === false) {
      return authorization || fail('vault_root_not_allowed', 'Vault root is not authorized.');
    }

    const namespaceMigration = migrateNamespace({
      currentPath: pathApi.join(root, CURRENT_INTERNAL_NAMESPACE)
    });
    if (!namespaceMigration || namespaceMigration.ok === false) {
      return namespaceMigration || fail('namespace_migration_failed', 'Internal data migration failed.');
    }

    const previousRoot = activeRoot;
    const activated = [];
    const warnings = [];

    for (const entry of services) {
      const result = callSetRoot(entry, root);
      if (result.ok) {
        activated.push(entry);
        continue;
      }
      if (entry.optional) {
        warnings.push(toWarning(entry, result));
        continue;
      }

      const rollback = previousRoot
        ? rollbackServices(activated.concat(entry), previousRoot)
        : { ok: true, failures: [] };
      return {
        ok: false,
        code: 'vault_activation_failed',
        message: 'Vault session activation failed for ' + entry.name + '.',
        service: entry.name,
        cause: result,
        rollback
      };
    }

    activeRoot = root;
    return {
      ok: true,
      root,
      namespaceMigration,
      warnings
    };
  }

  function getState() {
    return Object.freeze({
      active: Boolean(activeRoot),
      activeRoot
    });
  }

  return Object.freeze({
    activateRoot,
    getState
  });

  function rollbackServices(entries, root) {
    const failures = [];
    const uniqueEntries = Array.from(new Set(entries)).reverse();
    for (const entry of uniqueEntries) {
      const result = callSetRoot(entry, root);
      if (!result.ok) failures.push(toWarning(entry, result));
    }
    return { ok: failures.length === 0, failures };
  }
}

function createRecentVaultAuthorizer(settingsService, pathApi) {
  const pathImplementation = pathApi || path;
  return function authorizeRoot(payload) {
    const source = payload && payload.source ? payload.source : 'trusted';
    if (source === 'picker' || source === 'trusted') return { ok: true };
    if (source !== 'recent' || !settingsService || typeof settingsService.getSettings !== 'function') {
      return fail('vault_root_not_allowed', 'Select the vault through Open Vault before using it as a recent vault.');
    }

    const settings = settingsService.getSettings();
    const recentVaults = settings && settings.startup && Array.isArray(settings.startup.recentVaults)
      ? settings.startup.recentVaults
      : [];
    const requestedRoot = normalizeComparableRoot(payload.root, pathImplementation);
    const allowed = recentVaults.some((entry) => {
      return normalizeComparableRoot(entry && entry.path, pathImplementation) === requestedRoot;
    });
    return allowed
      ? { ok: true }
      : fail('vault_root_not_allowed', 'Select the vault through Open Vault before using it as a recent vault.');
  };
}

function normalizeComparableRoot(value, pathApi) {
  const normalized = pathApi.resolve(String(value || '').trim());
  return pathApi.sep === '\\' ? normalized.toLowerCase() : normalized;
}
function validateVaultRoot(candidateRoot, fileSystem, pathApi) {
  if (typeof candidateRoot !== 'string' || !candidateRoot.trim()) {
    return fail('invalid_vault_root', 'Vault root is required.');
  }
  const root = pathApi.resolve(candidateRoot);
  try {
    if (!fileSystem.statSync(root).isDirectory()) {
      return fail('vault_not_directory', 'Vault root must be a directory.');
    }
  } catch (_error) {
    return fail('vault_not_found', 'Vault root does not exist.');
  }
  return { ok: true, root };
}

function normalizeServices(services) {
  if (!Array.isArray(services)) return [];
  return services
    .filter((entry) => entry && entry.service && typeof entry.service.setRoot === 'function')
    .map((entry) => Object.freeze({
      name: String(entry.name || 'service'),
      service: entry.service,
      optional: entry.optional === true
    }));
}

function callSetRoot(entry, root) {
  try {
    const result = entry.service.setRoot(root);
    if (result && result.ok === false) return result;
    return result && typeof result === 'object'
      ? Object.assign({ ok: true }, result)
      : { ok: true, root };
  } catch (error) {
    return fail('set_root_threw', error && error.message ? error.message : 'Service root activation threw.');
  }
}

function toWarning(entry, result) {
  return {
    service: entry.name,
    code: result.code || 'set_root_failed',
    message: result.message || 'Service root activation failed.'
  };
}

function fail(code, message) {
  return { ok: false, code, message };
}

module.exports = {
  createRecentVaultAuthorizer,
  createVaultSessionCoordinator,
  validateVaultRoot
};
