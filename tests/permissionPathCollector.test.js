'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { collectRecursivePermissionPaths } = require('../src/renderer/permissions/permissionPathCollector');

test('recursive permission collector lists folders and files without reading file contents', async () => {
  const listed = [];
  const folders = new Map([
    ['', [{ kind: 'folder', path: '02_Projekte' }]],
    ['02_Projekte', [{ kind: 'folder', path: '02_Projekte/StarLu' }]],
    ['02_Projekte/StarLu', [
      { kind: 'markdown', path: '02_Projekte/StarLu/StarLu.md' },
      { kind: 'folder', path: '02_Projekte/StarLu/Knowledge' }
    ]],
    ['02_Projekte/StarLu/Knowledge', [
      { kind: 'markdown', path: '02_Projekte/StarLu/Knowledge/Notes.md' }
    ]]
  ]);

  const paths = await collectRecursivePermissionPaths('02_Projekte/StarLu', async (folderPath) => {
    listed.push(folderPath);
    return { ok: true, entries: folders.get(folderPath) || [] };
  });

  assert.deepEqual(paths, [
    '02_Projekte/StarLu',
    '02_Projekte/StarLu/StarLu.md',
    '02_Projekte/StarLu/Knowledge',
    '02_Projekte/StarLu/Knowledge/Notes.md'
  ]);
  assert.deepEqual(listed, [
    '02_Projekte/StarLu',
    '02_Projekte/StarLu/Knowledge'
  ]);
});

test('recursive permission collector keeps the root path when folder listing fails', async () => {
  const paths = await collectRecursivePermissionPaths('02_Projekte/StarLu', async () => ({
    ok: false,
    entries: []
  }));

  assert.deepEqual(paths, ['02_Projekte/StarLu']);
});