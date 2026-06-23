'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createPermissionState } = require('../src/renderer/permissions/permissionState');

test('permission state starts with read and write disabled for unknown paths', () => {
  const permissions = createPermissionState();

  assert.deepEqual(permissions.get('02_Projekte/StarLu'), {
    path: '02_Projekte/StarLu',
    read: false,
    write: false
  });
});

test('permission state toggles read and write independently', () => {
  const permissions = createPermissionState();

  assert.deepEqual(permissions.toggleRead('02_Projekte/StarLu'), {
    path: '02_Projekte/StarLu',
    read: true,
    write: false
  });
  assert.deepEqual(permissions.toggleWrite('02_Projekte/StarLu'), {
    path: '02_Projekte/StarLu',
    read: true,
    write: true
  });
  assert.deepEqual(permissions.toggleRead('02_Projekte/StarLu'), {
    path: '02_Projekte/StarLu',
    read: false,
    write: true
  });
});

test('permission state snapshots only explicitly configured paths', () => {
  const permissions = createPermissionState();
  permissions.toggleRead('02_Projekte/StarLu');
  permissions.toggleWrite('02_Projekte/StarLu/Tasks.md');

  assert.deepEqual(permissions.snapshot(), [
    { path: '02_Projekte/StarLu', read: true, write: false },
    { path: '02_Projekte/StarLu/Tasks.md', read: false, write: true }
  ]);
});

test('permission state can clear one path without changing others', () => {
  const permissions = createPermissionState();
  permissions.toggleRead('02_Projekte/StarLu');
  permissions.toggleWrite('02_Projekte/StarLu/Tasks.md');

  assert.deepEqual(permissions.clear('02_Projekte/StarLu'), {
    path: '02_Projekte/StarLu',
    read: false,
    write: false
  });
  assert.deepEqual(permissions.snapshot(), [
    { path: '02_Projekte/StarLu/Tasks.md', read: false, write: true }
  ]);
});