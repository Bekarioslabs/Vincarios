'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createVaultContext } = require('./vaultContext');

function createVaultBackupService(options) {
  options = options || {};
  const fileSystem = options.fs || fs;
  const now = typeof options.now === 'function' ? options.now : () => new Date();
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

    const stamp = createLocalTimestamp(now());
    const backupPath = createBackupPath(resolved.relativePath, stamp);
    const backupAbsolutePath = path.join(currentVault.vault.root, ...backupPath.split('/'));

    try {
      fileSystem.mkdirSync(path.dirname(backupAbsolutePath), { recursive: true });
      fileSystem.copyFileSync(resolved.absolutePath, backupAbsolutePath);
      appendAudit(currentVault.vault.root, {
        action: 'backup_note',
        sourcePath: resolved.relativePath,
        backupPath,
        reason: String(options && options.action ? options.action : 'manual_backup')
      });
      return ok({
        action: 'backup_note',
        sourcePath: resolved.relativePath,
        backupPath
      });
    } catch (error) {
      return fail('backup_failed', 'Could not create note backup.');
    }
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
  return ['.zeus', 'backups', datedFolder, parsed.dir, backupName]
    .filter(Boolean)
    .join('/');
}

function createLocalTimestamp(date) {
  const value = date instanceof Date ? date : new Date(date);
  const pad = (part) => String(part).padStart(2, '0');
  return [
    value.getFullYear(),
    pad(value.getMonth() + 1),
    pad(value.getDate())
  ].join('-') + '_' + [
    pad(value.getHours()),
    pad(value.getMinutes()),
    pad(value.getSeconds())
  ].join('-');
}

function appendAudit(vaultRoot, entry) {
  const auditDir = path.join(vaultRoot, '.zeus');
  fs.mkdirSync(auditDir, { recursive: true });
  const auditEntry = Object.assign({
    timestamp: new Date().toISOString()
  }, entry);
  fs.appendFileSync(path.join(auditDir, 'audit.jsonl'), JSON.stringify(auditEntry) + '\n', 'utf8');
}

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
  createLocalTimestamp
};
