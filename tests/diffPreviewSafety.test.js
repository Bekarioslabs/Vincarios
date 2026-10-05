'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildMarkdownDiffPreview,
  DIFF_LIMITS
} = require('../src/shared/actions/diffPreview');
const { createReviewBasketState } = require('../src/renderer/review/reviewBasketState');

test('large similar notes produce compact context hunks without a quadratic full-file preview', () => {
  const before = Array.from({ length: 2001 }, (_, index) => 'Line ' + index);
  const after = before.slice();
  after[1000] = 'Changed line';

  const diff = buildMarkdownDiffPreview({
    currentContent: before.join('\n'),
    proposedContent: after.join('\n')
  });

  assert.equal(diff.ok, true);
  assert.equal(diff.additions, 1);
  assert.equal(diff.deletions, 1);
  assert.equal(diff.hunks.length, 1);
  assert.equal(diff.hunks[0].lines.length <= 8, true);
});

test('pathologically different notes stop at the explicit edit-distance limit', () => {
  const lineCount = Math.floor(DIFF_LIMITS.maxEditDistance / 2) + 100;
  const before = Array.from({ length: lineCount }, (_, index) => 'Before ' + index).join('\n');
  const after = Array.from({ length: lineCount }, (_, index) => 'After ' + index).join('\n');

  const diff = buildMarkdownDiffPreview({
    currentContent: before,
    proposedContent: after
  });

  assert.equal(diff.ok, false);
  assert.equal(diff.code, 'diff_too_complex');
});

test('review basket blocks updates when a safe diff preview cannot be produced', () => {
  const lineCount = Math.floor(DIFF_LIMITS.maxEditDistance / 2) + 100;
  const basket = createReviewBasketState();
  const item = basket.addProposal({
    type: 'update_note',
    title: 'Large rewrite',
    targetPath: '03_Knowledge/Large.md',
    currentContent: Array.from({ length: lineCount }, (_, index) => 'Before ' + index).join('\n'),
    proposedContent: Array.from({ length: lineCount }, (_, index) => 'After ' + index).join('\n')
  });

  assert.equal(item.diffPreview.ok, false);
  assert.equal(item.executable, false);
  assert.equal(item.selected, false);
  assert.equal(item.diffUnavailable, true);
  assert.equal(basket.getSelectedOpenItems().length, 0);
});

test('multi-line YAML tag changes remain complete in the review diff', () => {
  const diff = buildMarkdownDiffPreview({
    currentContent: [
      '---',
      'tags:',
      '  - yaml-test',
      'status: active',
      '---',
      '# Note'
    ].join('\n'),
    proposedContent: [
      '---',
      'tags:',
      '  - marvel',
      '  - iron-man',
      '  - tony-stark',
      'status: active',
      '---',
      '# Note'
    ].join('\n')
  });

  const changedLines = diff.hunks.flatMap((hunk) => hunk.lines.map((line) => line.text));
  assert.equal(diff.ok, true);
  assert.equal(diff.additions, 3);
  assert.equal(diff.deletions, 1);
  assert.equal(changedLines.includes('  - marvel'), true);
  assert.equal(changedLines.includes('  - iron-man'), true);
  assert.equal(changedLines.includes('  - tony-stark'), true);
  assert.equal(changedLines.includes('  - yaml-test'), true);
});

test('frontmatter changes include the complete YAML block for review', () => {
  const diff = buildMarkdownDiffPreview({
    currentContent: [
      '---',
      'categories: Places',
      'type: Landmarks',
      'rating: 5',
      'address: Av. Gustave Eiffel',
      'coordinates: 48.85837, 2.294481',
      'architect: Gustave Eiffel',
      'color: red',
      'icon: landmark',
      'tags:',
      '  - tower',
      '---',
      '# Eiffel Tower'
    ].join('\n'),
    proposedContent: [
      '---',
      'categories: Places',
      'type: Landmarks',
      'rating: 5',
      'address: Av. Gustave Eiffel',
      'coordinates: 48.85837, 2.294481',
      'architect: Gustave Eiffel',
      'color: red',
      'icon: landmark',
      'tags:',
      '  - eiffel',
      '---',
      '# Eiffel Tower'
    ].join('\n')
  });

  const lines = diff.hunks.flatMap((hunk) => hunk.lines.map((line) => line.text));
  assert.equal(lines.includes('categories: Places'), true);
  assert.equal(lines.includes('type: Landmarks'), true);
  assert.equal(lines.includes('rating: 5'), true);
  assert.equal(lines.includes('address: Av. Gustave Eiffel'), true);
  assert.equal(lines.includes('coordinates: 48.85837, 2.294481'), true);
  assert.equal(lines.includes('architect: Gustave Eiffel'), true);
  assert.equal(lines.includes('color: red'), true);
  assert.equal(lines.includes('icon: landmark'), true);
});

test('body changes do not show isolated tail lines from untouched YAML frontmatter', () => {
  const currentContent = [
    '---',
    'categories: Places',
    'type: Landmarks',
    'rating: 5',
    'address: Av. Gustave Eiffel',
    'coordinates: 48.85837, 2.294481',
    'architect: Gustave Eiffel',
    'color: red',
    'icon: landmark',
    '---',
    '# Eiffel Tower',
    '',
    'An iron landmark.'
  ].join('\n');
  const diff = buildMarkdownDiffPreview({
    currentContent,
    proposedContent: currentContent.replace('# Eiffel Tower', '# Eiffel Tower Landmark')
  });

  const lines = diff.hunks.flatMap((hunk) => hunk.lines.map((line) => line.text));
  assert.equal(lines.includes('icon: landmark'), false);
  assert.equal(lines.includes('# Eiffel Tower'), true);
  assert.equal(lines.includes('# Eiffel Tower Landmark'), true);
});
