'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createVaultAuditService } = require('../audit/vaultAuditService');
const { createVaultContext } = require('../vault/vaultContext');
const { executeAuditedMutation } = require('../vault/vaultWriteTransaction');
const {
  normalizePayloadLimits,
  validateCreateNotePayload
} = require('../../shared/security/payloadLimits');

const MAX_TEMPLATE_FILES = 128;
const MAX_TEMPLATE_FOLDERS = 128;
const MAX_TEMPLATE_TOTAL_BYTES = 8 * 1024 * 1024;

function createReviewedTemplateService(options) {
  options = options || {};
  const fileSystem = options.fs || fs;
  const auditService = options.auditService || createVaultAuditService({
    fs: fileSystem,
    now: options.now
  });
  const settingsStore = options.settingsStore || null;
  let vault = null;

  function setRoot(vaultRoot) {
    if (typeof vaultRoot !== 'string' || !vaultRoot.trim()) {
      return fail('invalid_vault_root', 'Vault root is required.');
    }
    const root = path.resolve(vaultRoot);
    try {
      if (!fileSystem.statSync(root).isDirectory()) {
        return fail('vault_not_directory', 'Vault root must be a directory.');
      }
    } catch (_error) {
      return fail('vault_not_found', 'Vault root does not exist.');
    }
    vault = createVaultContext(root);
    auditService.setRoot(root);
    return ok({ root: vault.root });
  }

  function createFromReview(input) {
    if (!vault) return fail('vault_not_open', 'No vault is open.');
    const plan = preparePlan(input);
    if (!plan.ok) return plan;

    const createdFolders = [];
    const created = [];
    const transaction = executeAuditedMutation({
      auditService,
      mutate() {
        plan.folders.forEach((folder) => {
          fileSystem.mkdirSync(folder.absolutePath);
          createdFolders.push(folder.relativePath);
        });
        plan.files.forEach((file) => {
          fileSystem.writeFileSync(file.absolutePath, file.content, {
            encoding: 'utf8',
            flag: 'wx'
          });
          created.push(file.relativePath);
        });
      },
      rollback() {
        created.slice().reverse().forEach((relativePath) => {
          const resolved = vault.resolve(relativePath, { allowRoot: false });
          if (resolved.ok && fileSystem.existsSync(resolved.absolutePath)) {
            fileSystem.unlinkSync(resolved.absolutePath);
          }
        });
        createdFolders.slice().reverse().forEach((relativePath) => {
          const resolved = vault.resolve(relativePath, { allowRoot: false });
          if (resolved.ok && fileSystem.existsSync(resolved.absolutePath)) {
            fileSystem.rmdirSync(resolved.absolutePath);
          }
        });
      },
      auditEntry: {
        action: 'create_from_template',
        path: plan.targetPath,
        createdFolders: plan.folders.map((folder) => folder.relativePath),
        created: plan.files.map((file) => file.relativePath),
        result: 'created'
      },
      mutationFailureCode: 'template_create_failed',
      mutationFailureMessage: 'Could not create the reviewed template.'
    });
    if (!transaction.ok) return transaction;

    return ok({
      action: 'create_from_template',
      path: plan.targetPath,
      createdFolders,
      created
    });
  }

  function preparePlan(input) {
    const targetPath = normalizeRelativePath(input && (input.targetPath || input.templatePlanRootPath));
    if (!targetPath) return fail('invalid_template_target', 'Template target path is required.');

    const rawFolders = Array.isArray(input && input.folders) ? input.folders : [];
    const rawFiles = Array.isArray(input && input.files) ? input.files : [];
    if (!rawFiles.length) return fail('invalid_template_files', 'Template must contain at least one file.');
    if (rawFiles.length > MAX_TEMPLATE_FILES || rawFolders.length > MAX_TEMPLATE_FOLDERS) {
      return fail('template_too_large', 'Template contains too many files or folders.');
    }

    const root = vault.resolve(targetPath, { allowRoot: false });
    if (!root.ok) return root;
    const rootParent = path.dirname(root.absolutePath);
    try {
      if (!fileSystem.statSync(rootParent).isDirectory()) {
        return fail('template_parent_missing', 'Template parent folder is unavailable.');
      }
    } catch (_error) {
      return fail('template_parent_missing', 'Template parent folder is unavailable.');
    }
    if (fileSystem.existsSync(root.absolutePath)) {
      return fail('template_target_exists', 'Template target already exists.');
    }

    const folderPaths = collectFolderPaths(targetPath, rawFolders, rawFiles);
    if (!folderPaths.ok) return folderPaths;
    const folders = [];
    for (const folderPath of folderPaths.paths) {
      const resolved = vault.resolve(folderPath, { allowRoot: false });
      if (!resolved.ok) return resolved;
      if (fileSystem.existsSync(resolved.absolutePath)) {
        return fail('template_target_exists', 'Template folder already exists: ' + resolved.relativePath);
      }
      folders.push(resolved);
    }

    const limits = getPayloadLimits(settingsStore, options.payloadLimits);
    const seenFiles = new Set();
    const files = [];
    let totalBytes = 0;
    for (const rawFile of rawFiles) {
      const filePath = normalizeRelativePath(rawFile && rawFile.path);
      if (!isWithinRoot(filePath, targetPath)) {
        return fail('template_path_outside_root', 'Template files must stay inside the reviewed project root.');
      }
      if (!filePath.toLowerCase().endsWith('.md')) {
        return fail('not_markdown', 'Reviewed templates may create Markdown files only.');
      }
      if (seenFiles.has(filePath.toLowerCase())) {
        return fail('duplicate_template_path', 'Template contains a duplicate file path.');
      }
      seenFiles.add(filePath.toLowerCase());
      const content = String(rawFile && rawFile.content || '');
      const contentValidation = validateCreateNotePayload(content, limits);
      if (!contentValidation.ok) return contentValidation;
      totalBytes += Buffer.byteLength(content, 'utf8');
      if (totalBytes > MAX_TEMPLATE_TOTAL_BYTES) {
        return fail('template_too_large', 'Template content exceeds the reviewed creation limit.');
      }
      const resolved = vault.resolve(filePath, { allowRoot: false });
      if (!resolved.ok) return resolved;
      if (fileSystem.existsSync(resolved.absolutePath)) {
        return fail('template_target_exists', 'Template file already exists: ' + resolved.relativePath);
      }
      files.push(Object.assign({}, resolved, { content }));
    }

    return ok({ targetPath: root.relativePath, folders, files });
  }

  return Object.freeze({ setRoot, createFromReview });
}

