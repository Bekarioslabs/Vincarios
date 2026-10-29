'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createVaultAuditService } = require('../audit/vaultAuditService');
const { createVaultContext } = require('./vaultContext');
const { createVaultBackupService } = require('./vaultBackupService');
const { executeAuditedMutation } = require('./vaultWriteTransaction');
const { DEFAULT_VAULT_PROFILE } = require('../../shared/vaultProfile/defaults');
const { preserveLineEndings } = require('../../shared/text/lineEndings');
const { isMarkdownPath } = require('../../shared/fileTypes');
const { validateNewName } = require('../../shared/pathRules/newNames');
const {
  normalizePayloadLimits,
  validateCreateNotePayload,
  validateUpdateNotePayload
} = require('../../shared/security/payloadLimits');

function createVaultWriteService(options) {
  options = options || {};
  const fileSystem = options.fs || fs;
  const profile = Object.freeze(Object.assign({}, DEFAULT_VAULT_PROFILE, options.profile || {}));
  const auditService = options.auditService || createVaultAuditService({
    fs: fileSystem,
    now: options.now
  });
  const backupService = createVaultBackupService({ fs: fileSystem, now: options.now, auditService });
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
    auditService.setRoot(resolvedRoot);
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
    const parentNames = validateNewParentNames(payload.targetFolder);
    if (!parentNames.ok) return parentNames;

    if (fileSystem.existsSync(resolved.absolutePath)) {
      return fail('file_exists', 'Target note already exists.');
    }

    let created = false;
    let createConflict = false;
    const transaction = executeAuditedMutation({
      auditService,
      mutate() {
        fileSystem.mkdirSync(path.dirname(resolved.absolutePath), { recursive: true });
        let descriptor;
        try {
          descriptor = fileSystem.openSync(resolved.absolutePath, 'wx');
        } catch (error) {
          createConflict = error.code === 'EEXIST';
          throw error;
        }
        created = true;
        try {
          fileSystem.writeFileSync(descriptor, payload.content, 'utf8');
        } finally {
          fileSystem.closeSync(descriptor);
        }
      },
      rollback() {
        if (created && fileSystem.existsSync(resolved.absolutePath)) {
          fileSystem.unlinkSync(resolved.absolutePath);
        }
      },
      auditEntry: {
        action: 'create_note',
        path: resolved.relativePath,
        result: 'created'
      },
      mutationFailureCode: 'write_failed',
      mutationFailureMessage: 'Could not create note.'
    });
    if (!transaction.ok && transaction.code === 'write_failed' && createConflict) {
      return fail('file_exists', 'Target note already exists.');
    }
    if (!transaction.ok) return transaction;

    return ok({
      action: 'create_note',
      path: resolved.relativePath,
      bytes: Buffer.byteLength(payload.content, 'utf8')
    });
  }

  function createFolder(input) {
    const currentVault = requireVault();
    if (!currentVault.ok) return currentVault;

    const payload = normalizeCreateFolderInput(input);
    if (!payload.ok) return payload;

    const resolved = currentVault.vault.resolve(payload.targetFolder, { allowRoot: false });
    if (!resolved.ok) return resolved;
    const folderName = validateNewName(payload.targetFolder.split('/').pop());
    if (!folderName.ok) return folderName;
    const parentNames = validateNewParentNames(payload.targetFolder);
    if (!parentNames.ok) return parentNames;

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

    const transaction = executeAuditedMutation({
      auditService,
      mutate() {
        fileSystem.mkdirSync(resolved.absolutePath, { recursive: true });
      },
      rollback() {
        fileSystem.rmdirSync(resolved.absolutePath);
      },
      auditEntry: {
        action: 'create_folder',
        path: resolved.relativePath,
        result: 'created'
      },
      mutationFailureCode: 'write_failed',
      mutationFailureMessage: 'Could not create folder.'
    });
    if (!transaction.ok) return transaction;

    return ok({
      action: 'create_folder',
      path: resolved.relativePath
    });
  }
  function updateNote(input) {
    const currentVault = requireVault();
    if (!currentVault.ok) return currentVault;

    const payload = normalizeUpdateNoteInput(input);
    if (!payload.ok) return payload;

    const payloadLimits = getPayloadLimits(settingsStore, options.payloadLimits);
    const contentValidation = validateUpdateNotePayload(payload.proposedContent, payloadLimits);
    if (!contentValidation.ok) return contentValidation;

    const resolved = currentVault.vault.resolve(payload.targetPath, { allowRoot: false });
    if (!resolved.ok) return resolved;
    if (!isMarkdownPath(resolved.relativePath)) {
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
    const proposedContent = preserveLineEndings(payload.proposedContent, currentDiskContent);
    const writeValidation = validateUpdateNotePayload(proposedContent, payloadLimits);
    if (!writeValidation.ok) return writeValidation;
    if (currentDiskContent === proposedContent) {
      return fail('no_changes', 'Update proposal contains no changes.');
    }

    const backup = backupService.backupMarkdownNote(resolved.relativePath, { action: 'update_note' });
    if (!backup.ok) return backup;

    const transaction = executeAuditedMutation({
      auditService,
      mutate() {
        fileSystem.writeFileSync(resolved.absolutePath, proposedContent, 'utf8');
      },
      rollback() {
        fileSystem.writeFileSync(resolved.absolutePath, currentDiskContent, 'utf8');
      },
      auditEntry: {
        action: 'update_note',
        path: resolved.relativePath,
        backupPath: backup.backupPath,
        result: 'updated'
      },
      mutationFailureCode: 'write_failed',
      mutationFailureMessage: 'Could not update note.'
    });
    if (!transaction.ok) return transaction;

    return ok({
      action: 'update_note',
      path: resolved.relativePath,
      backupPath: backup.backupPath,
      bytes: Buffer.byteLength(proposedContent, 'utf8')
    });
  }

  function renameFile(input) {
    const currentVault = requireVault();
    if (!currentVault.ok) return currentVault;

    const payload = normalizeRenameFileInput(input);
    if (!payload.ok) return payload;

    const source = currentVault.vault.resolve(payload.sourcePath, { allowRoot: false });
    if (!source.ok) return source;
    if (!isMarkdownPath(source.relativePath)) {
      return fail('not_markdown', 'Only Markdown files can be renamed in V1 Rename Light.');
    }
    if (!fileSystem.existsSync(source.absolutePath)) {
      return fail('file_not_found', 'Cannot rename a missing file.');
    }

    let stat;
    try {
      stat = fileSystem.statSync(source.absolutePath);
    } catch (error) {
      return fail('stat_failed', 'Could not inspect source file.');
    }
    if (!stat.isFile()) return fail('not_a_file', 'Only files can be renamed.');

    const parentFolder = source.relativePath.includes('/')
      ? source.relativePath.slice(0, source.relativePath.lastIndexOf('/'))
      : '';
    const targetPath = parentFolder ? parentFolder + '/' + payload.fileName : payload.fileName;
    if (targetPath === source.relativePath) return fail('no_changes', 'Rename target is unchanged.');

    const target = currentVault.vault.resolve(targetPath, { allowRoot: false });
    if (!target.ok) return target;
    if (fileSystem.existsSync(target.absolutePath)) {
      return fail('file_exists', 'Rename target already exists.');
    }

    const backup = backupService.backupMarkdownNote(source.relativePath, { action: 'rename_file' });
    if (!backup.ok) return backup;

    const transaction = executeAuditedMutation({
      auditService,
      mutate() {
        fileSystem.renameSync(source.absolutePath, target.absolutePath);
      },
      rollback() {
        fileSystem.renameSync(target.absolutePath, source.absolutePath);
      },
      auditEntry: {
        action: 'rename_file',
        path: source.relativePath,
        targetPath: target.relativePath,
        backupPath: backup.backupPath,
        result: 'renamed',
        linksUpdated: false
      },
      mutationFailureCode: 'rename_failed',
      mutationFailureMessage: 'Could not rename file.'
    });
    if (!transaction.ok) return transaction;

    return ok({
      action: 'rename_file',
      path: source.relativePath,
      targetPath: target.relativePath,
      backupPath: backup.backupPath,
      linksUpdated: false,
      warning: 'Links were not updated in V1 Rename Light.'
    });
  }
  function requireVault() {
    if (!vault) return fail('vault_not_open', 'No vault is open.');
    return { ok: true, vault };
  }

  function validateNewParentNames(relativePath) {
    const segments = relativePath ? relativePath.split('/') : [];
    for (let index = 0; index < segments.length; index += 1) {
      const prefix = vault.resolve(segments.slice(0, index + 1).join('/'), { allowRoot: false });
      if (!prefix.ok) return prefix;
      if (!fileSystem.existsSync(prefix.absolutePath)) {
        const validation = validateNewName(segments[index]);
        if (!validation.ok) return validation;
      }
    }
    return { ok: true };
  }

  return Object.freeze({
    setRoot,
    createFolder,
    createNote,
    updateNote,
    renameFile
  });
}

