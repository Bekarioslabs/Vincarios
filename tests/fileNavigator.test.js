'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createFileNavigator, normalizePath, parentFolder } = require('../src/renderer/files/fileNavigator');

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

test('file navigator expands and collapses folders independently of selection', () => {
  const nav = createFileNavigator();

  assert.equal(nav.isExpanded(''), true);
  assert.equal(nav.isExpanded('02_Projekte'), false);

  let state = nav.toggleFolder('02_Projekte');
  assert.equal(nav.isExpanded('02_Projekte'), true);
  assert.equal(state.selectedPath, '02_Projekte');
  assert.equal(state.selectedKind, 'folder');

  state = nav.toggleFolder('02_Projekte');
  assert.equal(nav.isExpanded('02_Projekte'), false);
  assert.equal(state.selectedPath, '02_Projekte');
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

test('parentFolder returns the containing folder for a file path', () => {
  assert.equal(parentFolder('02_Projekte/StarLu/Tasks.md'), '02_Projekte/StarLu');
  assert.equal(parentFolder('README.md'), '');
});
