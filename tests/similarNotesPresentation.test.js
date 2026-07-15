'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  classifySimilarScore,
  formatSimilarNotesSummary,
  normalizeSimilarNotesCandidates,
  formatScope
} = require('../src/renderer/selectionActions/similarNotesPresentation');

test('classifySimilarScore labels embedding scores for user-facing confidence', () => {
  assert.deepEqual(classifySimilarScore(92), { label: 'strong', className: 'is-strong' });
  assert.deepEqual(classifySimilarScore(84), { label: 'medium', className: 'is-medium' });
  assert.deepEqual(classifySimilarScore(71), { label: 'weak', className: 'is-weak' });
  assert.deepEqual(classifySimilarScore(33), { label: 'noisy', className: 'is-noisy' });
});

test('formatSimilarNotesSummary stays compact and warns for low-content targets', () => {
  const text = formatSimilarNotesSummary('00_Inbox/01_TODO_TEST.md', {
    ok: true,
    mode: 'content',
    minimumScorePercent: 30,
    candidates: [
      { path: 'A.md', scorePercent: 62 },
      { path: 'B.md', scorePercent: 41 }
    ]
  }, '# TODO\n\n- [ ]');

  assert.match(text, /Similar notes for: 00_Inbox\/01_TODO_TEST\.md/);
  assert.match(text, /2 weak\/noisy matches found/);
  assert.match(text, /Low content target/);
  assert.doesNotMatch(text, /A\.md/);
});

test('normalizeSimilarNotesCandidates prepares compact panel entries', () => {
  const entries = normalizeSimilarNotesCandidates([
    { path: 'A.md', scorePercent: 92, contentScorePercent: 95, metadataScorePercent: 10, relationship: 'exact_duplicate', relationshipLabel: 'Exact duplicate' },
    { path: 'B.md', scorePercent: 71, contentScorePercent: 71, metadataScorePercent: null }
  ]);

  assert.equal(entries[0].scoreLabel, 'strong');
  assert.equal(entries[0].scoreClassName, 'is-strong');
  assert.equal(entries[0].relationshipLabel, 'Exact duplicate');
  assert.equal(entries[1].scoreLabel, 'weak');
  assert.equal(entries[1].metadataScoreText, 'metadata n/a');
});

test('similar notes presentation exposes calibrated relevance reasons and scope labels', () => {
  const entries = normalizeSimilarNotesCandidates([
    { path: 'AI Core/Rules.md', scorePercent: 72, reasons: ['Same vault role', 'Related title'] }
  ]);

  assert.equal(entries[0].reasonText, 'Same vault role · Related title');
  assert.equal(formatScope('same_role'), 'Relevant area');
  assert.equal(formatScope('whole_vault'), 'Whole vault');
});
