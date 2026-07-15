'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildFileSummaryMessages, normalizeSummarySelection, DEFAULT_MAX_CHARS } = require('../src/renderer/selectionActions/fileSummaryAction');

test('file summary accepts one readable Markdown selection', () => {
  const result = buildFileSummaryMessages({ kind: 'file', path: '03_Knowledge/A.md', readAllowed: true, content: '# A\nBody' });

  assert.equal(result.ok, true);
  assert.equal(result.messages.length, 2);
  assert.match(result.messages[0].content, /summarizing one selected Markdown file/);
  assert.match(result.messages[0].content, /### Key points/);
  assert.match(result.messages[1].content, /Path: 03_Knowledge\/A\.md/);
  assert.match(result.messages[1].content, /```md\n# A\nBody\n```/);
});

test('file summary rejects unreadable or non-Markdown selections', () => {
  assert.equal(normalizeSummarySelection({ kind: 'file', path: 'A.md', readAllowed: false, content: '# A' }).code, 'read_required');
  assert.equal(normalizeSummarySelection({ kind: 'file', path: 'A.png', readAllowed: true, content: 'x' }).code, 'not_markdown');
  assert.equal(normalizeSummarySelection({ kind: 'folder', path: '03_Knowledge', readAllowed: true }).code, 'not_file');
});

test('file summary truncates large Markdown content through a central limit', () => {
  const content = 'a'.repeat(DEFAULT_MAX_CHARS + 10);
  const result = buildFileSummaryMessages({ kind: 'file', path: 'A.md', readAllowed: true, content });

  assert.equal(result.ok, true);
  assert.equal(result.truncated, true);
  assert.match(result.messages[1].content, /truncated to 12000 characters/);
});
test('file summary respects the configured source character limit', () => {
  const content = 'a'.repeat(15001);
  const result = buildFileSummaryMessages({ kind: 'file', path: 'A.md', readAllowed: true, content }, { maxChars: 15000 });

  assert.equal(result.ok, true);
  assert.equal(result.truncated, true);
  assert.match(result.messages[1].content, /truncated to 15000 characters/);
});