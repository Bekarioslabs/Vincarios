'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { CURRENT_INTERNAL_NAMESPACE } = require('../../shared/internalNamespace');
const { migrateInternalNamespaceDirectory } = require('./internalNamespaceMigration');

const PORTABLE_DATA_FOLDER = CURRENT_INTERNAL_NAMESPACE;
const SETTINGS_FILE_NAME = 'settings.json';

function getPortableDataRoot(projectRoot, pathApi) {
  const pathImplementation = pathApi || path;
  const root = String(projectRoot || '').trim();
  if (!root) return '';
  return pathImplementation.join(pathImplementation.resolve(root), PORTABLE_DATA_FOLDER);
}

function getPortableSettingsPath(projectRoot, options) {
  const configuredDataRoot = options && String(options.dataRoot || '').trim();
  const dataRoot = configuredDataRoot ? path.resolve(configuredDataRoot) : getPortableDataRoot(projectRoot);
  return dataRoot ? path.join(dataRoot, SETTINGS_FILE_NAME) : '';
}

function migrateLegacyPortableNamespace(projectRoot, options) {
  const configuredDataRoot = options && String(options.dataRoot || '').trim();
  const currentPath = configuredDataRoot ? path.resolve(configuredDataRoot) : getPortableDataRoot(projectRoot);
  return migrateInternalNamespaceDirectory({ currentPath });
}

function getLegacyUserDataSettingsPath(app) {
  if (!app || typeof app.getPath !== 'function') return '';
  try {
    return path.join(app.getPath('userData'), SETTINGS_FILE_NAME);
  } catch (error) {
    return '';
  }
}

function migrateLegacySettingsToPortable(options) {
  options = options || {};
  const fileSystem = options.fs || fs;
  const portablePath = options.portablePath || getPortableSettingsPath(options.projectRoot);
  const legacyPath = options.legacyPath || getLegacyUserDataSettingsPath(options.app);
  if (!portablePath || !legacyPath || portablePath === legacyPath) {
    return { ok: true, migrated: false, portablePath, legacyPath };
  }

  try {
    const legacyExists = fileSystem.existsSync(legacyPath);
    const portableExists = fileSystem.existsSync(portablePath);
    if (!legacyExists) return { ok: true, migrated: false, portablePath, legacyPath };

    if (!portableExists) {
      fileSystem.mkdirSync(path.dirname(portablePath), { recursive: true });
      fileSystem.copyFileSync(legacyPath, portablePath);
    }
    fileSystem.unlinkSync(legacyPath);
    return { ok: true, migrated: !portableExists, removedLegacy: true, portablePath, legacyPath };
  } catch (error) {
    return {
      ok: false,
      code: 'settings_migration_failed',
      message: 'Could not migrate legacy settings from userData to portable storage.',
      portablePath,
      legacyPath
    };
  }
}

module.exports = {
  PORTABLE_DATA_FOLDER,
  SETTINGS_FILE_NAME,
  getPortableDataRoot,
  getPortableSettingsPath,
  migrateLegacyPortableNamespace,
  getLegacyUserDataSettingsPath,
  migrateLegacySettingsToPortable
};
