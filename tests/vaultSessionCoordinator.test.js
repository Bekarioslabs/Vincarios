'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const {
  createRecentVaultAuthorizer,
  createVaultSessionCoordinator
} = require('../src/main/vault/vaultSessionCoordinator');

test('vault session migrates before mutating any service root', () => {
  const calls = [];
  const coordinator = createVaultSessionCoordinator({
    pathApi: path.win32,
    validateRoot(root) {
      return { ok: true, root: path.win32.resolve(root) };
    },
    migrateNamespace() {
      calls.push('migrate');
      return { ok: false, code: 'namespace_conflict', message: 'Conflict.' };
    },
    services: [
      createService('read', calls),
      createService('write', calls)
    ]
  });

  const result = coordinator.activateRoot('D:\\Vault');

  assert.equal(result.ok, false);
  assert.equal(result.code, 'namespace_conflict');
  assert.deepEqual(calls, ['migrate']);
  assert.equal(coordinator.getState().activeRoot, '');
});

test('vault session rolls every changed service back when activation fails', () => {
  const calls = [];
  let failWriteForNewRoot = false;
  const read = createService('read', calls);
  const write = {
    setRoot(root) {
      calls.push(['write', root]);
      if (failWriteForNewRoot && root === 'D:\\NewVault') {
        return { ok: false, code: 'write_root_failed', message: 'Write root failed.' };
      }
      return { ok: true, root };
    }
  };
  const coordinator = createVaultSessionCoordinator({
    pathApi: path.win32,
    validateRoot(root) {
      return { ok: true, root: path.win32.resolve(root) };
    },
    migrateNamespace() {
      return { ok: true, mode: 'none' };
    },
    services: [
      { name: 'read', service: read },
      { name: 'write', service: write }
    ]
  });

  assert.equal(coordinator.activateRoot('D:\\OldVault').ok, true);
  calls.length = 0;
  failWriteForNewRoot = true;

  const result = coordinator.activateRoot('D:\\NewVault');

  assert.equal(result.ok, false);
  assert.equal(result.code, 'vault_activation_failed');
  assert.equal(coordinator.getState().activeRoot, 'D:\\OldVault');
  assert.deepEqual(calls, [
    ['read', 'D:\\NewVault'],
    ['write', 'D:\\NewVault'],
    ['write', 'D:\\OldVault'],
    ['read', 'D:\\OldVault']
  ]);
});

test('vault session reports an optional watcher failure without rejecting the vault', () => {
  const coordinator = createVaultSessionCoordinator({
    pathApi: path.win32,
    validateRoot(root) {
      return { ok: true, root: path.win32.resolve(root) };
    },
    migrateNamespace() {
      return { ok: true, mode: 'none' };
    },
    services: [
      { name: 'read', service: createService('read', []) },
      {
        name: 'watcher',
        optional: true,
        service: {
          setRoot() {
            return { ok: false, code: 'vault_watch_unavailable', message: 'Watcher unavailable.' };
          }
        }
      }
    ]
  });

  const result = coordinator.activateRoot('D:\\Vault');

  assert.equal(result.ok, true);
  assert.equal(result.root, 'D:\\Vault');
  assert.equal(result.warnings.length, 1);
  assert.equal(result.warnings[0].service, 'watcher');
});

test('vault session rejects an unauthorized renderer root before migration or service activation', () => {
  const calls = [];
  const coordinator = createVaultSessionCoordinator({
    pathApi: path.win32,
    validateRoot(root) {
      return { ok: true, root: path.win32.resolve(root) };
    },
    authorizeRoot(payload) {
      calls.push(['authorize', payload.root, payload.source]);
      return { ok: false, code: 'vault_root_not_allowed', message: 'Vault root is not in recent vaults.' };
    },
    migrateNamespace() {
      calls.push('migrate');
      return { ok: true, mode: 'none' };
    },
    services: [
      createService('read', calls)
    ]
  });

  const result = coordinator.activateRoot('D:\\OtherVault', { source: 'recent' });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'vault_root_not_allowed');
  assert.deepEqual(calls, [['authorize', 'D:\\OtherVault', 'recent']]);
});

test('recent vault authorizer trusts picker roots and only persisted recent roots from renderer', () => {
  const authorize = createRecentVaultAuthorizer({
    getSettings() {
      return {
        startup: {
          recentVaults: [{ path: 'D:\KnownVault' }]
        }
      };
    }
  }, path.win32);

  assert.equal(authorize({ root: 'D:\AnyVault', source: 'picker' }).ok, true);
  assert.equal(authorize({ root: 'd:\knownvault', source: 'recent' }).ok, true);
  assert.deepEqual(authorize({ root: 'D:\OtherVault', source: 'recent' }), {
    ok: false,
    code: 'vault_root_not_allowed',
    message: 'Select the vault through Open Vault before using it as a recent vault.'
  });
});
function createService(name, calls) {
  return {
    setRoot(root) {
      calls.push([name, root]);
      return { ok: true, root };
    }
  };
}
