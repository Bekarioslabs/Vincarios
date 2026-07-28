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
