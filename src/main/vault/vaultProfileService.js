'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createVaultContext } = require('./vaultContext');
const { DEFAULT_FOLDERS } = require('../../shared/vaultProfile/defaults');
const { normalizeRoleVisuals, normalizeTopLevelFolderVisuals } = require('../../shared/vaultProfile/folderVisuals');
const { CURRENT_INTERNAL_NAMESPACE } = require('../../shared/internalNamespace');

const PROFILE_RELATIVE_PATH = path.join(CURRENT_INTERNAL_NAMESPACE, 'profile.json');
const PROFILE_VERSION = 2;
const ROLE_IDS = Object.freeze(Object.keys(DEFAULT_FOLDERS));

function createVaultProfileService(options) {
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

  function getProfile() {
    const current = requireVault();
    if (!current.ok) return current;
    const profile = readProfile(current.vault.root);
    if (!profile.ok) return profile;
    return ok({ profile: resolveEffectiveProfile(current.vault.root, profile.value) });
  }

  function setRole(input) {
    const current = requireVault();
    if (!current.ok) return current;
    const normalized = normalizeRoleInput(input);
    if (!normalized.ok) return normalized;
    const profile = readProfile(current.vault.root);
    if (!profile.ok) return profile;
    const raw = migrateLegacyVisuals(current.vault.root, profile.value);

    if (!normalized.folderPath) {
      raw.roles[normalized.role] = null;
      delete raw.roleVisuals[normalized.role];
      return saveAndResolve(current.vault.root, raw);
    }

    const folder = resolveExistingTopLevelFolder(current.vault.root, normalized.folderPath);
    if (!folder.ok) return folder;
    const effective = resolveEffectiveProfile(current.vault.root, raw);
    const conflict = Object.keys(effective.roles).find((role) => (
      role !== normalized.role && sameFolder(effective.roles[role], folder.path)
    ));
    if (conflict) return fail('folder_role_conflict', 'This folder is already assigned to the ' + conflict + ' role.');

    raw.roles[normalized.role] = folder.path;
    if (normalized.visual) raw.roleVisuals[normalized.role] = normalized.visual;
    return saveAndResolve(current.vault.root, raw);
  }

  function listLocalIcons() {
    const current = requireVault();
    if (!current.ok) return current;
    const iconRoot = path.join(current.vault.root, CURRENT_INTERNAL_NAMESPACE, 'icons');
    if (!fileSystem.existsSync(iconRoot)) return ok({ icons: [] });
    try {
      const icons = fileSystem.readdirSync(iconRoot, { withFileTypes: true })
        .filter((entry) => entry.isFile() && /\.svg$/i.test(entry.name))
        .sort((left, right) => left.name.localeCompare(right.name))
        .reduce((result, entry) => {
          const absolutePath = path.join(iconRoot, entry.name);
          const stat = fileSystem.statSync(absolutePath);
          if (stat.size > 131072) return result;
          const source = fileSystem.readFileSync(absolutePath, 'utf8');
          if (!isSafeSvg(source)) return result;
          result.push({
            kind: 'custom',
            path: CURRENT_INTERNAL_NAMESPACE + '/icons/' + entry.name,
            src: 'data:image/svg+xml;base64,' + Buffer.from(source, 'utf8').toString('base64')
          });
          return result;
        }, []);
      return ok({ icons });
    } catch (error) {
      return fail('icon_list_failed', 'Vault SVG icons could not be listed.');
    }
  }
  function resetRole(input) {
    const current = requireVault();
    if (!current.ok) return current;
    const role = normalizeRole(input && input.role);
    if (!role) return fail('invalid_role', 'A supported Vault Role is required.');
    const profile = readProfile(current.vault.root);
    if (!profile.ok) return profile;
    const raw = migrateLegacyVisuals(current.vault.root, profile.value);
    delete raw.roles[role];
    delete raw.roleVisuals[role];
    return saveAndResolve(current.vault.root, raw);
  }

  function saveAndResolve(root, profile) {
    const saved = writeProfile(root, profile);
    if (!saved.ok) return saved;
    return getProfile();
  }

  function readProfile(root) {
    const profilePath = path.join(root, PROFILE_RELATIVE_PATH);
    if (!fileSystem.existsSync(profilePath)) return ok({ value: createEmptyProfile() });
    try {
      const parsed = JSON.parse(fileSystem.readFileSync(profilePath, 'utf8'));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fail('invalid_profile', 'Vitruvios Vault Profile is invalid.');
      return ok({ value: normalizeProfile(parsed) });
    } catch (error) {
      return fail('invalid_profile', 'Vitruvios Vault Profile could not be read.');
    }
  }

  function writeProfile(root, profile) {
    const profilePath = path.join(root, PROFILE_RELATIVE_PATH);
    const temporaryPath = profilePath + '.tmp';
    try {
      fileSystem.mkdirSync(path.dirname(profilePath), { recursive: true });
      fileSystem.writeFileSync(temporaryPath, JSON.stringify(normalizeProfile(profile, { preserveLegacy: false }), null, 2) + '\n', 'utf8');
      fileSystem.renameSync(temporaryPath, profilePath);
      return ok({ profilePath: PROFILE_RELATIVE_PATH });
    } catch (error) {
      try { if (fileSystem.existsSync(temporaryPath)) fileSystem.unlinkSync(temporaryPath); } catch (cleanupError) {}
      return fail('profile_write_failed', 'Vault Profile could not be saved.');
    }
  }

  function resolveEffectiveProfile(root, profile) {
    const normalized = migrateLegacyVisuals(root, profile);
    const folders = listTopLevelFolders(root);
    const roles = {};

    ROLE_IDS.forEach((role) => {
      if (Object.prototype.hasOwnProperty.call(normalized.roles, role)) {
        const configured = normalized.roles[role];
        const canonical = configured ? folders[configured.toLocaleLowerCase()] : '';
        if (canonical) roles[role] = canonical;
        return;
      }
      const detected = folders[String(DEFAULT_FOLDERS[role]).toLocaleLowerCase()];
      if (detected) roles[role] = detected;
    });

    return {
      version: PROFILE_VERSION,
      roles,
      roleVisuals: hydrateCustomIconSources(root, normalized.roleVisuals, fileSystem)
    };
  }

  function migrateLegacyVisuals(root, profile) {
    const normalized = normalizeProfile(profile);
    const legacy = normalizeTopLevelFolderVisuals(normalized.folderVisuals);
    if (Object.keys(legacy).length === 0) return normalized;

    const folders = listTopLevelFolders(root);
    const migrated = Object.assign({}, normalized, { roleVisuals: Object.assign({}, normalized.roleVisuals) });
    ROLE_IDS.forEach((role) => {
      if (migrated.roleVisuals[role]) return;
      const candidate = folders[String(DEFAULT_FOLDERS[role]).toLocaleLowerCase()];
      if (!candidate) return;
      const legacyVisual = legacy[candidate];
      if (legacyVisual) migrated.roleVisuals[role] = legacyVisual;
    });
    delete migrated.folderVisuals;
    return migrated;
  }

  function resolveExistingTopLevelFolder(root, requestedPath) {
    const folders = listTopLevelFolders(root);
    const canonical = folders[String(requestedPath || '').toLocaleLowerCase()];
    return canonical
      ? ok({ path: canonical })
      : fail('folder_not_found', 'Selected top-level folder no longer exists.');
  }

  function listTopLevelFolders(root) {
    try {
      return fileSystem.readdirSync(root, { withFileTypes: true }).reduce((result, entry) => {
        if (!entry.isDirectory() || entry.name.startsWith('.')) return result;
        result[entry.name.toLocaleLowerCase()] = entry.name;
        return result;
      }, {});
    } catch (error) {
      return {};
    }
  }

  function requireVault() {
    return vault ? { ok: true, vault } : fail('vault_not_open', 'No vault is open.');
  }

  return { setRoot, getProfile, setRole, resetRole, listLocalIcons };
}

