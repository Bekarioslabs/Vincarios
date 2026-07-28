'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { migrateInternalNamespaceDirectory } = require('../src/main/app/internalNamespaceMigration');

test('migrates one legacy internal data directory without copying or overwriting data', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-namespace-migration-'));
  const legacyPath = path.join(root, '.vitruvios');
  const currentPath = path.join(root, '.vincarios');
  fs.mkdirSync(path.join(legacyPath, 'index'), { recursive: true });
  fs.writeFileSync(path.join(legacyPath, 'index', 'manifest.json'), '{"version":1}', 'utf8');

  const result = migrateInternalNamespaceDirectory({ currentPath, legacyPaths: [legacyPath] });

  assert.equal(result.ok, true);
  assert.equal(result.migrated, true);
  assert.equal(fs.existsSync(legacyPath), false);
  assert.equal(fs.readFileSync(path.join(currentPath, 'index', 'manifest.json'), 'utf8'), '{"version":1}');
});

test('refuses a namespace conflict without modifying either directory', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-namespace-conflict-'));
  const legacyPath = path.join(root, '.vitruvios');
  const currentPath = path.join(root, '.vincarios');
  fs.mkdirSync(legacyPath, { recursive: true });
  fs.mkdirSync(currentPath, { recursive: true });
  fs.writeFileSync(path.join(legacyPath, 'legacy.txt'), 'legacy', 'utf8');
  fs.writeFileSync(path.join(currentPath, 'current.txt'), 'current', 'utf8');

  const result = migrateInternalNamespaceDirectory({ currentPath, legacyPaths: [legacyPath] });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'internal_namespace_conflict');
  assert.equal(fs.readFileSync(path.join(legacyPath, 'legacy.txt'), 'utf8'), 'legacy');
  assert.equal(fs.readFileSync(path.join(currentPath, 'current.txt'), 'utf8'), 'current');
});
test('merges persistent legacy data when the launcher already created current Electron runtime folders', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-runtime-merge-'));
  const legacyPath = path.join(root, '.vitruvios');
  const currentPath = path.join(root, '.vincarios');
  fs.mkdirSync(path.join(legacyPath, 'models'), { recursive: true });
  fs.mkdirSync(path.join(legacyPath, 'electron-cache'), { recursive: true });
  fs.mkdirSync(path.join(legacyPath, 'electron-user-data'), { recursive: true });
  fs.writeFileSync(path.join(legacyPath, 'settings.json'), '{"theme":"dark"}', 'utf8');
  fs.writeFileSync(path.join(legacyPath, 'models', 'manifest.json'), '{"model":"local"}', 'utf8');
  fs.mkdirSync(path.join(currentPath, 'electron-cache'), { recursive: true });
  fs.mkdirSync(path.join(currentPath, 'electron-user-data'), { recursive: true });

  const result = migrateInternalNamespaceDirectory({ currentPath, legacyPaths: [legacyPath] });

  assert.equal(result.ok, true);
  assert.equal(result.migrated, true);
  assert.equal(result.mode, 'merged_runtime');
  assert.equal(fs.existsSync(legacyPath), false);
  assert.equal(fs.readFileSync(path.join(currentPath, 'settings.json'), 'utf8'), '{"theme":"dark"}');
  assert.equal(fs.readFileSync(path.join(currentPath, 'models', 'manifest.json'), 'utf8'), '{"model":"local"}');
});