'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { LEGACY_INTERNAL_NAMESPACES } = require('../../shared/internalNamespace');

const RECREATABLE_RUNTIME_ENTRIES = new Set(['electron-cache', 'electron-user-data']);

function getLegacyNamespacePaths(currentPath) {
  const normalizedCurrentPath = normalizePath(currentPath);
  if (!normalizedCurrentPath) return [];
  return LEGACY_INTERNAL_NAMESPACES.map((namespace) => path.join(path.dirname(normalizedCurrentPath), namespace));
}

function migrateInternalNamespaceDirectory(options) {
  const input = options || {};
  const fileSystem = input.fs || fs;
  const currentPath = normalizePath(input.currentPath);
  const legacyPaths = uniquePaths(input.legacyPaths || getLegacyNamespacePaths(currentPath), currentPath);
  if (!currentPath) return fail('invalid_internal_namespace_path', 'Internal data path is invalid.');

  const recovery = recoverRuntimeSwap(fileSystem, currentPath, legacyPaths);
  if (recovery) return recovery;

  for (const legacyPath of legacyPaths) {
    if (!fileSystem.existsSync(legacyPath)) continue;
    if (!isDirectory(fileSystem, legacyPath)) {
      return fail('invalid_legacy_internal_namespace', 'Legacy internal data path is not a directory.', { legacyPath, currentPath });
    }

    if (!fileSystem.existsSync(currentPath) || isEmptyDirectory(fileSystem, currentPath)) {
      try {
        if (fileSystem.existsSync(currentPath)) fileSystem.rmdirSync(currentPath);
        fileSystem.mkdirSync(path.dirname(currentPath), { recursive: true });
        fileSystem.renameSync(legacyPath, currentPath);
        return { ok: true, migrated: true, mode: 'renamed', legacyPath, currentPath };
      } catch (error) {
        return fail('internal_namespace_migration_failed', 'Could not migrate internal data to the current namespace.', { legacyPath, currentPath });
      }
    }

    return mergeLegacyNamespaceDirectory(fileSystem, legacyPath, currentPath);
  }

  return { ok: true, migrated: false, currentPath };
}

function mergeLegacyNamespaceDirectory(fileSystem, legacyPath, currentPath) {
  if (!isDirectory(fileSystem, currentPath)) {
    return fail('internal_namespace_conflict', 'Existing internal data was not migrated because the current namespace path is not a directory.', { legacyPath, currentPath });
  }

  let legacyEntries;
  let currentEntries;
  try {
    legacyEntries = fileSystem.readdirSync(legacyPath);
    currentEntries = fileSystem.readdirSync(currentPath);
  } catch (error) {
    return fail('internal_namespace_migration_failed', 'Could not inspect internal data for migration.', { legacyPath, currentPath });
  }

  const persistentCurrentEntries = currentEntries.filter((entry) => !RECREATABLE_RUNTIME_ENTRIES.has(entry));
  if (persistentCurrentEntries.length) {
    return fail('internal_namespace_conflict', 'Existing internal data was not migrated because both namespace folders contain persistent data.', {
      legacyPath,
      currentPath,
      entries: persistentCurrentEntries
    });
  }

  return replaceRuntimeNamespace(fileSystem, legacyPath, currentPath);
}

function replaceRuntimeNamespace(fileSystem, legacyPath, currentPath) {
  const backupPath = getRuntimeSwapBackupPath(currentPath);
  try {
    fileSystem.renameSync(currentPath, backupPath);
  } catch (error) {
    return fail('internal_namespace_migration_failed', 'Could not prepare the current runtime namespace for migration.', {
      legacyPath,
      currentPath,
      backupPath
    });
  }

  try {
    fileSystem.renameSync(legacyPath, currentPath);
  } catch (error) {
    try {
      fileSystem.renameSync(backupPath, currentPath);
    } catch (rollbackError) {
      return fail('internal_namespace_recovery_required', 'Namespace migration failed and the runtime directory could not be restored.', {
        legacyPath,
        currentPath,
        backupPath
      });
    }
    return fail('internal_namespace_migration_failed', 'Could not activate legacy internal data in the current namespace.', {
      legacyPath,
      currentPath
    });
  }

  let cleanupPending = false;
  try {
    removeDirectory(fileSystem, backupPath);
  } catch (error) {
    cleanupPending = true;
  }
  return {
    ok: true,
    migrated: true,
    mode: 'merged_runtime',
    legacyPath,
    currentPath,
    cleanupPending
  };
}

function recoverRuntimeSwap(fileSystem, currentPath, legacyPaths) {
  const backupPath = getRuntimeSwapBackupPath(currentPath);
  if (!fileSystem.existsSync(backupPath)) return null;

  const legacyPath = legacyPaths.find((candidate) => fileSystem.existsSync(candidate)) || '';
  if (fileSystem.existsSync(currentPath)) {
    if (legacyPath) {
      return fail('internal_namespace_recovery_required', 'Interrupted namespace migration requires manual conflict review.', {
        legacyPath,
        currentPath,
        backupPath
      });
    }
    try {
      removeDirectory(fileSystem, backupPath);
      return { ok: true, migrated: false, recovered: true, currentPath };
    } catch (error) {
      return fail('internal_namespace_recovery_required', 'Could not remove the stale runtime migration backup.', {
        currentPath,
        backupPath
      });
    }
  }

  try {
    if (legacyPath) {
      fileSystem.renameSync(legacyPath, currentPath);
      removeDirectory(fileSystem, backupPath);
      return {
        ok: true,
        migrated: true,
        recovered: true,
        mode: 'recovered_runtime_swap',
        legacyPath,
        currentPath
      };
    }
    fileSystem.renameSync(backupPath, currentPath);
    return { ok: true, migrated: false, recovered: true, currentPath };
  } catch (error) {
    return fail('internal_namespace_recovery_required', 'Could not recover the interrupted namespace migration.', {
      legacyPath,
      currentPath,
      backupPath
    });
  }
}

function getRuntimeSwapBackupPath(currentPath) {
  return normalizePath(currentPath) + '.migration-runtime-backup';
}

function removeDirectory(fileSystem, targetPath) {
  if (typeof fileSystem.rmSync === 'function') {
    fileSystem.rmSync(targetPath, { recursive: true, force: true });
    return;
  }
  fileSystem.rmdirSync(targetPath, { recursive: true });
}

function uniquePaths(values, currentPath) {
  const known = new Set();
  return values.map(normalizePath).filter((value) => {
    if (!value || value === currentPath || known.has(value)) return false;
    known.add(value);
    return true;
  });
}

function normalizePath(value) {
  const text = String(value || '').trim();
  return text ? path.resolve(text) : '';
}

function isDirectory(fileSystem, targetPath) {
  try {
    return fileSystem.statSync(targetPath).isDirectory();
  } catch (error) {
    return false;
  }
}

function isEmptyDirectory(fileSystem, targetPath) {
  try {
    return fileSystem.readdirSync(targetPath).length === 0;
  } catch (error) {
    return false;
  }
}

function fail(code, message, extra) {
  return Object.assign({ ok: false, code, message }, extra || {});
}

module.exports = {
  RECREATABLE_RUNTIME_ENTRIES,
  getLegacyNamespacePaths,
  getRuntimeSwapBackupPath,
  migrateInternalNamespaceDirectory
};
