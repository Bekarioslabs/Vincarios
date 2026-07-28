'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  getPortableDataRoot,
  getPortableSettingsPath,
  migrateLegacyPortableNamespace,
  migrateLegacySettingsToPortable
} = require('../src/main/app/portableDataPath');

test('portable settings live under the project .vincarios folder, not Electron userData', () => {
  const projectRoot = path.join(os.tmpdir(), 'vincarios-portable-root');

  assert.equal(getPortableDataRoot(projectRoot), path.join(projectRoot, '.vincarios'));
  assert.equal(getPortableSettingsPath(projectRoot), path.join(projectRoot, '.vincarios', 'settings.json'));
});

test('portable settings use the runtime data root when a packaged build provides one', () => {
  const projectRoot = path.join(os.tmpdir(), 'vincarios-packaged-source');
  const dataRoot = path.join(os.tmpdir(), 'vincarios-portable-release', '.vincarios');

  assert.equal(getPortableSettingsPath(projectRoot, { dataRoot }), path.join(dataRoot, 'settings.json'));
});

test('legacy userData settings migrate to portable storage and remove the old file', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-portable-migration-'));
  const projectRoot = path.join(root, 'app');
  const userData = path.join(root, 'AppData');
  const legacyPath = path.join(userData, 'settings.json');
  const portablePath = path.join(projectRoot, '.vincarios', 'settings.json');
  fs.mkdirSync(userData, { recursive: true });
  fs.writeFileSync(legacyPath, '{\"version\":1}\n', 'utf8');

  const result = migrateLegacySettingsToPortable({ projectRoot, legacyPath, portablePath });

  assert.equal(result.ok, true);
  assert.equal(result.migrated, true);
  assert.equal(result.removedLegacy, true);
  assert.equal(fs.existsSync(legacyPath), false);
  assert.equal(fs.readFileSync(portablePath, 'utf8'), '{\"version\":1}\n');
});

test('legacy settings are removed but do not overwrite existing portable settings', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-portable-existing-'));
  const legacyPath = path.join(root, 'AppData', 'settings.json');
  const portablePath = path.join(root, 'App', '.vincarios', 'settings.json');
  fs.mkdirSync(path.dirname(legacyPath), { recursive: true });
  fs.mkdirSync(path.dirname(portablePath), { recursive: true });
  fs.writeFileSync(legacyPath, '{\"legacy\":true}\n', 'utf8');
  fs.writeFileSync(portablePath, '{\"portable\":true}\n', 'utf8');

  const result = migrateLegacySettingsToPortable({ legacyPath, portablePath });

  assert.equal(result.ok, true);
  assert.equal(result.migrated, false);
  assert.equal(result.removedLegacy, true);
  assert.equal(fs.existsSync(legacyPath), false);
  assert.equal(fs.readFileSync(portablePath, 'utf8'), '{\"portable\":true}\n');
});

test('legacy app-local .vitruvios data migrates to the current .vincarios namespace before settings load', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-app-namespace-'));
  const projectRoot = path.join(root, 'app');
  const legacySettings = path.join(projectRoot, '.vitruvios', 'settings.json');
  fs.mkdirSync(path.dirname(legacySettings), { recursive: true });
  fs.writeFileSync(legacySettings, '{"version":1}\n', 'utf8');

  const result = migrateLegacyPortableNamespace(projectRoot);
  const currentSettings = path.join(projectRoot, '.vincarios', 'settings.json');

  assert.equal(result.ok, true);
  assert.equal(result.migrated, true);
  assert.equal(fs.existsSync(legacySettings), false);
  assert.equal(fs.readFileSync(currentSettings, 'utf8'), '{"version":1}\n');
});