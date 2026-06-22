'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createFileNavigator, normalizePath } = require('../src/renderer/files/fileNavigator');

test('normalizePath converts slashes and trims outer separators', () => {
  assert.equal(normalizePath('\\02_Projekte\\StarLu\\'), '02_Projekte/StarLu');
});

test('file navigator opens folders and builds breadcrumbs', () => {
  const nav = createFileNavigator();
  const state = nav.openFolder('02_Projekte/StarLu');

  assert.equal(state.currentFolder, '02_Projekte/StarLu');
  assert.equal(state.selectedPath, '02_Projekte/StarLu');
  assert.equal(state.selectedKind, 'folder');
  assert.deepEqual(state.breadcrumb, [
    { label: '02_Projekte', path: '02_Projekte' },
    { label: 'StarLu', path: '02_Projekte/StarLu' }
  ]);
});

test('file navigator tracks selected Markdown files without changing current folder', () => {
  const nav = createFileNavigator();
  nav.openFolder('02_Projekte/StarLu');
  const state = nav.selectFile('02_Projekte/StarLu/Tasks.md');

  assert.equal(state.currentFolder, '02_Projekte/StarLu');
  assert.equal(state.selectedPath, '02_Projekte/StarLu/Tasks.md');
  assert.equal(state.selectedKind, 'markdown');
});

test('file navigator supports back navigation', () => {
  const nav = createFileNavigator();
  nav.openFolder('02_Projekte');
  nav.openFolder('02_Projekte/StarLu');

  assert.equal(nav.canGoBack(), true);
  const state = nav.goBack();
  assert.equal(state.currentFolder, '02_Projekte');
  assert.equal(state.selectedKind, 'folder');
});