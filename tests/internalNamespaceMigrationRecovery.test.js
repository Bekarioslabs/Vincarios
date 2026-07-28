'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  getRuntimeSwapBackupPath,
  migrateInternalNamespaceDirectory
} = require('../src/main/app/internalNamespaceMigration');

test('runtime-only namespace merge rolls back both directories when the atomic swap fails', () => {
  const root = createTempRoot();
  const legacyPath = path.join(root, '.vitruvios');
  const currentPath = path.join(root, '.vincarios');
  fs.mkdirSync(path.join(legacyPath, 'models'), { recursive: true });
  fs.writeFileSync(path.join(legacyPath, 'settings.json'), 'legacy', 'utf8');
  fs.mkdirSync(path.join(currentPath, 'electron-cache'), { recursive: true });
  fs.writeFileSync(path.join(currentPath, 'electron-cache', 'cache.bin'), 'cache', 'utf8');

  let renameCount = 0;
  const failingFileSystem = new Proxy(fs, {
    get(target, property) {
      if (property !== 'renameSync') {
        const value = target[property];
        return typeof value === 'function' ? value.bind(target) : value;
      }
      return function renameSync(source, destination) {
        renameCount += 1;
        if (renameCount === 2) throw new Error('Injected swap failure');
        return target.renameSync(source, destination);
      };
    }
  });

  const result = migrateInternalNamespaceDirectory({
    fs: failingFileSystem,
    currentPath,
    legacyPaths: [legacyPath]
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'internal_namespace_migration_failed');
  assert.equal(fs.readFileSync(path.join(legacyPath, 'settings.json'), 'utf8'), 'legacy');
  assert.equal(fs.readFileSync(path.join(currentPath, 'electron-cache', 'cache.bin'), 'utf8'), 'cache');
  assert.equal(fs.existsSync(getRuntimeSwapBackupPath(currentPath)), false);
});

test('migration resumes after interruption between moving runtime data and activating legacy data', () => {
  const root = createTempRoot();
  const legacyPath = path.join(root, '.vitruvios');
  const currentPath = path.join(root, '.vincarios');
  const backupPath = getRuntimeSwapBackupPath(currentPath);
  fs.mkdirSync(legacyPath, { recursive: true });
  fs.writeFileSync(path.join(legacyPath, 'settings.json'), 'legacy', 'utf8');
  fs.mkdirSync(path.join(backupPath, 'electron-cache'), { recursive: true });

  const result = migrateInternalNamespaceDirectory({
    currentPath,
    legacyPaths: [legacyPath]
  });

  assert.equal(result.ok, true);
  assert.equal(result.migrated, true);
  assert.equal(result.mode, 'recovered_runtime_swap');
  assert.equal(fs.readFileSync(path.join(currentPath, 'settings.json'), 'utf8'), 'legacy');
  assert.equal(fs.existsSync(legacyPath), false);
  assert.equal(fs.existsSync(backupPath), false);
});

test('migration removes a stale runtime backup after the namespace switch completed', () => {
  const root = createTempRoot();
  const currentPath = path.join(root, '.vincarios');
  const backupPath = getRuntimeSwapBackupPath(currentPath);
  fs.mkdirSync(currentPath, { recursive: true });
  fs.writeFileSync(path.join(currentPath, 'settings.json'), 'current', 'utf8');
  fs.mkdirSync(path.join(backupPath, 'electron-cache'), { recursive: true });

  const result = migrateInternalNamespaceDirectory({
    currentPath,
    legacyPaths: [path.join(root, '.vitruvios')]
  });

  assert.equal(result.ok, true);
  assert.equal(result.recovered, true);
  assert.equal(fs.readFileSync(path.join(currentPath, 'settings.json'), 'utf8'), 'current');
  assert.equal(fs.existsSync(backupPath), false);
});

function createTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-namespace-recovery-'));
}
