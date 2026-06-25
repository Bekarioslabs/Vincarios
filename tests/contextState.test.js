'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createContextState } = require('../src/renderer/context/contextState');

test('context state starts empty and exposes a readable label', () => {
  const context = createContextState();

  assert.deepEqual(context.snapshot(), {
    kind: 'none',
    selectionId: 0,
    path: '',
    content: '',
    readAllowed: false,
    parentReadAllowed: false,
    autoContextEnabled: true,
    label: 'No context target.'
  });
});

test('context state stores selected Markdown files as context targets', () => {
  const context = createContextState();
  const state = context.setFile('02_Projekte/StarLu/Tasks.md', { content: '# Tasks', parentReadAllowed: true });

  assert.deepEqual(state, {
    kind: 'file',
    selectionId: 1,
    path: '02_Projekte/StarLu/Tasks.md',
    content: '# Tasks',
    readAllowed: true,
    parentReadAllowed: true,
    autoContextEnabled: true,
    label: 'Context file: 02_Projekte/StarLu/Tasks.md'
  });
  assert.deepEqual(context.snapshot(), state);
});

test('context state stores selected folders as context targets', () => {
  const context = createContextState();
  const state = context.setFolder('02_Projekte/StarLu');

  assert.deepEqual(state, {
    kind: 'folder',
    selectionId: 1,
    path: '02_Projekte/StarLu',
    content: '',
    readAllowed: true,
    parentReadAllowed: false,
    autoContextEnabled: true,
    label: 'Context folder: 02_Projekte/StarLu/'
  });
});

test('context state can be cleared without leaking previous target', () => {
  const context = createContextState();
  context.setFile('02_Projekte/StarLu/Tasks.md', { content: '# Tasks' });

  assert.deepEqual(context.clear(), {
    kind: 'none',
    selectionId: 2,
    path: '',
    content: '',
    readAllowed: false,
    parentReadAllowed: false,
    autoContextEnabled: true,
    label: 'No context target.'
  });
});
test('context state assigns a new selection id for every selected target', () => {
  const context = createContextState();

  assert.equal(context.setFile('A.md', { content: 'A' }).selectionId, 1);
  assert.equal(context.setFolder('Folder', { readAllowed: false }).selectionId, 2);
  assert.equal(context.clear().selectionId, 3);
});

test('context state stores explicit folder read permission', () => {
  const context = createContextState();
  const state = context.setFolder('03_Wissen', { readAllowed: false });

  assert.equal(state.readAllowed, false);
  assert.equal(state.kind, 'folder');
});

test('context state stores selected file parent read permission separately', () => {
  const context = createContextState();
  const state = context.setFile('03_Wissen/Comics/A.md', {
    content: '# A',
    readAllowed: true,
    parentReadAllowed: true
  });

  assert.equal(state.readAllowed, true);
  assert.equal(state.parentReadAllowed, true);
});
