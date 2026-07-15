'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildChatContextPackage } = require('../src/renderer/context/contextState');

test('context builder does not attach selected files unless they are explicit context items', () => {
  const context = buildChatContextPackage({
    userText: 'What is this about?',
    selection: {
      kind: 'file',
      path: '03_Knowledge/Topic.md',
      content: '# Topic\n\nBody',
      readAllowed: true
    }
  });

  assert.equal(context.shouldAttach, false);
  assert.equal(context.content, '');
});

test('context builder attaches explicit Markdown file context items', () => {
  const context = buildChatContextPackage({
    userText: 'What is the biggest fish?',
    contextItems: [{
      id: 'ctx-topic',
      kind: 'file',
      path: '03_Knowledge/Topic.md',
      content: '# Topic\n\nBody'
    }]
  });

  assert.equal(context.shouldAttach, true);
  assert.match(context.content, /## Context Basket/);
  assert.match(context.content, /Context source: context_basket/);
  assert.match(context.content, /Selected type: Markdown file/);
  assert.match(context.content, /Path: 03_Knowledge\/Topic.md/);
  assert.match(context.content, /```md\n# Topic\n\nBody\n```/);
});

test('context builder attaches explicit folder context without loading folder contents', () => {
  const context = buildChatContextPackage({
    userText: 'What is the biggest fish?',
    contextItems: [{
      id: 'ctx-folder',
      kind: 'folder',
      path: '03_Knowledge/Animals'
    }]
  });

  assert.equal(context.shouldAttach, true);
  assert.match(context.content, /Selected type: folder/);
  assert.match(context.content, /Path: 03_Knowledge\/Animals/);
  assert.match(context.content, /Folder contents are not included/);
  assert.doesNotMatch(context.content, /```md/);
});

test('context builder supports multiple explicit context items', () => {
  const context = buildChatContextPackage({
    contextItems: [
      { id: 'ctx-a', kind: 'file', path: 'A.md', content: '# A' },
      { id: 'ctx-b', kind: 'file', path: 'B.md', content: '# B' }
    ]
  });

  assert.equal(context.shouldAttach, true);
  assert.match(context.content, /Path: A\.md/);
  assert.match(context.content, /Path: B\.md/);
});

test('context builder truncates long explicit Markdown context items with an explicit marker', () => {
  const context = buildChatContextPackage({
    maxChars: 12,
    contextItems: [{
      id: 'ctx-long',
      kind: 'file',
      path: 'Long.md',
      content: '12345678901234567890'
    }]
  });

  assert.match(context.content, /Status: content truncated/);
  assert.match(context.content, /123456789012/);
  assert.match(context.content, /truncated/);
  assert.doesNotMatch(context.content, /34567890\n```/);
});

test('context builder attaches visible, bounded folder Markdown snapshots', () => {
  const context = buildChatContextPackage({
    contextItems: [{
      kind: 'folder_snapshot',
      path: '03_Knowledge/Animals',
      scope: { scope: 'subfolders', maxDepth: 2, maxFiles: 10, fileType: 'markdown' },
      effectiveLimits: { maxTotalChars: 100 },
      files: [{ path: '03_Knowledge/Animals/Whales.md', content: '# Whales', truncated: false }],
      totalChars: 8,
      truncated: false
    }]
  });

  assert.match(context.content, /Selected type: folder Markdown snapshot/);
  assert.match(context.content, /Scope: subfolders \(maximum depth: 2\)/);
  assert.match(context.content, /Effective limits: Markdown only; up to 10 notes; up to 100 total characters\./);
  assert.match(context.content, /Included Markdown notes: 1/);
  assert.match(context.content, /Path: 03_Knowledge\/Animals\/Whales\.md/);
  assert.match(context.content, /```md\n# Whales\n```/);
});