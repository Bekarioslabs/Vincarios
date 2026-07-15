'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const presentation = require('../src/renderer/selectionActions/summaryResponsePresentation');

test('file summary presentation provides stable app-owned heading and source metadata', () => {
  const result = presentation.formatFileSummaryResponse({
    path: '03_Knowledge/Outline.md',
    truncated: true,
    content: '### Key points\n- Clear structure'
  });

  assert.match(result, /^## File summary/m);
  assert.match(result, /_File: `03_Knowledge\/Outline\.md`_/);
  assert.match(result, /Source content was truncated/);
  assert.match(result, /### Key points/);
});

test('folder summary presentation provides visible scope and included Markdown count', () => {
  const result = presentation.formatFolderSummaryResponse({
    folderPath: '02_Projects/Story',
    scope: { scope: 'subfolders', maxDepth: 2 },
    includedFileCount: 4,
    limitedByFileCount: true,
    content: '### Included notes\n- Draft.md — outline'
  });

  assert.match(result, /^## Folder summary/m);
  assert.match(result, /_Folder: `02_Projects\/Story`_/);
  assert.match(result, /_Scope: Subfolders · depth 2 · 4 Markdown notes · file limit reached_/);
  assert.match(result, /### Included notes/);
});
test('folder summary format requires a separated purpose description for each included note', () => {
  assert.match(presentation.buildFolderSummaryFormatInstruction(), /bold code-styled file name, then a blank line and an indented italic one-sentence purpose description/);
});