'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreCandidate } = require('../src/main/embeddings/embeddingCandidateScorer');

function record(path) {
  return { path };
}

test('relevance score reduces an unsupported semantic-only match below its raw embedding score', () => {
  const result = scoreCandidate({
    targetRecord: record('AI Core/Agent Bootstrap.md'),
    candidateRecord: record('AI Core/Starlu Comfy UI Nodes.md'),
    embeddingScore: 0.87,
    targetRole: 'brain',
    candidateRole: 'brain'
  });

  assert.equal(result.accepted, true);
  assert.equal(result.scorePercent < 87, true);
  assert.equal(result.scorePercent < 65, true);
  assert.deepEqual(result.reasons, ['Same vault role']);
});

test('relevance score boosts a nearby project candidate above a generic semantic-only candidate', () => {
  const nearby = scoreCandidate({
    targetRecord: record('Projects/Atlas/Characters/Hero.md'),
    candidateRecord: record('Projects/Atlas/Scenes/Arrival.md'),
    embeddingScore: 0.85,
    targetRole: 'projects',
    candidateRole: 'projects'
  });
  const generic = scoreCandidate({
    targetRecord: record('Projects/Atlas/Characters/Hero.md'),
    candidateRecord: record('Projects/Elsewhere/Notes.md'),
    embeddingScore: 0.9,
    targetRole: 'projects',
    candidateRole: 'projects'
  });

  assert.equal(nearby.score > generic.score, true);
  assert.equal(nearby.reasons.includes('Nearby project path'), true);
});

test('whole-vault search rejects cross-role candidates without structural evidence', () => {
  const result = scoreCandidate({
    targetRecord: record('AI Core/Agent Bootstrap.md'),
    candidateRecord: record('Knowledge/Starlu Comfy UI Nodes.md'),
    embeddingScore: 0.99,
    targetRole: 'brain',
    candidateRole: 'knowledge'
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasons.includes('Related title'), false);
});

test('whole-vault search permits a cross-role candidate with a related title', () => {
  const result = scoreCandidate({
    targetRecord: record('AI Core/Agent Bootstrap.md'),
    candidateRecord: record('Knowledge/Agent Guide.md'),
    embeddingScore: 0.9,
    targetRole: 'brain',
    candidateRole: 'knowledge'
  });

  assert.equal(result.accepted, true);
  assert.equal(result.reasons.includes('Related title'), true);
});