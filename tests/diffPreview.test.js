'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildMarkdownDiffPreview } = require('../src/shared/actions/diffPreview');

test('markdown diff preview reports inserted lines with stable line numbers', () => {
  const diff = buildMarkdownDiffPreview({
    currentContent: '# Note\n\nOld line',
    proposedContent: '# Note\n\nOld line\nNew line'
  });

  assert.equal(diff.ok, true);
  assert.equal(diff.changed, true);
  assert.equal(diff.additions, 1);
  assert.equal(diff.deletions, 0);
  assert.equal(diff.hunks.length, 1);
  assert.deepEqual(diff.hunks[0].lines.map((line) => line.type), ['context', 'context', 'context', 'add']);
  assert.equal(diff.hunks[0].lines[3].newNumber, 4);
  assert.equal(diff.summary, '+1 -0');
});

test('markdown diff preview reports no hunks for identical content', () => {
  const diff = buildMarkdownDiffPreview({
    currentContent: 'Same\nContent',
    proposedContent: 'Same\nContent'
  });

  assert.equal(diff.ok, true);
  assert.equal(diff.changed, false);
  assert.equal(diff.additions, 0);
  assert.equal(diff.deletions, 0);
  assert.deepEqual(diff.hunks, []);
  assert.equal(diff.summary, 'No changes');
});

test('markdown diff preview reports replacements as deletion plus addition', () => {
  const diff = buildMarkdownDiffPreview({
    currentContent: 'Alpha\nBeta\nGamma',
    proposedContent: 'Alpha\nBetter\nGamma'
  });

  assert.equal(diff.additions, 1);
  assert.equal(diff.deletions, 1);
  assert.equal(diff.hunks[0].lines.some((line) => line.type === 'remove' && line.text === 'Beta'), true);
  assert.equal(diff.hunks[0].lines.some((line) => line.type === 'add' && line.text === 'Better'), true);
});
