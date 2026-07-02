'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createContextState } = require('../src/renderer/context/contextState');

test('context state starts with no selection and an empty context basket', () => {
  const context = createContextState();

  assert.deepEqual(context.snapshot(), {
    kind: 'none',
    selectionId: 0,
    path: '',
    content: '',
    readAllowed: false,
    writeAllowed: false,
    parentReadAllowed: false,
    contextItems: [],
    label: 'No selection.'
  });
});

test('context state stores selected Markdown files without adding them to context', () => {
  const context = createContextState();
  const state = context.setFile('02_Projects/StarLu/Tasks.md', { content: '# Tasks', parentReadAllowed: true });

  assert.equal(state.kind, 'file');
  assert.equal(state.path, '02_Projects/StarLu/Tasks.md');
  assert.equal(state.content, '# Tasks');
  assert.equal(state.parentReadAllowed, true);
  assert.equal(state.label, 'Selected file: 02_Projects/StarLu/Tasks.md');
  assert.deepEqual(state.contextItems, []);
});

test('context state stores selected folders without adding them to context', () => {
  const context = createContextState();
  const state = context.setFolder('02_Projects/StarLu');

  assert.equal(state.kind, 'folder');
  assert.equal(state.path, '02_Projects/StarLu');
  assert.equal(state.label, 'Selected folder: 02_Projects/StarLu/');
  assert.deepEqual(state.contextItems, []);
});

test('context state can add, remove, and clear explicit context items', () => {
  const context = createContextState();

  const withFile = context.addContextItem({ kind: 'file', path: 'A.md', content: '# A' });
  assert.equal(withFile.contextItems.length, 1);
  assert.equal(withFile.contextItems[0].path, 'A.md');

  const withFolder = context.addContextItem({ kind: 'folder', path: 'Folder' });
  assert.deepEqual(withFolder.contextItems.map((item) => item.path), ['A.md', 'Folder']);

  const removed = context.removeContextItem(withFile.contextItems[0].id);
  assert.deepEqual(removed.contextItems.map((item) => item.path), ['Folder']);

  const cleared = context.clearContextItems();
  assert.deepEqual(cleared.contextItems, []);
});

test('context state de-duplicates explicit context items by kind and path', () => {
  const context = createContextState();

  context.addContextItem({ kind: 'file', path: 'A.md', content: '# A1' });
  const snapshot = context.addContextItem({ kind: 'file', path: 'A.md', content: '# A2' });

  assert.equal(snapshot.contextItems.length, 1);
  assert.equal(snapshot.contextItems[0].content, '# A2');
});

test('context state can clear selected target without clearing context basket', () => {
  const context = createContextState();
  context.setFile('A.md', { content: '# A' });
  context.addContextItem({ kind: 'file', path: 'A.md', content: '# A' });

  const cleared = context.clear();

  assert.equal(cleared.kind, 'none');
  assert.equal(cleared.selectionId, 2);
  assert.deepEqual(cleared.contextItems.map((item) => item.path), ['A.md']);
});

test('context state assigns a new selection id for every selected target', () => {
  const context = createContextState();

  assert.equal(context.setFile('A.md', { content: 'A' }).selectionId, 1);
  assert.equal(context.setFolder('Folder', { readAllowed: false }).selectionId, 2);
  assert.equal(context.clear().selectionId, 3);
});

test('context state stores read and write permissions for selected targets', () => {
  const context = createContextState();
  const folder = context.setFolder('03_Knowledge', { readAllowed: false, writeAllowed: true });
  const file = context.setFile('03_Knowledge/Comics/A.md', {
    content: '# A',
    readAllowed: true,
    writeAllowed: true,
    parentReadAllowed: true
  });

  assert.equal(folder.readAllowed, false);
  assert.equal(folder.writeAllowed, true);
  assert.equal(file.readAllowed, true);
  assert.equal(file.writeAllowed, true);
  assert.equal(file.parentReadAllowed, true);
});
test('context state preserves dropped Markdown metadata for UI display', () => {
  const state = createContextState();
  state.addContextItem({
    kind: 'file',
    path: 'External Drops/Note.md',
    content: '# Note',
    source: 'dropped_markdown',
    externalPath: 'D:/Downloads/Note.md'
  });

  const item = state.snapshot().contextItems[0];
  assert.equal(item.source, 'dropped_markdown');
  assert.equal(item.externalPath, 'D:/Downloads/Note.md');
});
