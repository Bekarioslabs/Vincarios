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
test('permission state applies read recursively to known child paths only', () => {
  const permissions = createPermissionState();
  const result = permissions.setReadForPaths([
    '02_Projekte/StarLu',
    '02_Projekte/StarLu/Tasks.md',
    '02_Projekte/StarLu/Knowledge'
  ], true);

  assert.deepEqual(result, [
    { path: '02_Projekte/StarLu', read: true, write: false },
    { path: '02_Projekte/StarLu/Knowledge', read: true, write: false },
    { path: '02_Projekte/StarLu/Tasks.md', read: true, write: false }
  ]);
});

test('permission state applies write recursively without changing read', () => {
  const permissions = createPermissionState();
  permissions.toggleRead('02_Projekte/StarLu/Tasks.md');
  const result = permissions.setWriteForPaths([
    '02_Projekte/StarLu',
    '02_Projekte/StarLu/Tasks.md'
  ], true);

  assert.deepEqual(result, [
    { path: '02_Projekte/StarLu', read: false, write: true },
    { path: '02_Projekte/StarLu/Tasks.md', read: true, write: true }
  ]);
});
test('permission state resolves inherited read from parent folders', () => {
  const permissions = createPermissionState();
  permissions.toggleRead('90_AI_Brain');

  assert.deepEqual(permissions.resolve('90_AI_Brain/Core'), {
    path: '90_AI_Brain/Core',
    read: true,
    write: false,
    readState: 'inherited',
    writeState: 'off'
  });
});

test('permission state lets explicit child read off override inherited parent read on', () => {
  const permissions = createPermissionState();
  permissions.toggleRead('90_AI_Brain');
  permissions.toggleRead('90_AI_Brain/Core');

  assert.deepEqual(permissions.resolve('90_AI_Brain/Core'), {
    path: '90_AI_Brain/Core',
    read: false,
    write: false,
    readState: 'off',
    writeState: 'off'
  });
  assert.deepEqual(permissions.get('90_AI_Brain/Core'), {
    path: '90_AI_Brain/Core',
    read: false,
    write: false
  });
});