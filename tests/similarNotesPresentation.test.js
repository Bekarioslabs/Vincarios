'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  classifySimilarScore,
  formatSimilarNotesSummary,
  normalizeSimilarNotesCandidates
} = require('../src/renderer/selectionActions/similarNotesPresentation');

test('classifySimilarScore labels embedding scores for user-facing confidence', () => {
  assert.deepEqual(classifySimilarScore(82), { label: 'strong', className: 'is-strong' });
  assert.deepEqual(classifySimilarScore(70), { label: 'medium', className: 'is-medium' });
  assert.deepEqual(classifySimilarScore(52), { label: 'weak', className: 'is-weak' });
  assert.deepEqual(classifySimilarScore(33), { label: 'noisy', className: 'is-noisy' });
});

test('formatSimilarNotesSummary stays compact and warns for low-content targets', () => {
  const text = formatSimilarNotesSummary('00_Inbox/01_TODO_TEST.md', {
    ok: true,
    mode: 'content',
    minimumScorePercent: 30,
    candidates: [
      { path: 'A.md', scorePercent: 52 },
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
    { path: 'A.md', scorePercent: 82, contentScorePercent: 85, metadataScorePercent: 10 },
    { path: 'B.md', scorePercent: 52, contentScorePercent: 52, metadataScorePercent: null }
  ]);

  assert.equal(entries[0].scoreLabel, 'strong');
  assert.equal(entries[0].scoreClassName, 'is-strong');
  assert.equal(entries[1].scoreLabel, 'weak');
  assert.equal(entries[1].metadataScoreText, 'metadata n/a');
});
