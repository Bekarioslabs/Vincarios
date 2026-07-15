'use strict';

const POSSIBLE_DUPLICATE_MINIMUM_PERCENT = 75;
const POSSIBLE_DUPLICATE_TITLE_OVERLAP = 0.8;

function classifyCandidateRelationship(input) {
  const targetHash = normalizeHash(input && input.targetRecord && input.targetRecord.hash);
  const candidateHash = normalizeHash(input && input.candidateRecord && input.candidateRecord.hash);
  const relevance = input && input.relevance ? input.relevance : {};
  const scorePercent = normalizePercent(relevance.scorePercent);
  const titleScore = normalizeScore(relevance.diagnostics && relevance.diagnostics.titleScore);

  if (targetHash && targetHash === candidateHash) {
    return {
      relationship: 'exact_duplicate',
      label: 'Exact duplicate',
      scorePercent: 100,
      reason: 'Identical indexed content'
    };
  }

  if (scorePercent >= POSSIBLE_DUPLICATE_MINIMUM_PERCENT && titleScore >= POSSIBLE_DUPLICATE_TITLE_OVERLAP) {
    return {
      relationship: 'possible_duplicate',
      label: 'Possible duplicate',
      scorePercent,
      reason: 'Similar title and indexed content'
    };
  }

  return {
    relationship: 'related_note',
    label: 'Related note',
    scorePercent,
    reason: ''
  };
}

function normalizeHash(value) {
  return String(value || '').trim();
}

function normalizePercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function normalizeScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

module.exports = {
  POSSIBLE_DUPLICATE_MINIMUM_PERCENT,
  POSSIBLE_DUPLICATE_TITLE_OVERLAP,
  classifyCandidateRelationship
};