function getPayloadLimits(settingsStore, fallback) {
  const settings = settingsStore && typeof settingsStore.getSettings === 'function' ? settingsStore.getSettings() : null;
  return normalizePayloadLimits(settings && settings.limits ? settings.limits : fallback);
}

function normalizeCreateNoteInput(input) {
  const title = String(input && input.title ? input.title : '');
  if (!title) return fail('invalid_title', 'Note title is required.');
  const titleValidation = validateNewName(title);
  if (!titleValidation.ok) return titleValidation;

  const targetFolder = String(input && input.targetFolder ? input.targetFolder : '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  const fileName = toMarkdownFileName(title);
  const nameValidation = validateNewName(fileName);
  if (!nameValidation.ok) return nameValidation;
  return ok({
    targetFolder,
    fileName,
    content: String(input && input.content ? input.content : '')
  });
}

function normalizeCreateFolderInput(input) {
  const targetFolder = String(input && input.targetFolder ? input.targetFolder : '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (!targetFolder) return fail('invalid_target_folder', 'Target folder is required.');
  return ok({ targetFolder });
}

function normalizeUpdateNoteInput(input) {
  const targetPath = String(input && input.targetPath ? input.targetPath : '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (!targetPath) return fail('invalid_target_path', 'Target path is required.');
  if (!isMarkdownPath(targetPath)) return fail('not_markdown', 'Only Markdown notes can be updated.');
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

function normalizeRenameFileInput(input) {
  const sourcePath = String(input && input.sourcePath ? input.sourcePath : '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (!sourcePath) return fail('invalid_source_path', 'Source path is required.');
  if (!isMarkdownPath(sourcePath)) return fail('not_markdown', 'Only Markdown files can be renamed in V1 Rename Light.');

  const rawName = String(input && input.newName ? input.newName : '');
  if (!rawName) return fail('invalid_name', 'New file name is required.');
  if (/[\\/]/.test(rawName)) return fail('path_not_allowed', 'Rename Light only changes the file name, not the folder.');
  const rawValidation = validateNewName(rawName);
  if (!rawValidation.ok) return rawValidation;
  const fileName = toRenameFileName(rawName, sourcePath);
  const nameValidation = validateNewName(fileName);
  if (!nameValidation.ok) return nameValidation;

  return ok({
    sourcePath,
    fileName
  });
}

function toRenameFileName(name, sourcePath) {
  const base = String(name || '');
  return isMarkdownPath(base) ? base : base + path.extname(sourcePath);
}
function toMarkdownFileName(title) {
  const base = String(title || '');
  return isMarkdownPath(base) ? base : base + '.md';
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
