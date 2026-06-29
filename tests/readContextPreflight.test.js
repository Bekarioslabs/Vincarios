'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { runReadContextPreflight } = require('../src/renderer/chat/readContextPreflight');
const { createPendingActionState } = require('../src/renderer/context/pendingActionState');
const intent = require('../src/renderer/context/contextIntent');

test('read context preflight shows folder action guidance instead of listing selected folder from text', async () => {
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
          return { ok: true, entries: [] };
        }
      }
    }
  });

  assert.equal(result.handled, true);
  assert.equal(result.kind, 'message');
  assert.match(result.message, /Use "List folder" in Selection Actions/);
  assert.deepEqual(calls, []);
});

test('read context preflight shows folder action guidance even when selected folder read is disabled', async () => {
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
  assert.match(result.message, /Use "List folder" in Selection Actions/);
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
test('read context preflight shows selection-action guidance for folder wording without executing', async () => {
  const blockedState = createBlockedActionStateForTest();
  const result = await runReadContextPreflight({
    userText: 'was liegt hier drin?',
    selection: {
      kind: 'folder',
      path: '90_AI_Brain/Core',
      readAllowed: false,
      selectionId: 18
    },
    blockedState
  });

  assert.equal(result.handled, true);
  assert.equal(result.kind, 'message');
  assert.match(result.message, /Use "List folder" in Selection Actions/);
  assert.equal(blockedState.snapshot(), null);
});

test('read context preflight ignores transposed folder typos instead of adding typo rules', async () => {
  const blockedState = createBlockedActionStateForTest();
  const result = await runReadContextPreflight({
    userText: 'was ist in diesem ordenr?',
    selection: {
      kind: 'folder',
      path: '90_AI_Brain',
      readAllowed: false,
      selectionId: 19
    },
    blockedState
  });

  assert.equal(result.handled, false);
  assert.equal(blockedState.snapshot(), null);
});
test('read context preflight does not create selected-file reads from natural language', async () => {
  const blockedState = createBlockedActionStateForTest();
  const result = await runReadContextPreflight({
    userText: 'Was ist der Inhalt dieser Datei?',
    selection: {
      kind: 'file',
      path: '00_Inbox/Heroes.md',
      readAllowed: false,
      selectionId: 20
    },
    blockedState
  });

  assert.equal(result.handled, false);
  assert.equal(blockedState.snapshot(), null);
});

test('read context preflight retries selected-file reads after R is enabled', async () => {
  const blockedState = createBlockedActionStateForTest();
  const blocked = blockedState.set({
    type: 'selected_file_read',
    selectionId: 21,
    targetPath: '00_Inbox/Heroes.md',
    targetKind: 'file',
    requiredPermission: 'read',
    userText: 'Was ist der Inhalt dieser Datei?'
  });

  const result = await runReadContextPreflight({
    blockedActionId: blocked.id,
    selection: {
      kind: 'file',
      path: '00_Inbox/Heroes.md',
      readAllowed: true,
      content: '# Heroes\n\nSpider-Man',
      selectionId: 21
    },
    blockedState
  });

  assert.equal(result.handled, true);
  assert.equal(result.kind, 'retry_provider_request');
  assert.equal(result.retryUserText, 'Was ist der Inhalt dieser Datei?');
  assert.equal(blockedState.snapshot(), null);
});

test('read context preflight retries an existing blocked folder listing', async () => {
  const blockedState = createBlockedActionStateForTest();
  const calls = [];
  const blocked = blockedState.set({
    type: 'folder_list',
    selectionId: 22,
    targetPath: '90_AI_Brain/Core',
    targetKind: 'folder',
    requiredPermission: 'read',
    userText: 'Was liegt in diesem Ordner?'
  });

  const retryResult = await runReadContextPreflight({
    blockedActionId: blocked.id,
    selection: {
      kind: 'folder',
      path: '90_AI_Brain/Core',
      readAllowed: true,
      selectionId: 22
    },
    api: {
      vault: {
        listFolder: async (path) => {
          calls.push(path);
          return { ok: true, entries: [{ kind: 'markdown', name: 'Rules.md', path: '90_AI_Brain/Core/Rules.md' }] };
        }
      }
    },
    blockedState
  });

  assert.equal(retryResult.handled, true);
  assert.match(retryResult.message, /Rules\.md/);
  assert.deepEqual(calls, ['90_AI_Brain/Core']);
  assert.equal(blockedState.snapshot(), null);
});

test('read context preflight does not infer parent folder listings from selected files', async () => {
  const blockedState = createBlockedActionStateForTest();
  const result = await runReadContextPreflight({
    userText: 'Was liegt in diesem Ordner?',
    selection: {
      kind: 'file',
      path: '00_Inbox/AI Responses/Heroes.md',
      readAllowed: true,
      parentReadAllowed: false,
      selectionId: 23
    },
    api: {
      vault: {
        listFolder: async () => {
          throw new Error('must not list from file selection');
        }
      }
    },
    blockedState
  });

  assert.equal(result.handled, false);
  assert.equal(blockedState.snapshot(), null);
});
test('read context preflight retries same selected folder after permission resync changes selection id', async () => {
  const blockedState = createBlockedActionStateForTest();
  const blocked = blockedState.set({
    type: 'folder_list',
    selectionId: 30,
    targetPath: '90_AI_Brain',
    targetKind: 'folder',
    requiredPermission: 'read',
    userText: 'Was liegt in diesem Ordner?'
  });

  const result = await runReadContextPreflight({
    blockedActionId: blocked.id,
    selection: {
      kind: 'folder',
      path: '90_AI_Brain',
      readAllowed: true,
      selectionId: 31
    },
    api: {
      vault: {
        listFolder: async (path) => ({ ok: true, entries: [{ kind: 'folder', name: 'Core', path: path + '/Core' }] })
      }
    },
    blockedState
  });

  assert.equal(result.handled, true);
  assert.match(result.message, /Core/);
  assert.equal(blockedState.snapshot(), null);
});
test('read context preflight retries a matching blocked folder action from a permission confirmation message', async () => {
  const blockedState = createBlockedActionStateForTest();
  const blocked = blockedState.set({
    type: 'folder_list',
    selectionId: 40,
    targetPath: '90_AI_Brain/Core',
    targetKind: 'folder',
    requiredPermission: 'read',
    userText: 'was ist in diesem ordner?'
  });

  const result = await runReadContextPreflight({
    userText: 'es ist jetzt freigegeben',
    selection: {
      kind: 'folder',
      path: '90_AI_Brain/Core',
      readAllowed: true,
      selectionId: 41
    },
    api: {
      vault: {
        listFolder: async (path) => ({ ok: true, entries: [{ kind: 'markdown', name: 'Rules.md', path: path + '/Rules.md' }] })
      }
    },
    blockedState
  });

  assert.equal(result.handled, true);
  assert.match(result.message, /Rules\.md/);
  assert.equal(blockedState.snapshot(), null);
  assert.equal(blocked.id.startsWith('blocked-'), true);
});
function createBlockedActionStateForTest() {
  return require('../src/renderer/context/blockedActionState').createBlockedActionState();
}

test('read context preflight does not list explicit context folders from natural language', async () => {
  const calls = [];
  const result = await runReadContextPreflight({
    userText: 'was liegt hier drin?',
    selection: {
      kind: 'none',
      path: '',
      selectionId: 22,
      contextItems: [{ kind: 'folder', path: '90_AI_Brain/Core' }]
    },
    api: {
      vault: {
        async listFolder(path) {
          calls.push(path);
          return { ok: true, entries: [{ kind: 'markdown', name: 'Rules.md', path: path + '/Rules.md' }] };
        }
      }
    }
  });

  assert.equal(result.handled, true);
  assert.match(result.message, /Use "List folder" in Selection Actions/);
  assert.deepEqual(calls, []);
});

test('read context preflight does not choose between multiple context folders from natural language', async () => {
  const calls = [];
  const result = await runReadContextPreflight({
    userText: 'was liegt hier drin?',
    selection: {
      kind: 'folder',
      path: '90_AI_Brain',
      readAllowed: true,
      selectionId: 23,
      contextItems: [
        { kind: 'folder', path: '90_AI_Brain/Core' },
        { kind: 'folder', path: '90_AI_Brain' }
      ]
    },
    api: {
      vault: {
        async listFolder(path) {
          calls.push(path);
          return { ok: true, entries: [{ kind: 'folder', name: 'Core', path: path + '/Core' }] };
        }
      }
    }
  });

  assert.equal(result.handled, true);
  assert.match(result.message, /Use "List folder" in Selection Actions/);
  assert.deepEqual(calls, []);
});
