'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isMarkdownDropFile,
  hasFileTransfer,
  createDroppedMarkdownContextItem,
  createImportProposalFromDrop,
  formatDropMessage
} = require('../src/renderer/chat/markdownDropController');

test('markdown drop accepts markdown file extensions only', () => {
  assert.equal(isMarkdownDropFile({ name: 'Note.md' }), true);
  assert.equal(isMarkdownDropFile({ name: 'Research.markdown' }), true);
  assert.equal(isMarkdownDropFile({ name: 'Image.png' }), false);
  assert.equal(isMarkdownDropFile({ name: 'Archive.md.exe' }), false);
});


test('markdown drop detects file transfers even before file names are exposed', () => {
  assert.equal(hasFileTransfer({ files: [{ name: 'Note.md' }] }), true);
  assert.equal(hasFileTransfer({ files: [], types: ['Files'] }), true);
  assert.equal(hasFileTransfer({ files: [], types: ['text/plain'] }), false);
});
test('markdown drop creates a temporary context item without vault import', () => {
  const item = createDroppedMarkdownContextItem({
    name: 'Outside Note.md',
    path: 'D:/Downloads/Outside Note.md',
    content: '# Outside\n\nBody.'
  });

  assert.equal(item.kind, 'file');
  assert.equal(item.path, 'External Drops/Outside Note.md');
  assert.equal(item.source, 'dropped_markdown');
  assert.equal(item.externalPath, 'D:/Downloads/Outside Note.md');
  assert.equal(item.content, '# Outside\n\nBody.');
});

test('markdown drop import proposal targets inbox review flow', () => {
  const proposal = createImportProposalFromDrop({
    name: 'Outside Note.md',
    content: '# Outside\n\nBody.'
  });

  assert.equal(proposal.type, 'create_note');
  assert.equal(proposal.category, 'create');
  assert.equal(proposal.title, 'Outside Note');
  assert.equal(proposal.targetFolder, '00_Inbox');
  assert.match(proposal.content, /tags:\n  - imported-note/);
  assert.match(proposal.content, /origin_action: import_markdown/);
  assert.match(proposal.content, /# Outside\n\nBody\.$/);
  assert.match(proposal.reason, /external Markdown drop/);
});

test('markdown drop message explains context and reviewed import', () => {
  const message = formatDropMessage({ name: 'Outside Note.md' });

  assert.match(message, /Outside Note\.md/);
  assert.match(message, /temporary context/);
  assert.match(message, /Import to Inbox/);
});