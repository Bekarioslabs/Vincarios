'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  runReadContextPreflight,
  resolveReadTarget
} = require('../src/renderer/chat/readContextPreflight');
const { createPendingActionState } = require('../src/renderer/context/pendingActionState');
const intent = require('../src/renderer/context/contextIntent');

test('read context preflight lists the selected folder when read is enabled', async () => {
  const calls = [];
  const result = await runReadContextPreflight({
    userText: 'what is in this folder?',
    selection: {
      kind: 'folder',
      path: '00_Inbox/AI Responses',
      readAllowed: true,
      selectionId: 4
    },
    api: {
      vault: {
        listFolder: async (path) => {
          calls.push(path);
          return {
            ok: true,
            entries: [
              { kind: 'markdown', name: 'A.md', path: '00_Inbox/AI Responses/A.md' },
              { kind: 'folder', name: 'Nested', path: '00_Inbox/AI Responses/Nested' }
            ]
          };
        }
      }
    }
  });

  assert.equal(result.handled, true);
  assert.deepEqual(calls, ['00_Inbox/AI Responses']);
  assert.match(result.message, /current selection 4/);
  assert.match(result.message, /A\.md/);
  assert.match(result.message, /Nested\//);
});

test('read context preflight blocks selected folder listing when read is disabled', async () => {
  let called = false;
  const result = await runReadContextPreflight({
    userText: 'was liegt in diesem ordner?',
    selection: {
      kind: 'folder',
      path: '03_Wissen',
      readAllowed: false,
      selectionId: 2
    },
    api: {
      vault: {
        listFolder: async () => {
          called = true;
          return { ok: true, entries: [] };
        }
      }
    }
  });

  assert.equal(result.handled, true);
  assert.equal(called, false);
  assert.match(result.message, /enable R/i);
  assert.match(result.message, /03_Wissen/);
});

test('read context preflight maps selected-file folder questions to parent only when parent read is enabled', () => {
  const blocked = resolveReadTarget({
    kind: 'file',
    path: '03_Wissen/Comics/A.md',
    readAllowed: true,
    parentReadAllowed: false,
    selectionId: 8
  }, 'kannst du aehnliche dateien in diesem ordner finden?', intent);

  assert.deepEqual(blocked, {
    kind: 'folder',
    path: '03_Wissen/Comics',
    readAllowed: false,
    selectionId: 8,
    recursive: false
  });

  const allowed = resolveReadTarget({
    kind: 'file',
    path: '03_Wissen/Comics/A.md',
    readAllowed: true,
    parentReadAllowed: true,
    selectionId: 9
  }, 'liste die dateien in diesem ordner', intent);

  assert.deepEqual(allowed, {
    kind: 'folder',
    path: '03_Wissen/Comics',
    readAllowed: true,
    selectionId: 9,
    recursive: false
  });
});

test('read context preflight ignores general questions for selected folders', async () => {
  let called = false;
  const result = await runReadContextPreflight({
    userText: 'what is the biggest fish?',
    selection: {
      kind: 'folder',
      path: '03_Wissen',
      readAllowed: true,
      selectionId: 1
    },
    api: {
      vault: {
        listFolder: async () => {
          called = true;
          return { ok: true, entries: [] };
        }
      }
    }
  });

  assert.equal(result.handled, false);
  assert.equal(called, false);
});
test('read context preflight blocks all-subfolders scope replies without a pending folder action', async () => {
  const calls = [];
  const result = await runReadContextPreflight({
    userText: 'alle',
    selection: {
      kind: 'folder',
      path: '90_AI_Brain',
      readAllowed: true,
      selectionId: 12
    },
    api: {
      vault: {
        listFolder: async (path) => {
          calls.push(path);
          return { ok: true, entries: [] };
        }
      }
    }
  });

  assert.equal(result.handled, true);
  assert.match(result.message, /No open folder scope choice/);
  assert.deepEqual(calls, []);
});

test('read context preflight recursively lists selected folder descendants for pending all-subfolders requests', async () => {
  const calls = [];
  const pendingState = createPendingActionState();
  pendingState.set({ type: 'folder_scope', selectionId: 12, targetPath: '90_AI_Brain', targetKind: 'folder' });
  const tree = {
    '90_AI_Brain': [
      { kind: 'folder', name: 'Core', path: '90_AI_Brain/Core' },
      { kind: 'folder', name: 'Templates', path: '90_AI_Brain/Templates' }
    ],
    '90_AI_Brain/Core': [
      { kind: 'markdown', name: 'Rules.md', path: '90_AI_Brain/Core/Rules.md' }
    ],
    '90_AI_Brain/Templates': [
      { kind: 'markdown', name: 'Note_Types.md', path: '90_AI_Brain/Templates/Note_Types.md' }
    ]
  };

  const result = await runReadContextPreflight({
    userText: 'alle',
    selection: {
      kind: 'folder',
      path: '90_AI_Brain',
      readAllowed: true,
      selectionId: 12
    },
    api: {
      vault: {
        listFolder: async (path) => {
          calls.push(path);
          return { ok: true, entries: tree[path] || [] };
        }
      }
    },
    pendingState
  });

  assert.equal(result.handled, true);
  assert.deepEqual(calls, ['90_AI_Brain', '90_AI_Brain/Core', '90_AI_Brain/Templates']);
  assert.match(result.message, /Recursive folder listing for current selection 12: 90_AI_Brain/);
  assert.match(result.message, /## 90_AI_Brain\/Core\//);
  assert.match(result.message, /Rules\.md/);
  assert.match(result.message, /Only real folder-listing results are shown/);
  assert.doesNotMatch(result.message, /Agent_Definitions\.md/);
});