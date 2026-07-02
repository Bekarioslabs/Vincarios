'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  getPortableDataRoot,
  getPortableSettingsPath,
  migrateLegacySettingsToPortable
} = require('../src/main/app/portableDataPath');

test('portable settings live under the project .zeus folder, not Electron userData', () => {
  const projectRoot = path.join(os.tmpdir(), 'zeus-portable-root');

  assert.equal(getPortableDataRoot(projectRoot), path.join(projectRoot, '.zeus'));
  assert.equal(getPortableSettingsPath(projectRoot), path.join(projectRoot, '.zeus', 'settings.json'));
});

test('legacy userData settings migrate to portable storage and remove the old file', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zeus-portable-migration-'));
  const projectRoot = path.join(root, 'app');
  const userData = path.join(root, 'AppData');
  const legacyPath = path.join(userData, 'settings.json');
  const portablePath = path.join(projectRoot, '.zeus', 'settings.json');
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
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zeus-portable-existing-'));
  const legacyPath = path.join(root, 'AppData', 'settings.json');
  const portablePath = path.join(root, 'App', '.zeus', 'settings.json');
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
