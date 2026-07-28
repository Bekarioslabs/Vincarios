'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildFolderContextSnapshot } = require('../src/renderer/selectionActions/folderContextSnapshotAction');
const { listFolderTree } = require('../src/renderer/context/folderContextController');

test('folder context snapshot reads only Markdown files from the current folder', async () => {
  const reads = [];
  const result = await buildFolderContextSnapshot({
    vaultApi: {
      async listFolder() {
        return { ok: true, entries: [
          { kind: 'markdown', path: '00_Inbox/One.md' },
          { kind: 'file', path: '00_Inbox/image.png' },
          { kind: 'folder', path: '00_Inbox/Nested' }
        ] };
      },
      async readMarkdown(path) {
        reads.push(path);
        return { ok: true, path, content: '# One' };
      }
    },
    path: '00_Inbox',
    scopeOptions: { scope: 'current', maxFiles: 10 },
    limits: { maxSelectedFileChars: 100 }
  });

  assert.equal(result.ok, true);
  assert.deepEqual(reads, ['00_Inbox/One.md']);
  assert.equal(result.item.kind, 'folder_snapshot');
  assert.deepEqual(result.item.files, [{ path: '00_Inbox/One.md', content: '# One', truncated: false }]);
  assert.equal(result.item.scope.scope, 'current');
});

test('folder context snapshot applies one total character limit across included Markdown files', async () => {
  const result = await buildFolderContextSnapshot({
    vaultApi: {
      async listFolder() {
        return { ok: true, entries: [
          { kind: 'markdown', path: '00_Inbox/One.md' },
          { kind: 'markdown', path: '00_Inbox/Two.md' }
        ] };
      },
      async readMarkdown(path) {
        return { ok: true, path, content: path.endsWith('One.md') ? '123456' : 'abcdef' };
      }
    },
    path: '00_Inbox',
    scopeOptions: { scope: 'current', maxFiles: 10 },
    limits: { maxSelectedFileChars: 8 }
  });

  assert.equal(result.ok, true);
  assert.equal(result.item.totalChars, 8);
  assert.equal(result.item.truncated, true);
  assert.deepEqual(result.item.files, [
    { path: '00_Inbox/One.md', content: '123456', truncated: false },
    { path: '00_Inbox/Two.md', content: 'ab', truncated: true }
  ]);
});

test('folder context snapshot returns a clear empty result when no Markdown notes are in scope', async () => {
  const result = await buildFolderContextSnapshot({
    vaultApi: { async listFolder() { return { ok: true, entries: [{ kind: 'file', path: '00_Inbox/image.png' }] }; }, async readMarkdown() { throw new Error('should not read'); } },
    path: '00_Inbox',
    scopeOptions: { scope: 'current' },
    limits: { maxSelectedFileChars: 100 }
  });

  assert.deepEqual(result, { ok: false, code: 'no_markdown_files', message: 'No Markdown notes found in the selected folder scope.' });
});
test('folder context snapshot forwards recursive scope options to the shared reader', async () => {
  const entriesByFolder = {
    '00_Inbox/Scope': [
      { kind: 'markdown', path: '00_Inbox/Scope/Direct.md' },
      { kind: 'folder', path: '00_Inbox/Scope/Nested' }
    ],
    '00_Inbox/Scope/Nested': [
      { kind: 'markdown', path: '00_Inbox/Scope/Nested/Deep.md' }
    ]
  };
  const contentByPath = {
    '00_Inbox/Scope/Direct.md': 'amber maple station',
    '00_Inbox/Scope/Nested/Deep.md': 'copper forest station'
  };
  const vaultApi = {
    async listFolder(path) {
      return { ok: true, entries: entriesByFolder[path] || [] };
    },
    async readMarkdown(path) {
      return { ok: true, path, content: contentByPath[path] };
    }
  };

  const result = await buildFolderContextSnapshot({
    vaultApi,
    folderController: { listFolderTree },
    path: '00_Inbox/Scope',
    scopeOptions: { scope: 'subfolders', maxDepth: 3, maxFiles: 10 },
    limits: { maxSelectedFileChars: 1000, maxListedFolders: 10, maxListedFiles: 10 }
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.item.files.map((file) => file.path), [
    '00_Inbox/Scope/Direct.md',
    '00_Inbox/Scope/Nested/Deep.md'
  ]);
  assert.equal(result.item.files[1].content, 'copper forest station');
  assert.equal(result.item.scope.scope, 'subfolders');
});
