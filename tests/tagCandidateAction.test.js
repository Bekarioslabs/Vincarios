'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildTagCandidates,
  extractTags,
  applyTagsToMarkdown
} = require('../src/renderer/selectionActions/tagCandidateAction');

test('extractTags reads yaml block-list and inline tags', () => {
  assert.deepEqual(extractTags(`---
tags:
  - alpha
  - project
---
# Note`), ['alpha', 'project']);
  assert.deepEqual(extractTags(`---
tags: [star-lu, character]
---
# Note`), ['star-lu', 'character']);
});

test('applyTagsToMarkdown creates frontmatter when missing', () => {
  const result = applyTagsToMarkdown(`# StarLu Character Sheet
Body text`, ['starlu', 'character']);

  assert.equal(result.startsWith(`---
tags:
  - starlu
  - character
---
# StarLu`), true);
});

test('applyTagsToMarkdown appends missing tags to an existing tags block', () => {
  const result = applyTagsToMarkdown(`---
tags:
  - starlu
status: draft
---
# Note`, ['starlu', 'visual']);

  assert.equal(result.includes(`tags:
  - starlu
  - visual
status: draft`), true);
});

test('buildTagCandidates creates one convertible metadata candidate with proposed content', () => {
  const result = buildTagCandidates({
    path: '02_Projects/StarLu/Wiki/Characters/Luna_Profile.md',
    content: `---
tags:
  - starlu
---
# Luna Profile
A young hero.`
  });

  assert.equal(result.ok, true);
  assert.equal(result.group.items.length, 1);
  const item = result.group.items[0];
  assert.equal(item.kind, 'metadata_candidate');
  assert.equal(item.path, '02_Projects/StarLu/Wiki/Characters/Luna_Profile.md');
  assert.equal(item.data.currentContent.includes('# Luna Profile'), true);
  assert.equal(item.data.proposedContent.includes('- luna'), true);
  assert.equal(item.data.proposedContent.includes('- profile'), true);
});

test('buildTagCandidates reports no change when useful tags already exist', () => {
  const result = buildTagCandidates({
    path: '02_Projects/StarLu/Luna_Profile.md',
    content: `---
tags:
  - starlu
  - luna
  - profile
---
# Luna Profile`
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'no_tag_candidates');
});
test('buildTagCandidates uses project role and standard file roles without sentence tags', () => {
  const result = buildTagCandidates({
    path: '02_Projects/StarLu/Wiki/References.md',
    content: '# References\nUseful sources.'
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.group.items[0].data.tags, ['starlu', 'references', 'wiki']);
});

test('buildTagCandidates can add AI response folder tag without sentence garbage', () => {
  const result = buildTagCandidates({
    path: '00_Inbox/AI Responses/Hello! How can I help you today.md',
    content: 'Hello! How can I help you today?'
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.group.items[0].data.tags, ['ai-responses']);
});
test('buildTagCandidates still finds useful tags in AI response notes', () => {
  const result = buildTagCandidates({
    path: '00_Inbox/AI Responses/Here are five things about Tony Stark.md',
    content: `The Identity Tony Stark

Tony Stark is connected to Marvel Comics and Stark Industries.`
  });

  assert.equal(result.ok, true);
  assert.equal(result.group.items[0].data.tags.includes('ai-responses'), true);
  assert.equal(result.group.items[0].data.tags.includes('tony-stark'), true);
});

test('buildTagCandidates uses custom vault profile roles instead of hard-coded folder names', () => {
  const result = buildTagCandidates({
    path: 'Wissen/VPS_Backup_Strategy.md',
    content: '# VPS Backup Strategy\nNotes about storage.',
    vaultProfile: { folders: { knowledge: 'Wissen', projects: 'Projekte' } }
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.group.items[0].data.tags, ['vps', 'backup', 'strategy']);
});
test('buildTagCandidates treats Summary prefix as a document type tag', () => {
  const result = buildTagCandidates({
    path: '00_Inbox/AI Responses/Summary - MD - Here are 5.md',
    content: `---
tags:
  - ai-responses
---
# Summary - MD - Here are 5
Short generated summary.`
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.group.items[0].data.tags, ['summary']);
});
test('buildTagCandidates adds summary and AI response tags when both are missing', () => {
  const result = buildTagCandidates({
    path: '00_Inbox/AI Responses/Summary - MD - Here are 5.md',
    content: `# Summary - MD - Here are 5
Short generated summary.`
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.group.items[0].data.tags, ['summary', 'ai-responses']);
});

test('buildTagCandidates keeps repeated Summary filenames useful without broad stopwords', () => {
  const result = buildTagCandidates({
    path: '00_Inbox/AI Responses/Summary - MD - Summary - MD.md',
    content: `---
tags:
  - ai-responses
---
# Summary - MD - Summary - MD
Short generated summary.`
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.group.items[0].data.tags, ['summary']);
});