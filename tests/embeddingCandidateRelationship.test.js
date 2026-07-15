'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyCandidateRelationship } = require('../src/main/embeddings/embeddingCandidateRelationship');

test('classifies matching indexed hashes as exact duplicates', () => {
  const result = classifyCandidateRelationship({
    targetRecord: { path: 'Knowledge/One.md', hash: 'same-hash' },
    candidateRecord: { path: 'Knowledge/Copy.md', hash: 'same-hash' },
    relevance: { scorePercent: 82, diagnostics: { titleScore: 0 } }
  });

  assert.deepEqual(result, {
    relationship: 'exact_duplicate',
    label: 'Exact duplicate',
    scorePercent: 100,
    reason: 'Identical indexed content'
  });
});

test('classifies a high-relevance matching title as a possible duplicate', () => {
  const result = classifyCandidateRelationship({
    targetRecord: { path: 'Knowledge/One/Markdown_TEST.md', hash: 'first' },
    candidateRecord: { path: 'Knowledge/Two/Markdown_TEST.md', hash: 'second' },
    relevance: { scorePercent: 80, diagnostics: { titleScore: 1 } }
  });

  assert.equal(result.relationship, 'possible_duplicate');
  assert.equal(result.label, 'Possible duplicate');
  assert.equal(result.scorePercent, 80);
});

test('keeps ordinary similarity candidates as related notes', () => {
  const result = classifyCandidateRelationship({
    targetRecord: { path: 'Knowledge/Rules.md', hash: 'first' },
    candidateRecord: { path: 'Knowledge/Guide.md', hash: 'second' },
    relevance: { scorePercent: 86, diagnostics: { titleScore: 0.25 } }
  });

  assert.deepEqual(result, {
    relationship: 'related_note',
    label: 'Related note',
    scorePercent: 86,
    reason: ''
  });
});
