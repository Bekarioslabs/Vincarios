'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createPendingActionState } = require('../src/renderer/context/pendingActionState');
const { runFolderContextFlow } = require('../src/renderer/context/folderContextController');

function createApi(tree, calls) {
  return {
    vault: {
      listFolder: async (path) => {
        calls.push(path);
        return { ok: true, entries: tree[path] || [] };
      }
    }
  };
}

test('folder context controller asks for scope on ambiguous folder work', async () => {
  const calls = [];
  const pendingState = createPendingActionState();
  const result = await runFolderContextFlow({
    api: createApi({}, calls),
    pendingState,
    userText: 'check this folder',
    selection: { kind: 'folder', path: '90_AI_Brain', readAllowed: true, selectionId: 4 }
  });

  assert.equal(result.handled, true);
  assert.equal(result.kind, 'scope_request');
  assert.equal(calls.length, 0);
  assert.equal(pendingState.snapshot().targetPath, '90_AI_Brain');
  assert.deepEqual(result.scopeActions.map((action) => action.scopeChoice), ['current', 'recursive', 'cancel']);
});

test('folder context controller does not treat all as recursive without a pending folder action', async () => {
  const calls = [];
  const result = await runFolderContextFlow({
    api: createApi({}, calls),
    pendingState: createPendingActionState(),
    userText: 'alle',
    selection: { kind: 'folder', path: '90_AI_Brain', readAllowed: true, selectionId: 4 }
  });

  assert.equal(result.handled, false);
  assert.equal(calls.length, 0);
});

test('folder context controller resolves pending all-subfolders scope by listing descendants only', async () => {
  const calls = [];
  const pendingState = createPendingActionState();
  pendingState.set({ type: 'folder_scope', selectionId: 4, targetPath: '90_AI_Brain', targetKind: 'folder' });
  const tree = {
    '90_AI_Brain': [
      { kind: 'folder', name: 'Core', path: '90_AI_Brain/Core' }
    ],
    '90_AI_Brain/Core': [
      { kind: 'markdown', name: 'Rules.md', path: '90_AI_Brain/Core/Rules.md' }
    ]
  };

  const result = await runFolderContextFlow({
    api: createApi(tree, calls),
    pendingState,
    userText: 'alle',
    selection: { kind: 'folder', path: '90_AI_Brain', readAllowed: true, selectionId: 4 }
  });

  assert.equal(result.handled, true);
  assert.deepEqual(calls, ['90_AI_Brain', '90_AI_Brain/Core']);
  assert.match(result.message, /Recursive folder listing for current selection 4/);
  assert.match(result.message, /Rules\.md/);
  assert.equal(pendingState.hasPending(), false);
});

test('folder context controller cancels pending folder scope without listing', async () => {
  const calls = [];
  const pendingState = createPendingActionState();
  pendingState.set({ type: 'folder_scope', selectionId: 4, targetPath: '90_AI_Brain', targetKind: 'folder' });

  const result = await runFolderContextFlow({
    api: createApi({}, calls),
    pendingState,
    userText: 'cancel',
    selection: { kind: 'folder', path: '90_AI_Brain', readAllowed: true, selectionId: 4 }
  });

  assert.equal(result.handled, true);
  assert.match(result.message, /cancelled/i);
  assert.equal(calls.length, 0);
  assert.equal(pendingState.hasPending(), false);
});
