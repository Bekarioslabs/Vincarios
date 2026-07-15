'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildFolderMarkdownSummaryMessages,
  normalizeFolderMarkdownFiles,
  DEFAULT_MAX_FILES,
  DEFAULT_MAX_CHARS_PER_FILE
} = require('../src/renderer/selectionActions/folderSummaryAction');

test('folder markdown summary accepts direct Markdown file contents only', () => {
  const result = buildFolderMarkdownSummaryMessages({
    folderPath: '03_Knowledge',
    files: [
      { path: '03_Knowledge/A.md', content: '# A\nBody A' },
      { path: '03_Knowledge/B.markdown', content: '# B\nBody B' },
      { path: '03_Knowledge/image.png', content: 'ignored' }
    ]
  });

  assert.equal(result.ok, true);
  assert.equal(result.files.length, 2);
  assert.match(result.messages[0].content, /summarizing Markdown files in one selected folder/);
  assert.match(result.messages[0].content, /### Included notes/);
  assert.match(result.messages[1].content, /Folder: 03_Knowledge/);
  assert.match(result.messages[1].content, /Files included: 2/);
  assert.match(result.messages[1].content, /Path: 03_Knowledge\/A\.md/);
  assert.doesNotMatch(result.messages[1].content, /image\.png/);
});

test('folder markdown summary enforces file count and per-file content limits', () => {
  const content = 'x'.repeat(DEFAULT_MAX_CHARS_PER_FILE + 10);
  const result = normalizeFolderMarkdownFiles({
    folderPath: '03_Knowledge',
    files: Array.from({ length: DEFAULT_MAX_FILES + 2 }, (_, index) => ({
      path: '03_Knowledge/Note-' + index + '.md',
      content
    })),
    limits: { maxAnalysisFiles: 2, maxSelectedFileChars: 1000 }
  });

  assert.equal(result.ok, true);
  assert.equal(result.files.length, 2);
  assert.equal(result.limitedByFileCount, true);
  assert.equal(result.files[0].content.length, 1000);
  assert.equal(result.files[0].truncated, true);
});

test('folder markdown summary rejects empty readable Markdown sets', () => {
  const result = buildFolderMarkdownSummaryMessages({ folderPath: '03_Knowledge', files: [] });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'no_markdown_files');
});
test('folder markdown summary records an explicit subfolder scope in the provider request', () => {
  const result = buildFolderMarkdownSummaryMessages({
    folderPath: '02_Projects',
    scope: { scope: 'subfolders', maxDepth: 2, maxFiles: 3 },
    files: [{ path: '02_Projects/Project/Overview.md', content: '# Overview' }]
  });

  assert.equal(result.ok, true);
  assert.match(result.messages[1].content, /Scope: subfolders \(maximum depth: 2\)/);
  assert.match(result.messages[1].content, /Files included: 1/);
});