'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createVaultContext } = require('./vaultContext');
const { createVaultBackupService } = require('./vaultBackupService');
const { DEFAULT_VAULT_PROFILE } = require('../../shared/vaultProfile/defaults');
const {
  normalizePayloadLimits,
  validateCreateNotePayload,
  validateUpdateNotePayload
} = require('../../shared/security/payloadLimits');

function createVaultWriteService(options) {
  options = options || {};
  const fileSystem = options.fs || fs;
  const profile = Object.freeze(Object.assign({}, DEFAULT_VAULT_PROFILE, options.profile || {}));
  const backupService = createVaultBackupService({ fs: fileSystem, now: options.now });
  const settingsStore = options.settingsStore || null;
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
    backupService.setRoot(resolvedRoot);
    return ok({ root: vault.root, profile });
  }

  function createNote(input) {
    const currentVault = requireVault();
    if (!currentVault.ok) return currentVault;

    const payload = normalizeCreateNoteInput(input);
    if (!payload.ok) return payload;

    const contentValidation = validateCreateNotePayload(payload.content, getPayloadLimits(settingsStore, options.payloadLimits));
    if (!contentValidation.ok) return contentValidation;

    const targetPath = payload.targetFolder
      ? payload.targetFolder + '/' + payload.fileName
      : payload.fileName;
    const resolved = currentVault.vault.resolve(targetPath, { allowRoot: false });
    if (!resolved.ok) return resolved;

    if (fileSystem.existsSync(resolved.absolutePath)) {
      return fail('file_exists', 'Target note already exists.');
    }

    try {
      fileSystem.mkdirSync(path.dirname(resolved.absolutePath), { recursive: true });
      fileSystem.writeFileSync(resolved.absolutePath, payload.content, 'utf8');
      appendAudit(fileSystem, currentVault.vault.root, {
        action: 'create_note',
        path: resolved.relativePath,
        result: 'created'
      });
      return ok({
        action: 'create_note',
        path: resolved.relativePath,
        bytes: Buffer.byteLength(payload.content, 'utf8')
      });
    } catch (error) {
      return fail('write_failed', 'Could not create note.');
    }
  }

  function createFolder(input) {
    const currentVault = requireVault();
    if (!currentVault.ok) return currentVault;

    const payload = normalizeCreateFolderInput(input);
    if (!payload.ok) return payload;

    const resolved = currentVault.vault.resolve(payload.targetFolder, { allowRoot: false });
    if (!resolved.ok) return resolved;

    if (fileSystem.existsSync(resolved.absolutePath)) {
      let stat;
      try {
        stat = fileSystem.statSync(resolved.absolutePath);
      } catch (error) {
        return fail('stat_failed', 'Could not inspect target folder.');
      }
      if (!stat.isDirectory()) {
        return fail('target_exists_not_folder', 'Target path exists and is not a folder.');
      }
      return ok({
        action: 'create_folder',
        path: resolved.relativePath,
        alreadyExists: true
      });
    }

    try {
      fileSystem.mkdirSync(resolved.absolutePath, { recursive: true });
      appendAudit(fileSystem, currentVault.vault.root, {
        action: 'create_folder',
        path: resolved.relativePath,
        result: 'created'
      });
      return ok({
        action: 'create_folder',
        path: resolved.relativePath
      });
    } catch (error) {
      return fail('write_failed', 'Could not create folder.');
    }
  }
  function updateNote(input) {
    const currentVault = requireVault();
    if (!currentVault.ok) return currentVault;

    const payload = normalizeUpdateNoteInput(input);
    if (!payload.ok) return payload;

    const contentValidation = validateUpdateNotePayload(payload.proposedContent, getPayloadLimits(settingsStore, options.payloadLimits));
    if (!contentValidation.ok) return contentValidation;

    const resolved = currentVault.vault.resolve(payload.targetPath, { allowRoot: false });
    if (!resolved.ok) return resolved;
    if (!resolved.relativePath.toLowerCase().endsWith('.md')) {
      return fail('not_markdown', 'Only Markdown notes can be updated.');
    }
    if (!fileSystem.existsSync(resolved.absolutePath)) {
      return fail('file_not_found', 'Cannot update a missing note.');
    }

    let currentDiskContent;
    try {
      currentDiskContent = fileSystem.readFileSync(resolved.absolutePath, 'utf8');
    } catch (error) {
      return fail('read_failed', 'Could not read note before update.');
    }
    if (currentDiskContent !== payload.currentContent) {
      return fail('stale_content', 'Current note content changed before update.');
    }
    if (payload.currentContent === payload.proposedContent) {
      return fail('no_changes', 'Update proposal contains no changes.');
    }

    const backup = backupService.backupMarkdownNote(resolved.relativePath, { action: 'update_note' });
    if (!backup.ok) return backup;

    try {
      fileSystem.writeFileSync(resolved.absolutePath, payload.proposedContent, 'utf8');
      appendAudit(fileSystem, currentVault.vault.root, {
        action: 'update_note',
        path: resolved.relativePath,
        backupPath: backup.backupPath,
        result: 'updated'
      });
      return ok({
        action: 'update_note',
        path: resolved.relativePath,
        backupPath: backup.backupPath,
        bytes: Buffer.byteLength(payload.proposedContent, 'utf8')
      });
    } catch (error) {
      return fail('write_failed', 'Could not update note.');
    }
  }

  function requireVault() {
    if (!vault) return fail('vault_not_open', 'No vault is open.');
    return { ok: true, vault };
  }

  return Object.freeze({
    setRoot,
    createFolder,
    createNote,
    updateNote
  });
}

