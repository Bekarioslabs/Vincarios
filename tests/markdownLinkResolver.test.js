'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isInternalMarkdownTarget,
  createMarkdownLinkCandidates
} = require('../src/renderer/markdown/markdownLinkResolver');

test('rejects external and non-markdown link targets for preview navigation', () => {
  assert.equal(isInternalMarkdownTarget('https://example.com'), false);
  assert.equal(isInternalMarkdownTarget('mailto:test@example.com'), false);
  assert.equal(isInternalMarkdownTarget('#local-heading'), false);
  assert.equal(isInternalMarkdownTarget('image.png'), false);
});

test('creates relative Markdown link candidates from the current file folder', () => {
  const candidates = createMarkdownLinkCandidates('../Core/Rules.md#section', '90_AI_Brain/Guides/System.md');

  assert.deepEqual(candidates, ['90_AI_Brain/Core/Rules.md']);
});

test('creates wikilink candidates with md extension near the current file and vault root', () => {
  const candidates = createMarkdownLinkCandidates('Preferences', '90_AI_Brain/Core/Agent_Bootstrap.md');

  assert.deepEqual(candidates, [
    '90_AI_Brain/Core/Preferences.md',
    'Preferences.md'
  ]);
});

test('keeps explicit markdown paths ahead of fallback candidates', () => {
  const candidates = createMarkdownLinkCandidates('Projects/Index.md', '90_AI_Brain/Core/Agent_Bootstrap.md');

  assert.deepEqual(candidates, [
    '90_AI_Brain/Core/Projects/Index.md',
    'Projects/Index.md'
  ]);
});
