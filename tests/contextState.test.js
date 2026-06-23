'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createContextState } = require('../src/renderer/context/contextState');

test('context state starts empty and exposes a readable label', () => {
  const context = createContextState();

  assert.deepEqual(context.snapshot(), {
    kind: 'none',
    path: '',
    label: 'No context target.'
  });
});

test('context state stores selected Markdown files as context targets', () => {
  const context = createContextState();
  const state = context.setFile('02_Projekte/StarLu/Tasks.md');

  assert.deepEqual(state, {
    kind: 'file',
    path: '02_Projekte/StarLu/Tasks.md',
    label: 'Context file: 02_Projekte/StarLu/Tasks.md'
  });
  assert.deepEqual(context.snapshot(), state);
});

test('context state stores selected folders as context targets', () => {
  const context = createContextState();
  const state = context.setFolder('02_Projekte/StarLu');

  assert.deepEqual(state, {
    kind: 'folder',
    path: '02_Projekte/StarLu',
    label: 'Context folder: 02_Projekte/StarLu/'
  });
});

test('context state can be cleared without leaking previous target', () => {
  const context = createContextState();
  context.setFile('02_Projekte/StarLu/Tasks.md');

  assert.deepEqual(context.clear(), {
    kind: 'none',
    path: '',
    label: 'No context target.'
  });
});