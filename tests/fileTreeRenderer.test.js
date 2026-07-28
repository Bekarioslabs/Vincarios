'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createFileTreeRenderer
} = require('../src/renderer/files/fileTreeRenderer');

test('file tree renderer shows stable root empty and error states', () => {
  const tree = createTree();
  const entriesByFolder = new Map();
  const renderer = createRenderer({ tree, entriesByFolder });

  renderer.render();
  assert.equal(tree.className, 'file-tree muted');
  assert.equal(tree.textContent, 'Open a vault to list files.');

  entriesByFolder.set('', { ok: false, message: 'Could not list root.' });
  renderer.render();
  assert.equal(tree.className, 'file-tree error');
  assert.equal(tree.textContent, 'Could not list root.');

  entriesByFolder.set('', { ok: true, entries: [] });
  renderer.render();
  assert.equal(tree.className, 'file-tree muted');
  assert.equal(tree.textContent, 'No Markdown files or visible folders here.');
});

test('file tree renderer clears stale visible row state on every render', () => {
  const visibleRows = new Map([['old.md', {}]]);
  const visibleEntries = new Map([['old.md', {}]]);
  const renderer = createRenderer({
    tree: createTree(),
    entriesByFolder: new Map(),
    visibleRows,
    visibleEntries
  });

  renderer.render();

  assert.equal(visibleRows.size, 0);
  assert.equal(visibleEntries.size, 0);
});

function createRenderer(overrides) {
  const options = Object.assign({
    tree: createTree(),
    navigator: { snapshot: () => ({}), isExpanded: () => false },
    entriesByFolder: new Map(),
    loadingFolders: new Set(),
    visibleRows: new Map(),
    visibleEntries: new Map(),
    keyboard: null,
    updateNavigation() {},
    normalizePath(value) { return value; },
    formatRowAriaLabel() { return ''; },
    createEntryIcon() { return {}; },
    createPermissionControls() { return {}; },
    applyFlashClass() {},
    focusTreeRow() {},
    activateEntry() {},
    startInlineRename() {},
    handlePermissionHotkey() { return false; },
    handleTreeKeydown() {}
  }, overrides || {});
  return createFileTreeRenderer(options);
}

function createTree() {
  return {
    className: '',
    textContent: '',
    innerHTML: '',
    appendChild() {}
  };
}
