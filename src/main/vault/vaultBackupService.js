'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { createVaultAuditService } = require('../audit/vaultAuditService');
const { createVaultContext } = require('./vaultContext');
const { executeAuditedMutation } = require('./vaultWriteTransaction');
const { CURRENT_INTERNAL_NAMESPACE } = require('../../shared/internalNamespace');

function createVaultBackupService(options) {
  options = options || {};
  const fileSystem = options.fs || fs;
  const now = typeof options.now === 'function' ? options.now : () => new Date();
  const auditService = options.auditService || createVaultAuditService({
    fs: fileSystem,
    now
  });
  let vault = null;

  function setRoot(vaultRoot) {
    if (typeof vaultRoot !== 'string' || !vaultRoot.trim()) {
      return fail('invalid_vault_root', 'Vault root is required.');
    }

    const resolvedRoot = path.resolve(vaultRoot);
    let stat;
    try {
      stat = fileSystem.statSync(resolvedRoot);
    } catch (error) {
      return fail('vault_not_found', 'Vault root does not exist.');
    }

    if (!stat.isDirectory()) {
      return fail('vault_not_directory', 'Vault root must be a directory.');
    }

    vault = createVaultContext(resolvedRoot);
    auditService.setRoot(resolvedRoot);
    return ok({ root: vault.root });
  }

  function backupMarkdownNote(relativePath, options) {
    const currentVault = requireVault();
    if (!currentVault.ok) return currentVault;

    const resolved = currentVault.vault.resolve(relativePath, { allowRoot: false });
    if (!resolved.ok) return resolved;
    if (!resolved.relativePath.toLowerCase().endsWith('.md')) {
      return fail('not_markdown', 'Only Markdown notes can be backed up by this service.');
    }
    if (!fileSystem.existsSync(resolved.absolutePath)) {
      return fail('file_not_found', 'Cannot back up a missing note.');
    }

    let stat;
    try {
      stat = fileSystem.statSync(resolved.absolutePath);
    } catch (error) {
      return fail('file_not_found', 'Cannot back up a missing note.');
    }
    if (!stat.isFile()) return fail('not_file', 'Backup target must be a file.');

    const stamp = createBackupTimestamp(now());
    const backupPath = createBackupPath(resolved.relativePath, stamp);
    const backupAbsolutePath = path.join(currentVault.vault.root, ...backupPath.split('/'));

    const transaction = executeAuditedMutation({
      auditService,
      mutate() {
        fileSystem.mkdirSync(path.dirname(backupAbsolutePath), { recursive: true });
        fileSystem.copyFileSync(resolved.absolutePath, backupAbsolutePath);
      },
      rollback() {
        if (fileSystem.existsSync(backupAbsolutePath)) {
          fileSystem.unlinkSync(backupAbsolutePath);
        }
      },
      auditEntry: {
        action: 'backup_note',
        sourcePath: resolved.relativePath,
        backupPath,
        reason: String(options && options.action ? options.action : 'manual_backup')
      },
      mutationFailureCode: 'backup_failed',
      mutationFailureMessage: 'Could not create note backup.'
    });
    if (!transaction.ok) return transaction;

    return ok({
      action: 'backup_note',
      sourcePath: resolved.relativePath,
      backupPath
    });
  }

  function requireVault() {
    if (!vault) return fail('vault_not_open', 'No vault is open.');
    return { ok: true, vault };
  }

  return Object.freeze({
    setRoot,
    backupMarkdownNote
  });
}

function createBackupPath(relativePath, stamp) {
  const parsed = path.posix.parse(relativePath.replace(/\\/g, '/'));
  const datedFolder = stamp.slice(0, 10);
  const backupName = parsed.name + '.' + stamp + parsed.ext;
  return [CURRENT_INTERNAL_NAMESPACE, 'backups', datedFolder, parsed.dir, backupName]
    .filter(Boolean)
    .join('/');
}

function createBackupTimestamp(date) {
  const value = date instanceof Date ? date : new Date(date);
  const pad = (part) => String(part).padStart(2, '0');
  return [
    value.getUTCFullYear(),
    pad(value.getUTCMonth() + 1),
    pad(value.getUTCDate())
  ].join('-') + '_' + [
    pad(value.getUTCHours()),
    pad(value.getUTCMinutes()),
    pad(value.getUTCSeconds())
  ].join('-');
}

const createLocalTimestamp = createBackupTimestamp;

function ok(value) {
  return Object.assign({ ok: true }, value);
}

function fail(code, message) {
  return {
    ok: false,
    code,
    message
  };
}

module.exports = {
  createVaultBackupService,
  createBackupPath,
  createBackupTimestamp,
  createLocalTimestamp
};