function getPayloadLimits(settingsStore, fallback) {
  const settings = settingsStore && typeof settingsStore.getSettings === 'function' ? settingsStore.getSettings() : null;
  return normalizePayloadLimits(settings && settings.limits ? settings.limits : fallback);
}

function normalizeCreateNoteInput(input) {
  const title = String(input && input.title ? input.title : '').trim();
  if (!title) return fail('invalid_title', 'Note title is required.');

  const targetFolder = String(input && input.targetFolder ? input.targetFolder : '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  const fileName = toMarkdownFileName(title);
  return ok({
    targetFolder,
    fileName,
    content: String(input && input.content ? input.content : '')
  });
}

function normalizeCreateFolderInput(input) {
  const targetFolder = String(input && input.targetFolder ? input.targetFolder : '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (!targetFolder) return fail('invalid_target_folder', 'Target folder is required.');
  return ok({ targetFolder });
}

function normalizeUpdateNoteInput(input) {
  const targetPath = String(input && input.targetPath ? input.targetPath : '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (!targetPath) return fail('invalid_target_path', 'Target path is required.');
  if (!targetPath.toLowerCase().endsWith('.md')) return fail('not_markdown', 'Only Markdown notes can be updated.');
  if (!input || typeof input.currentContent !== 'string') {
    return fail('missing_current_content', 'Current content is required for reviewed updates.');
  }
  if (!input || typeof input.proposedContent !== 'string') {
    return fail('missing_proposed_content', 'Proposed content is required for reviewed updates.');
  }

  return ok({
    targetPath,
    currentContent: input.currentContent,
    proposedContent: input.proposedContent
  });
}

function toMarkdownFileName(title) {
  const clean = String(title || '')
    .replace(/\\/g, '-')
    .replace(/[/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '');
  const base = clean || 'Untitled';
  return base.toLowerCase().endsWith('.md') ? base : base + '.md';
}

function appendAudit(fileSystem, vaultRoot, entry) {
  const auditDir = path.join(vaultRoot, '.zeus');
  fileSystem.mkdirSync(auditDir, { recursive: true });
  const auditEntry = Object.assign({
    timestamp: new Date().toISOString()
  }, entry);
  fileSystem.appendFileSync(path.join(auditDir, 'audit.jsonl'), JSON.stringify(auditEntry) + '\n', 'utf8');
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
  createVaultWriteService,
  toMarkdownFileName
};
