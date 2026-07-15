const test = require('node:test');
const assert = require('node:assert/strict');

const inspect = require('../src/renderer/selectionActions/folderInspectAction');
const scope = require('../src/renderer/selectionActions/folderScopeOptions');

test('folder inspection report groups direct folders and Markdown notes without reading content', () => {
  const report = inspect.buildFolderInspectionReport({
    path: '00_Inbox/AI Responses',
    entries: [
      { kind: 'folder', name: 'Summaries', path: '00_Inbox/AI Responses/Summaries' },
      { kind: 'markdown', name: 'Answer.md', path: '00_Inbox/AI Responses/Answer.md' },
      { kind: 'markdown', name: 'Ideas.md', path: '00_Inbox/AI Responses/Ideas.md' }
    ]
  });

  assert.match(report, /^## Folder inspection/m);
  assert.match(report, /_Folder: `00_Inbox\/AI Responses`_/);
  assert.match(report, /### Current level/);
  assert.match(report, /- \*\*Folders:\*\* 1/);
  assert.match(report, /- \*\*Markdown notes:\*\* 2/);
  assert.match(report, /### Folders\n- Summaries\//);
  assert.match(report, /### Markdown notes\n- Answer\.md\n- Ideas\.md/);
  assert.match(report, /Markdown contents were not read\./);
});

test('folder inspection scope defaults to the current level with bounded values', () => {
  assert.deepEqual(scope.normalizeFolderScopeOptions({}), {
    scope: 'current',
    maxDepth: 3,
    maxFiles: 50,
    fileType: 'markdown'
  });
});

test('folder inspection scope normalizes invalid values without becoming unbounded', () => {
  assert.deepEqual(scope.normalizeFolderScopeOptions({
    scope: 'subfolders',
    maxDepth: 999,
    maxFiles: 0,
    fileType: 'images'
  }), {
    scope: 'subfolders',
    maxDepth: 10,
    maxFiles: 50,
    fileType: 'markdown'
  });
});
