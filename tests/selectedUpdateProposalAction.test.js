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
for (const { length, options, accepted } of [
  { length: 20000, options: {}, accepted: true },
  { length: 20001, options: {}, accepted: false },
  { length: 28812, options: {}, accepted: false },
  { length: 4000, options: { maxChars: 4000 }, accepted: true },
  { length: 4001, options: { maxChars: 4000 }, accepted: false },
  { length: 6000, options: { maxChars: 6000 }, accepted: true },
  { length: 6001, options: { maxChars: 6000 }, accepted: false }
]) {
  test('whole-note update ' + (accepted ? 'includes' : 'rejects') + ' ' + length + ' characters at limit ' + (options.maxChars || 20000), () => {
    const content = '\u00e4'.repeat(length);
    const result = buildSelectedFileUpdateMessages({
      kind: 'file', path: '03_Knowledge/Long.md', readAllowed: true, writeAllowed: true, content
    }, 'Append one sentence.', options);

    assert.equal(result.ok, accepted);
    if (accepted) {
      assert.equal(result.currentContent, content);
      assert.equal(result.diagnostics.sentContentChars, length);
      assert.equal(result.diagnostics.truncated, false);
      assert.equal(result.messages[1].content.includes('```md\n' + content + '\n```'), true);
    } else {
      assert.equal(result.code, 'note_too_large_for_whole_note_update');
      assert.equal(result.messages, undefined);
      assert.match(result.message, /Edit it manually or split it/);
    }
  });
}

for (const { baseline, proposed, expected } of [
  { baseline: '# Old\n', proposed: '# New', expected: '# New\n' },
  { baseline: '# Old', proposed: '# New\n', expected: '# New' },
  { baseline: '# Old\n\n', proposed: '# New\n', expected: '# New\n\n' },
  { baseline: '# Old\r\n', proposed: '# New\n', expected: '# New\r\n' },
  { baseline: '    old code\n', proposed: '    new code  \n', expected: '    new code  \n' },
  { baseline: '\n# Old\n', proposed: '\n# New\n', expected: '\n# New\n' }
]) {
  test('update parser preserves content whitespace and baseline newline suffix ' + JSON.stringify({ baseline, proposed }), () => {
    const result = parseSelectedFileUpdateProposal(JSON.stringify({ proposedContent: proposed }), {
      path: '03_Knowledge/Test.md', currentContent: baseline
    });
    assert.equal(result.ok, true);
    assert.equal(result.proposal.currentContent, baseline);
    assert.equal(result.proposal.proposedContent, expected);
  });
}

test('update parser rejects whitespace-only content without treating whitespace as an update', () => {
  const result = parseSelectedFileUpdateProposal(JSON.stringify({ proposedContent: ' \r\n\t ' }), {
    path: '03_Knowledge/Test.md', currentContent: '# Original\n'
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'missing_proposed_content');
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
