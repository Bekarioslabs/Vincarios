'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('index loads selection action modules before shell', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const categoriesIndex = source.indexOf('./src/renderer/selectionActions/actionCategories.js');
  const registryIndex = source.indexOf('./src/renderer/selectionActions/actionRegistry.js');
  const mountIndex = source.indexOf('./src/renderer/selectionActions/mountSelectionActions.js');
  const shellIndex = source.indexOf('./src/renderer/shell/mountShell.js');

  assert.equal(categoriesIndex > -1, true);
  assert.equal(registryIndex > categoriesIndex, true);
  assert.equal(mountIndex > registryIndex, true);
  assert.equal(shellIndex > mountIndex, true);
});

test('bootstrap requires selection action renderer modules', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'bootstrap.js'), 'utf8');

  assert.match(source, /ZeusSelectionActionCategories/);
  assert.match(source, /ZeusSelectionActionRegistry/);
  assert.match(source, /ZeusSelectionActions/);
});

test('shell mounts selection action panel with context state', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');

  assert.match(source, /ZeusSelectionActions\.mountSelectionActions/);
  assert.match(source, /contextState/);
  assert.match(source, /reviewBasket/);
});

test('context basket renders target-type icons separate from action colors', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'context', 'mountContextBasket.js'), 'utf8');

  assert.match(source, /context-basket-icon/);
  assert.match(source, /targetIconFor/);
  assert.match(source, /MD/);
});
test('file panel exposes revealFolder for context basket folder items', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'files', 'mountFilePanel.js'), 'utf8');

  assert.match(source, /async function revealFolder/);
  assert.match(source, /revealFolder,/);
  assert.match(source, /contextState\.setFolder/);
});
test('context basket labels use compact basename while keeping full path in title', () => {
  const basket = require('../src/renderer/context/mountContextBasket');

  assert.equal(basket.formatItemLabel({ kind: 'file', path: '02_Projects/StarLu/Tasks.md' }), 'Tasks.md');
  assert.equal(basket.formatItemLabel({ kind: 'folder', path: '02_Projects/StarLu' }), 'StarLu');
  assert.equal(basket.formatItemTitle({ kind: 'file', path: '02_Projects/StarLu/Tasks.md' }), '02_Projects/StarLu/Tasks.md');
});
