'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isSelectedFileUpdateRequest,
  buildSelectedFileUpdateMessages,
  parseSelectedFileUpdateProposal
} = require('../src/renderer/chat/selectedUpdateProposalAction');

test('selected update intent detects explicit note edit requests only', () => {
  assert.equal(isSelectedFileUpdateRequest('Please update this note with a short conclusion.'), true);
  assert.equal(isSelectedFileUpdateRequest('Add a sources section to the selected file.'), true);
  assert.equal(isSelectedFileUpdateRequest('Tell me what whales are.'), false);
});

test('selected update messages require a readable and writable Markdown file with content', () => {
  const missingWrite = buildSelectedFileUpdateMessages({
    kind: 'file',
    path: '03_Knowledge/Test.md',
    readAllowed: true,
    writeAllowed: false,
    content: '# Test'
  }, 'Update this note.');

  assert.equal(missingWrite.ok, false);
  assert.equal(missingWrite.code, 'write_required');

  const ready = buildSelectedFileUpdateMessages({
    kind: 'file',
    path: '03_Knowledge/Test.md',
    readAllowed: true,
    writeAllowed: true,
    content: '# Test\n\nOld body.'
  }, 'Update this note.');

  assert.equal(ready.ok, true);
  assert.equal(ready.path, '03_Knowledge/Test.md');
  assert.equal(ready.currentContent, '# Test\n\nOld body.');
  assert.match(ready.messages[0].content, /whole-note update proposal/i);
  assert.match(ready.messages[1].content, /Return only JSON/i);
});

test('selected update proposal parser creates a reviewed whole-note update proposal', () => {
  const parsed = parseSelectedFileUpdateProposal('```json\n{"title":"Add conclusion","proposedContent":"# Test\\n\\nNew body.","reason":"User asked for a conclusion."}\n```', {
    path: '03_Knowledge/Test.md',
    currentContent: '# Test\n\nOld body.'
  });

  assert.equal(parsed.ok, true);
  assert.equal(parsed.proposal.type, 'update_note');
  assert.equal(parsed.proposal.targetPath, '03_Knowledge/Test.md');
  assert.equal(parsed.proposal.currentContent, '# Test\n\nOld body.');
  assert.equal(parsed.proposal.proposedContent, '# Test\n\nNew body.');
  assert.equal(parsed.proposal.updateMode, 'whole_note');
});
test('selected update diagnostics report truncated context', () => {
  const longContent = 'a'.repeat(5000);
  const ready = buildSelectedFileUpdateMessages({
    kind: 'file',
    path: '03_Knowledge/Long.md',
    readAllowed: true,
    writeAllowed: true,
    content: longContent
  }, 'Append one sentence.', { maxChars: 4000 });

  assert.equal(ready.ok, true);
  assert.equal(ready.diagnostics.currentContentChars, 5000);
  assert.equal(ready.diagnostics.sentContentChars < ready.diagnostics.currentContentChars, true);
  assert.equal(ready.diagnostics.truncated, true);
});



test('selected update prompt forbids rename move and retarget operations', () => {
  const ready = buildSelectedFileUpdateMessages({
    kind: 'file',
    path: '03_Knowledge/Test.md',
    readAllowed: true,
    writeAllowed: true,
    content: '# Test'
  }, 'Rename this file to Better.md');

  assert.equal(ready.ok, true);
  assert.match(ready.messages[0].content, /Content updates only/i);
  assert.match(ready.messages[1].content, /Not allowed: rename, move, retarget/i);
});

test('selected update prompt requires unrelated Markdown and frontmatter to be preserved', () => {
  const ready = buildSelectedFileUpdateMessages({
    kind: 'file',
    path: '03_Knowledge/Test.md',
    readAllowed: true,
    writeAllowed: true,
    content: '---\ntags:\n  - test\n---\n\n# Test\n\nExisting paragraph.'
  }, 'Add one short fact.');

  assert.equal(ready.ok, true);
  assert.match(ready.messages[0].content, /Preserve the complete YAML frontmatter/i);
  assert.match(ready.messages[0].content, /Never delete text unless the user explicitly asks/i);
});
