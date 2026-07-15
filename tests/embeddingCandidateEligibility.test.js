'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createEmbeddingCandidateEligibility } = require('../src/main/embeddings/embeddingCandidateEligibility');

const profile = {
  roles: {
    inbox: 'Incoming',
    projects: 'Creative Work',
    brain: 'AI Core'
  }
};

test('same-role scope uses configured Vault Profile paths rather than default folder names', () => {
  const eligibility = createEmbeddingCandidateEligibility();

  assert.equal(eligibility.isEligible({
    targetPath: 'AI Core/Rules.md',
    candidatePath: 'AI Core/Agent Bootstrap.md',
    profile,
    scope: 'same_role'
  }).eligible, true);

  assert.equal(eligibility.isEligible({
    targetPath: 'AI Core/Rules.md',
    candidatePath: 'Creative Work/Comfy UI Nodes.md',
    profile,
    scope: 'same_role'
  }).eligible, false);
});

test('same-role scope falls back to the selected top-level area when no role is assigned', () => {
  const eligibility = createEmbeddingCandidateEligibility();

  assert.equal(eligibility.isEligible({
    targetPath: 'Research/Models/A.md',
    candidatePath: 'Research/Notes/B.md',
    profile: { roles: {} },
    scope: 'same_role'
  }).eligible, true);

  assert.equal(eligibility.isEligible({
    targetPath: 'Research/Models/A.md',
    candidatePath: 'Archive/B.md',
    profile: { roles: {} },
    scope: 'same_role'
  }).eligible, false);
});

test('whole-vault scope permits candidates outside the target role', () => {
  const eligibility = createEmbeddingCandidateEligibility();
  const result = eligibility.isEligible({
    targetPath: 'AI Core/Rules.md',
    candidatePath: 'Creative Work/Comfy UI Nodes.md',
    profile,
    scope: 'whole_vault'
  });

  assert.equal(result.eligible, true);
  assert.equal(result.targetRole, 'brain');
  assert.equal(result.candidateRole, 'projects');
});