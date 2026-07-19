'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getFileTreeNavigation,
  isFileTreeNavigationKey,
  isFileTreeRenameShortcut
} = require('../src/renderer/files/fileTreeKeyboard');

test('file tree keyboard handles only navigation keys', () => {
  assert.equal(isFileTreeNavigationKey('ArrowUp'), true);
  assert.equal(isFileTreeNavigationKey('ArrowDown'), true);
  assert.equal(isFileTreeNavigationKey('ArrowLeft'), true);
  assert.equal(isFileTreeNavigationKey('ArrowRight'), true);
  assert.equal(isFileTreeNavigationKey('PageUp'), true);
  assert.equal(isFileTreeNavigationKey('PageDown'), true);
  assert.equal(isFileTreeNavigationKey('Home'), true);
  assert.equal(isFileTreeNavigationKey('End'), true);
  assert.equal(isFileTreeNavigationKey('Enter'), false);
  assert.equal(isFileTreeNavigationKey('a'), false);
});

test('file tree keyboard moves through visible rows', () => {
  const rows = ['Inbox', 'Projects', 'Knowledge', 'Brain'];

  assert.equal(getFileTreeNavigation({ key: 'ArrowDown', rows, currentIndex: 1 }).nextIndex, 2);
  assert.equal(getFileTreeNavigation({ key: 'ArrowUp', rows, currentIndex: 1 }).nextIndex, 0);
  assert.equal(getFileTreeNavigation({ key: 'Home', rows, currentIndex: 2 }).nextIndex, 0);
  assert.equal(getFileTreeNavigation({ key: 'End', rows, currentIndex: 1 }).nextIndex, 3);
});

test('file tree keyboard keeps navigation inside bounds', () => {
  const rows = ['Inbox', 'Projects', 'Knowledge'];

  assert.equal(getFileTreeNavigation({ key: 'ArrowUp', rows, currentIndex: 0 }).nextIndex, 0);
  assert.equal(getFileTreeNavigation({ key: 'ArrowDown', rows, currentIndex: 2 }).nextIndex, 2);
  assert.equal(getFileTreeNavigation({ key: 'PageUp', rows, currentIndex: 0 }).nextIndex, 0);
  assert.equal(getFileTreeNavigation({ key: 'PageDown', rows, currentIndex: 2 }).nextIndex, 2);
});

test('file tree keyboard distinguishes focus, scroll, expand, and collapse commands', () => {
  const rows = ['Inbox', 'Projects', 'Knowledge', 'Brain'];

  assert.deepEqual(getFileTreeNavigation({ key: 'PageDown', rows, currentIndex: 0, pageSize: 2 }), {
    type: 'focus',
    nextIndex: 2
  });
  assert.deepEqual(getFileTreeNavigation({ key: 'PageUp', rows, currentIndex: 2, pageSize: 2 }), {
    type: 'focus',
    nextIndex: 0
  });
  assert.deepEqual(getFileTreeNavigation({ key: 'ArrowRight', rows, currentIndex: 1 }), {
    type: 'expand',
    nextIndex: 1
  });
  assert.deepEqual(getFileTreeNavigation({ key: 'ArrowLeft', rows, currentIndex: 1 }), {
    type: 'collapse',
    nextIndex: 1
  });
});

test('file tree rename shortcut requires an unmodified F2 key', () => {
  assert.equal(isFileTreeRenameShortcut({ key: 'F2', ctrlKey: false, metaKey: false, altKey: false }), true);
  assert.equal(isFileTreeRenameShortcut({ key: 'F2', ctrlKey: true, metaKey: false, altKey: false }), false);
  assert.equal(isFileTreeRenameShortcut({ key: 'F3', ctrlKey: false, metaKey: false, altKey: false }), false);
});