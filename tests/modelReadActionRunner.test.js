'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  runModelReadActions,
  isPathInsideActiveSelection
} = require('../src/renderer/chat/modelReadActionRunner');

test('model read action runner executes selected folder list actions through the vault API', async () => {
  const calls = [];
  const result = await runModelReadActions({
    content: '<|tool_call>call:list_folder{path: "00_Inbox/AI Responses"}<tool_call|>',
    selection: { kind: 'folder', path: '00_Inbox/AI Responses' },
    api: {
      vault: {
        async listFolder(path) {
          calls.push(path);
          return {
            ok: true,
            entries: [
              { kind: 'markdown', name: 'A.md' },
              { kind: 'folder', name: 'Nested' }
            ]
          };
        }
      }
    }
  });

  assert.equal(result.handled, true);
  assert.deepEqual(calls, ['00_Inbox/AI Responses']);
  assert.match(result.messages[0], /Folder listed: 00_Inbox\/AI Responses/);
  assert.match(result.messages[0], /- A\.md/);
  assert.match(result.messages[0], /- Nested\//);
});

test('model read action runner blocks list actions outside the active selection', async () => {
  const result = await runModelReadActions({
    content: '<|tool_call>call:list_folder{path: "99_Archiv"}<tool_call|>',
    selection: { kind: 'folder', path: '00_Inbox' },
    api: {
      vault: {
        async listFolder() {
          throw new Error('must not execute');
        }
      }
    }
  });

  assert.equal(result.handled, true);
  assert.match(result.messages[0], /blocked/i);
});

test('model read action runner allows selected-file parent folder listing', () => {
  assert.equal(isPathInsideActiveSelection('03_Wissen/Comics', {
    kind: 'file',
    path: '03_Wissen/Comics/Comic-Verlage.md'
  }), true);
});

test('model read action runner prefers browser global parser when available', async () => {
  const previousWindow = global.window;
  global.window = {
    VincariosModelActionParser: {
      parseModelActionCalls() { return []; },
      stripModelActionCalls(text) { return String(text || ''); },
      normalizePathLike(value) { return String(value || ''); }
    }
  };

  try {
    const result = await runModelReadActions({
      content: 'Plain assistant answer without actions.',
      selection: { kind: 'folder', path: '00_Inbox' },
      api: {}
    });

    assert.equal(result.handled, false);
    assert.equal(result.visibleText, 'Plain assistant answer without actions.');
  } finally {
    global.window = previousWindow;
  }
});
test('model read action runner continues normal chat when the parser is unavailable', async () => {
  const result = await runModelReadActions({
    parser: null,
    content: 'Hallo! Wie kann ich dir helfen?',
    selection: { kind: 'folder', path: '00_Inbox' },
    api: {}
  });

  assert.equal(result.handled, false);
  assert.equal(result.visibleText, 'Hallo! Wie kann ich dir helfen?');
});