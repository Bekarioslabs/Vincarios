'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { listScopedMarkdownFiles } = require('../src/renderer/selectionActions/folderMarkdownScopeReader');

test('scoped Markdown reader lists only direct Markdown files within max files', async () => {
  const result = await listScopedMarkdownFiles({
    vaultApi: {
      async listFolder() {
        return { ok: true, entries: [
          { kind: 'markdown', path: '00_Inbox/One.md' },
          { kind: 'file', path: '00_Inbox/ignore.png' },
          { kind: 'markdown', path: '00_Inbox/Two.md' }
        ] };
      }
    },
    path: '00_Inbox',
    scopeOptions: { scope: 'current', maxFiles: 1 }
  });

  assert.deepEqual(result.files, ['00_Inbox/One.md']);
  assert.equal(result.fileLimitReached, true);
  assert.equal(result.depthLimitReached, false);
});

test('scoped Markdown reader delegates subfolder traversal with bounded depth and file limits', async () => {
  const calls = [];
  const result = await listScopedMarkdownFiles({
    vaultApi: {},
    folderController: {
      async listFolderTree(_vaultApi, target) {
        calls.push(target);
        return {
          ok: true,
          folders: [{ path: '00_Inbox', ok: true, entries: [{ kind: 'markdown', path: '00_Inbox/One.md' }] }],
          depthLimitReached: true,
          fileLimitReached: false,
          truncated: false
        };
      }
    },
    path: '00_Inbox',
    scopeOptions: { scope: 'subfolders', maxDepth: 2, maxFiles: 3 }
  });

  assert.deepEqual(result.files, ['00_Inbox/One.md']);
  assert.equal(calls[0].maxDepth, 2);
  assert.equal(calls[0].limits.maxListedFiles, 3);
  assert.equal(result.depthLimitReached, true);
});