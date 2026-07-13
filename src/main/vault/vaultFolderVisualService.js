'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createVaultContext } = require('./vaultContext');
const { normalizeTopLevelFolderVisuals } = require('../../shared/vaultProfile/folderVisuals');

const PROFILE_RELATIVE_PATH = path.join('.zeus', 'profile.json');
const PROFILE_VERSION = 1;

function createVaultFolderVisualService(options) {
  options = options || {};
  const fileSystem = options.fs || fs;
  let vault = null;

  function setRoot(vaultRoot) {
    if (typeof vaultRoot !== 'string' || !vaultRoot.trim()) return fail('invalid_vault_root', 'Vault root is required.');

    const resolvedRoot = path.resolve(vaultRoot);
    try {
      if (!fileSystem.statSync(resolvedRoot).isDirectory()) return fail('vault_not_directory', 'Vault root must be a directory.');
    } catch (error) {
      return fail('vault_not_found', 'Vault root does not exist.');
    }

    vault = createVaultContext(resolvedRoot);
    return ok({ root: vault.root });
  }

  function getFolderVisuals() {
    const current = requireVault();
    if (!current.ok) return current;
    const profile = readProfile(current.vault.root);
    if (!profile.ok) return profile;
    return ok({ visuals: profile.value.folderVisuals });
  }

  function setFolderVisual(input) {
    const current = requireVault();
    if (!current.ok) return current;
    const normalized = normalizeVisualInput(input);
    if (!normalized.ok) return normalized;
    const folder = resolveExistingTopLevelFolder(current.vault.root, normalized.path);
    if (!folder.ok) return folder;

    const profile = readProfile(current.vault.root);
    if (!profile.ok) return profile;
    profile.value.folderVisuals[normalized.path] = normalized.visual;
    const saved = writeProfile(current.vault.root, profile.value);
    if (!saved.ok) return saved;
    return ok({ path: normalized.path, visual: normalized.visual, visuals: profile.value.folderVisuals });
  }

  function clearFolderVisual(input) {
    const current = requireVault();
    if (!current.ok) return current;
    const normalizedPath = normalizeTopLevelPath(input && input.path);
    if (!normalizedPath) return fail('invalid_folder_path', 'Folder visual settings support top-level folders only.');
    const folder = resolveExistingTopLevelFolder(current.vault.root, normalizedPath);
    if (!folder.ok) return folder;

    const profile = readProfile(current.vault.root);
    if (!profile.ok) return profile;
    delete profile.value.folderVisuals[normalizedPath];
    const saved = writeProfile(current.vault.root, profile.value);
    if (!saved.ok) return saved;
    return ok({ path: normalizedPath, visuals: profile.value.folderVisuals });
  }

  function readProfile(root) {
    const profilePath = path.join(root, PROFILE_RELATIVE_PATH);
    if (!fileSystem.existsSync(profilePath)) return ok({ value: createEmptyProfile() });
    try {
      const parsed = JSON.parse(fileSystem.readFileSync(profilePath, 'utf8'));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fail('invalid_profile', 'ZEUS vault profile is invalid.');
      return ok({ value: normalizeProfile(parsed) });
    } catch (error) {
      return fail('invalid_profile', 'ZEUS vault profile could not be read.');
    }
  }

  function writeProfile(root, profile) {
    const profilePath = path.join(root, PROFILE_RELATIVE_PATH);
    const temporaryPath = profilePath + '.tmp';
    try {
      fileSystem.mkdirSync(path.dirname(profilePath), { recursive: true });
      fileSystem.writeFileSync(temporaryPath, JSON.stringify(normalizeProfile(profile), null, 2) + '\n', 'utf8');
      fileSystem.renameSync(temporaryPath, profilePath);
      return ok({ profilePath: PROFILE_RELATIVE_PATH });
    } catch (error) {
      try { if (fileSystem.existsSync(temporaryPath)) fileSystem.unlinkSync(temporaryPath); } catch (cleanupError) {}
      return fail('profile_write_failed', 'Folder appearance could not be saved.');
    }
  }

  function resolveExistingTopLevelFolder(root, relativePath) {
    const absolutePath = path.resolve(root, relativePath);
    if (path.dirname(absolutePath) !== root) return fail('invalid_folder_path', 'Folder visual settings support top-level folders only.');
    try {
      if (!fileSystem.statSync(absolutePath).isDirectory()) return fail('folder_not_found', 'Selected folder no longer exists.');
    } catch (error) {
      return fail('folder_not_found', 'Selected folder no longer exists.');
    }
    return ok({ path: relativePath });
  }

  function requireVault() {
    return vault ? { ok: true, vault } : fail('vault_not_open', 'No vault is open.');
  }

  return { setRoot, getFolderVisuals, setFolderVisual, clearFolderVisual };
}

function normalizeVisualInput(input) {
  const normalizedPath = normalizeTopLevelPath(input && input.path);
  const visuals = normalizeTopLevelFolderVisuals(normalizedPath ? { [normalizedPath]: input && input.visual } : {});
  const visual = normalizedPath ? visuals[normalizedPath] : null;
  return normalizedPath && visual
    ? { ok: true, path: normalizedPath, visual }
    : fail('invalid_folder_visual', 'Folder appearance must use a supported icon and color.');
}

function normalizeTopLevelPath(value) {
  const normalized = String(value || '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (!normalized || normalized.includes('/') || normalized === '.' || normalized === '..' || normalized.startsWith('.')) return '';
  return normalized;
}

function createEmptyProfile() {
  return { version: PROFILE_VERSION, folderVisuals: {} };
}

function normalizeProfile(value) {
  const profile = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return Object.assign({}, profile, {
    version: Number.isInteger(profile.version) ? profile.version : PROFILE_VERSION,
    folderVisuals: normalizeTopLevelFolderVisuals(profile.folderVisuals)
  });
}

function ok(value) {
  return Object.assign({ ok: true }, value);
}

function fail(code, message) {
  return { ok: false, code, message };
}

module.exports = {
  PROFILE_RELATIVE_PATH,
  createVaultFolderVisualService,
  normalizeVisualInput,
  normalizeProfile
};