function hydrateCustomIconSources(root, roleVisuals, fileSystem) {
  return Object.keys(roleVisuals || {}).reduce((result, role) => {
    const visual = roleVisuals[role];
    const copy = { icon: Object.assign({}, visual.icon), color: Object.assign({}, visual.color) };
    if (copy.icon.kind === 'custom') {
      const absolute = path.join(root, copy.icon.path);
      try {
        const source = fileSystem.readFileSync(absolute, 'utf8');
        if (source && isSafeSvg(source)) copy.icon.src = 'data:image/svg+xml;base64,' + Buffer.from(source, 'utf8').toString('base64');
      } catch (error) {}
    }
    result[role] = copy;
    return result;
  }, {});
}

function isSafeSvg(source) {
  const svg = String(source || '');
  return /<svg[\s>]/i.test(svg) && !/<\/?(?:script|foreignObject|iframe|object|embed)\b/i.test(svg) && !/\son[a-z]+\s*=/i.test(svg) && !/\b(?:href|xlink:href)\s*=\s*["']\s*(?:https?:|data:|javascript:)/i.test(svg);
}

function normalizeRoleInput(input) {
  const role = normalizeRole(input && input.role);
  if (!role) return fail('invalid_role', 'A supported Vault Role is required.');
  const folderPath = normalizeTopLevelPath(input && input.folderPath);
  if (input && input.folderPath && !folderPath) return fail('invalid_folder_path', 'Vault Roles support top-level folders only in V1.');
  const visual = input && Object.prototype.hasOwnProperty.call(input, 'visual')
    ? normalizeRoleVisuals({ [role]: input.visual })[role]
    : null;
  if (input && Object.prototype.hasOwnProperty.call(input, 'visual') && !visual) {
    return fail('invalid_role_visual', 'Vault Role appearance must use a supported icon and color.');
  }
  return { ok: true, role, folderPath, visual };
}

function normalizeProfile(value, options) {
  options = options || {};
  const profile = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const normalized = Object.assign({}, profile, {
    version: PROFILE_VERSION,
    roles: normalizeRoleAssignments(profile.roles),
    roleVisuals: normalizeRoleVisuals(profile.roleVisuals)
  });
  if (options.preserveLegacy !== false && profile.folderVisuals) {
    normalized.folderVisuals = normalizeTopLevelFolderVisuals(profile.folderVisuals);
  } else {
    delete normalized.folderVisuals;
  }
  return normalized;
}

function normalizeRoleAssignments(value) {
  const source = value && typeof value === 'object' ? value : {};
  return ROLE_IDS.reduce((result, role) => {
    if (!Object.prototype.hasOwnProperty.call(source, role)) return result;
    const valueForRole = source[role];
    if (valueForRole === null) {
      result[role] = null;
      return result;
    }
    const normalized = normalizeTopLevelPath(valueForRole);
    if (normalized) result[role] = normalized;
    return result;
  }, {});
}

function normalizeRole(value) {
  const role = String(value || '').trim();
  return ROLE_IDS.includes(role) ? role : '';
}

function normalizeTopLevelPath(value) {
  const normalized = String(value || '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (!normalized || normalized.includes('/') || normalized === '.' || normalized === '..' || normalized.startsWith('.')) return '';
  return normalized;
}

function sameFolder(left, right) {
  return String(left || '').toLocaleLowerCase() === String(right || '').toLocaleLowerCase();
}

function createEmptyProfile() {
  return { version: PROFILE_VERSION, roles: {}, roleVisuals: {} };
}

function ok(value) {
  return Object.assign({ ok: true }, value);
}

function fail(code, message) {
  return { ok: false, code, message };
}

module.exports = {
  PROFILE_RELATIVE_PATH,
  ROLE_IDS,
  createVaultProfileService,
  normalizeProfile,
  normalizeRoleInput
};