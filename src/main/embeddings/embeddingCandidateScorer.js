'use strict';

const SEMANTIC_WEIGHT = 0.70;
const TITLE_WEIGHT = 0.18;
const PATH_WEIGHT = 0.12;
const CROSS_ROLE_TITLE_EVIDENCE = 0.20;

function scoreCandidate(input) {
  const targetPath = normalizePath(input && input.targetRecord && input.targetRecord.path);
  const candidatePath = normalizePath(input && input.candidateRecord && input.candidateRecord.path);
  const semanticScore = clampScore(input && input.embeddingScore);
  const titleScore = tokenOverlap(titleTokens(targetPath), titleTokens(candidatePath));
  const pathScore = pathAffinity(targetPath, candidatePath, input && input.targetRole, input && input.candidateRole);
  const sameRole = !!input && !!input.targetRole && input.targetRole === input.candidateRole;
  const crossRole = !!input && !!input.targetRole && !!input.candidateRole && !sameRole;
  const accepted = !crossRole || titleScore >= CROSS_ROLE_TITLE_EVIDENCE || pathScore > 0;
  const score = clampScore((semanticScore * SEMANTIC_WEIGHT) + (titleScore * TITLE_WEIGHT) + (pathScore * PATH_WEIGHT));
  const reasons = [];
  if (sameRole) reasons.push('Same vault role');
  if (titleScore > 0) reasons.push('Related title');
  if (pathScore >= 0.25) reasons.push('Nearby project path');

  return {
    accepted,
    score,
    scorePercent: Math.round(score * 100),
    reasons,
    diagnostics: {
      semanticScore,
      titleScore,
      pathScore,
      sameRole,
      crossRole
    }
  };
}

function titleTokens(relativePath) {
  const fileName = normalizePath(relativePath).split('/').pop() || '';
  const name = fileName.replace(/\.md$/i, '');
  return new Set((name.match(/[\p{L}\p{N}]+/gu) || [])
    .map((token) => token.toLocaleLowerCase())
    .filter((token) => token.length >= 3 && !/^\d+$/.test(token)));
}

function tokenOverlap(left, right) {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  left.forEach((token) => { if (right.has(token)) intersection += 1; });
  return intersection / new Set([...left, ...right]).size;
}

function pathAffinity(targetPath, candidatePath, targetRole, candidateRole) {
  if (!targetRole || targetRole !== candidateRole) return 0;
  const targetDirectories = normalizePath(targetPath).split('/').slice(0, -1);
  const candidateDirectories = normalizePath(candidatePath).split('/').slice(0, -1);
  const shared = sharedPrefixLength(targetDirectories, candidateDirectories);
  const meaningfulShared = Math.max(0, shared - 1);
  const depth = Math.min(Math.max(0, targetDirectories.length - 1), Math.max(0, candidateDirectories.length - 1));
  if (!meaningfulShared || !depth) return 0;
  return clampScore(meaningfulShared / depth);
}

function sharedPrefixLength(left, right) {
  const limit = Math.min(left.length, right.length);
  let count = 0;
  while (count < limit && left[count].toLocaleLowerCase() === right[count].toLocaleLowerCase()) count += 1;
  return count;
}

function clampScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

function normalizePath(value) {
  return String(value || '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
}

module.exports = {
  CROSS_ROLE_TITLE_EVIDENCE,
  PATH_WEIGHT,
  SEMANTIC_WEIGHT,
  TITLE_WEIGHT,
  pathAffinity,
  scoreCandidate,
  titleTokens,
  tokenOverlap
};