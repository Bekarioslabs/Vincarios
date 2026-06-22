'use strict';

const path = require('node:path');

const DEFAULT_BLOCKED_DOT_SEGMENTS = new Set([
  '.git',
  '.obsidian',
  '.zeus',
  '.zeus_backups'
]);

function normalizeVaultRelativePath(input, options) {
  options = options || {};
  const allowRoot = options.allowRoot !== false;
  const blockedDotSegments = options.blockedDotSegments || DEFAULT_BLOCKED_DOT_SEGMENTS;

  if (typeof input !== 'string') {
    return fail('invalid_type', 'Path must be a string.');
  }

  const raw = input.trim();
  if (!raw) {
    return allowRoot
      ? ok('')
      : fail('root_not_allowed', 'Vault root is not allowed here.');
  }

  if (raw.includes('\0')) {
    return fail('invalid_path', 'Path contains a null byte.');
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) {
    return fail('url_not_allowed', 'URLs are not vault-relative paths.');
  }

  if (path.win32.isAbsolute(raw) || path.posix.isAbsolute(raw)) {
    return fail('absolute_not_allowed', 'Absolute paths are not allowed.');
  }

  if (/^[a-zA-Z]:/.test(raw)) {
    return fail('drive_not_allowed', 'Drive-qualified paths are not allowed.');
  }

  let normalized = raw.replace(/\\/g, '/').replace(/\/+/g, '/');
  while (normalized.startsWith('./')) normalized = normalized.slice(2);
  normalized = normalized.replace(/\/+$/g, '');

  if (!normalized) {
    return allowRoot
      ? ok('')
      : fail('root_not_allowed', 'Vault root is not allowed here.');
  }

  const segments = normalized.split('/');
  for (const segment of segments) {
    if (!segment || segment === '.') {
      return fail('invalid_segment', 'Path contains an empty or current-directory segment.');
    }
    if (segment === '..') {
      return fail('traversal_not_allowed', 'Path traversal is not allowed.');
    }
    if (segment.includes(':')) {
      return fail('invalid_segment', 'Path segment contains a colon.');
    }
    if (segment.startsWith('.') && blockedDotSegments.has(segment.toLowerCase())) {
      return fail('protected_path', 'Protected runtime folders are not allowed.');
    }
  }

  return ok(segments.join('/'));
}

function resolveInsideVault(vaultRoot, relativePath, options) {
  options = options || {};
  if (typeof vaultRoot !== 'string' || !vaultRoot.trim()) {
    return fail('invalid_vault_root', 'Vault root is required.');
  }

  const root = path.resolve(vaultRoot);
  const normalized = normalizeVaultRelativePath(relativePath || '', options);
  if (!normalized.ok) return normalized;

  const target = normalized.value
    ? path.resolve(root, ...normalized.value.split('/'))
    : root;

  const relation = path.relative(root, target);
  if (relation && (relation.startsWith('..') || path.isAbsolute(relation))) {
    return fail('outside_vault', 'Resolved path escapes the vault.');
  }

  return {
    ok: true,
    absolutePath: target,
    relativePath: normalized.value,
    vaultRoot: root
  };
}

function isBlockedDotPath(relativePath) {
  const normalized = normalizeVaultRelativePath(relativePath);
  return !normalized.ok && normalized.code === 'protected_path';
}

function ok(value) {
  return { ok: true, value };
}

function fail(code, message) {
  return {
    ok: false,
    code,
    message
  };
}

module.exports = {
  DEFAULT_BLOCKED_DOT_SEGMENTS,
  normalizeVaultRelativePath,
  resolveInsideVault,
  isBlockedDotPath
};