function collectFolderPaths(targetPath, folders, files) {
  const paths = new Set([targetPath]);
  for (const value of folders) {
    const folderPath = normalizeRelativePath(value);
    if (!isWithinRoot(folderPath, targetPath)) {
      return fail('template_path_outside_root', 'Template folders must stay inside the reviewed project root.');
    }
    addPathAndParents(paths, folderPath, targetPath);
  }
  for (const file of files) {
    const filePath = normalizeRelativePath(file && file.path);
    const separator = filePath.lastIndexOf('/');
    if (separator > 0) addPathAndParents(paths, filePath.slice(0, separator), targetPath);
  }
  return ok({
    paths: Array.from(paths).sort((left, right) => pathDepth(left) - pathDepth(right) || left.localeCompare(right))
  });
}

function addPathAndParents(paths, folderPath, targetPath) {
  let current = folderPath;
  while (isWithinRoot(current, targetPath)) {
    paths.add(current);
    if (current === targetPath) break;
    current = current.slice(0, current.lastIndexOf('/'));
  }
}

function isWithinRoot(value, root) {
  return !!value && (value === root || value.startsWith(root + '/'));
}

function pathDepth(value) {
  return String(value || '').split('/').filter(Boolean).length;
}

function normalizeRelativePath(value) {
  return String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/+/g, '/');
}

function getPayloadLimits(settingsStore, fallback) {
  const settings = settingsStore && typeof settingsStore.getSettings === 'function'
    ? settingsStore.getSettings()
    : null;
  return normalizePayloadLimits(settings && settings.limits ? settings.limits : fallback);
}

function ok(value) {
  return Object.assign({ ok: true }, value || {});
}

function fail(code, message) {
  return { ok: false, code, message };
}

module.exports = {
  MAX_TEMPLATE_FILES,
  MAX_TEMPLATE_FOLDERS,
  MAX_TEMPLATE_TOTAL_BYTES,
  createReviewedTemplateService
};
