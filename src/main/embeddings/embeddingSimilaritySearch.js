'use strict';

const { createEmbeddingIndexStore } = require('./embeddingIndexStore');
const { createEmbeddingCandidateEligibility, normalizeScope } = require('./embeddingCandidateEligibility');
const { scoreCandidate } = require('./embeddingCandidateScorer');
const { classifyCandidateRelationship } = require('./embeddingCandidateRelationship');

const DEFAULT_SIMILAR_LIMIT = 8;
const DEFAULT_MINIMUM_SCORE_PERCENT = 65;
const DEFAULT_SIMILAR_MODE = 'mixed';
const DEFAULT_CONTENT_WEIGHT = 80;
const DEFAULT_METADATA_WEIGHT = 20;

function createEmbeddingSimilaritySearch(options) {
  options = options || {};
  const indexStore = options.indexStore || createEmbeddingIndexStore(options);
  const settingsStore = options.settingsStore || null;
  const indexer = options.indexer || null;
  const getVaultProfile = typeof options.getVaultProfile === 'function' ? options.getVaultProfile : null;
  const candidateEligibility = options.candidateEligibility || createEmbeddingCandidateEligibility();

  function setRoot(vaultRoot) {
    const storeResult = typeof indexStore.setRoot === 'function'
      ? indexStore.setRoot(vaultRoot)
      : ok({ root: '' });
    if (!storeResult.ok) return storeResult;
    if (indexer && typeof indexer.setRoot === 'function') {
      const indexerResult = indexer.setRoot(vaultRoot);
      if (!indexerResult.ok) return indexerResult;
    }
    return storeResult;
  }

  async function findSimilarNotes(targetPath, options) {
    options = options || {};
    const target = normalizePath(targetPath);
    const searchOptions = normalizeSearchOptions(options, settingsStore);
    if (searchOptions.refreshIndex && indexer && typeof indexer.rebuildIndex === 'function') {
      const rebuilt = await indexer.rebuildIndex();
      if (!rebuilt.ok) return rebuilt;
    }
    return findSimilarNotesInIndex(target, searchOptions);
  }

  function findSimilarNotesInIndex(target, searchOptions) {
    const limit = searchOptions.limit;
    const loaded = indexStore.loadDocuments();
    if (!loaded.ok) return loaded;

    const documents = loaded.documents || {};
    const targetRecord = documents[target];
    if (!targetRecord) {
      return fail('embedding_target_not_indexed', 'Target note is not indexed.');
    }

    const targetVectors = getDocumentVectors(targetRecord);
    if (!targetVectors.content.length && !targetVectors.metadata.length) {
      return fail('embedding_target_has_no_vectors', 'Target note has no embedding vectors.');
    }

    const profile = resolveVaultProfile(getVaultProfile);
    const candidates = Object.values(documents)
      .filter((record) => record && normalizePath(record.path) && normalizePath(record.path) !== target)
      .map((record) => ({
        record,
        eligibility: candidateEligibility.isEligible({
          targetPath: target,
          candidatePath: record.path,
          profile,
          scope: searchOptions.scope
        })
      }))
      .filter((item) => item.eligibility.eligible)
      .map((item) => toCandidate(item.record, targetRecord, targetVectors, searchOptions, item.eligibility))
      .filter((candidate) => Number.isFinite(candidate.scorePercent) && candidate.scorePercent >= searchOptions.minimumScorePercent)
      .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path, 'en', { sensitivity: 'base', numeric: true }))
      .slice(0, limit);

    return ok({
      targetPath: target,
      totalCandidates: candidates.length,
      mode: searchOptions.mode,
      scope: searchOptions.scope,
      minimumScorePercent: searchOptions.minimumScorePercent,
      limit,
      candidates
    });
  }

  return Object.freeze({
    setRoot,
    findSimilarNotes
  });
}

function toCandidate(record, targetRecord, targetVectors, searchOptions, eligibility) {
  const vectors = getDocumentVectors(record);
  const contentScore = cosineSimilarity(targetVectors.content, vectors.content);
  const metadataScore = cosineSimilarity(targetVectors.metadata, vectors.metadata);
  const rawScore = combineScores(contentScore, metadataScore, searchOptions);
  const relevance = scoreCandidate({
    targetRecord,
    candidateRecord: record,
    embeddingScore: rawScore,
    targetRole: eligibility && eligibility.targetRole,
    candidateRole: eligibility && eligibility.candidateRole
  });
  const relationship = classifyCandidateRelationship({
    targetRecord,
    candidateRecord: record,
    relevance
  });
  const score = relationship.scorePercent / 100;
  const reasons = [relationship.reason].concat(relevance.reasons || []).filter(Boolean);
  return {
    kind: 'similar_note',
    path: normalizePath(record.path),
    accepted: relevance.accepted,
    score,
    scorePercent: relationship.scorePercent,
    relationship: relationship.relationship,
    relationshipLabel: relationship.label,
    contentScore,
    contentScorePercent: toPercent(contentScore),
    metadataScore,
    metadataScorePercent: toPercent(metadataScore),
    mode: searchOptions.mode,
    scope: searchOptions.scope,
    targetRole: eligibility && eligibility.targetRole || '',
    candidateRole: eligibility && eligibility.candidateRole || '',
    reasons,
    diagnostics: Object.assign({ rawScore, rawScorePercent: toPercent(rawScore) }, relevance.diagnostics),
    reason: 'Calibrated relevance from indexed Markdown vectors and deterministic structure.'
  };
}

function getDocumentVectors(record) {
  return {
    content: averageVectors(record && Array.isArray(record.bodyVectors) && record.bodyVectors.length ? record.bodyVectors : record && record.vectors),
    metadata: averageVectors(record && record.frontmatterVectors)
  };
}

function combineScores(contentScore, metadataScore, options) {
  if (options.mode === 'content') return contentScore;
  if (options.mode === 'metadata') return metadataScore;
  const parts = [];
  if (Number.isFinite(contentScore)) parts.push({ score: contentScore, weight: options.contentWeight });
  if (Number.isFinite(metadataScore)) parts.push({ score: metadataScore, weight: options.metadataWeight });
  const totalWeight = parts.reduce((sum, item) => sum + item.weight, 0);
  if (!totalWeight) return NaN;
  return parts.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight;
}

function normalizeSearchOptions(options, settingsStore) {
  const defaults = getSettingsDefaults(settingsStore);
  const input = options || {};
  const minimumScorePercent = normalizePercent(input.minimumScorePercent, defaults.minimumScorePercent);
  return {
    limit: normalizePositiveInteger(input.limit || input.maxResults, defaults.maxResults),
    minimumScorePercent,
    minimumScore: minimumScorePercent / 100,
    mode: normalizeChoice(input.mode, ['content', 'metadata', 'mixed'], defaults.mode),
    contentWeight: normalizePercent(input.contentWeight, defaults.contentWeight),
    metadataWeight: normalizePercent(input.metadataWeight, defaults.metadataWeight),
    scope: normalizeScope(input.scope),
    refreshIndex: input.refreshIndex === true || input.refreshIndex === 'true' || input.refreshIndex === 'on'
  };
}

function getSettingsDefaults(settingsStore) {
  const settings = settingsStore && typeof settingsStore.getSettings === 'function' ? settingsStore.getSettings() : null;
  const similarNotes = settings && settings.embeddings && settings.embeddings.similarNotes ? settings.embeddings.similarNotes : {};
  return {
    minimumScorePercent: normalizePercent(similarNotes.minimumScorePercent, DEFAULT_MINIMUM_SCORE_PERCENT),
    maxResults: normalizePositiveInteger(similarNotes.maxResults, DEFAULT_SIMILAR_LIMIT),
    mode: normalizeChoice(similarNotes.mode, ['content', 'metadata', 'mixed'], DEFAULT_SIMILAR_MODE),
    contentWeight: normalizePercent(similarNotes.contentWeight, DEFAULT_CONTENT_WEIGHT),
    metadataWeight: normalizePercent(similarNotes.metadataWeight, DEFAULT_METADATA_WEIGHT)
  };
}

function resolveVaultProfile(getVaultProfile) {
  if (!getVaultProfile) return { roles: {} };
  try {
    const result = getVaultProfile();
    if (result && result.ok && result.profile) return result.profile;
    if (result && result.profile) return result.profile;
  } catch (error) {}
  return { roles: {} };
}
function toPercent(score) {
  return Number.isFinite(score) ? Math.round(score * 100) : null;
}

function averageVectors(vectors) {
  const validVectors = Array.isArray(vectors)
    ? vectors.filter((vector) => Array.isArray(vector) && vector.length > 0)
    : [];
  if (!validVectors.length) return [];

  const dimensions = validVectors[0].length;
  const sums = new Array(dimensions).fill(0);
  let count = 0;
  for (const vector of validVectors) {
    if (vector.length !== dimensions) continue;
    for (let index = 0; index < dimensions; index += 1) {
      sums[index] += Number(vector[index]) || 0;
    }
    count += 1;
  }
  if (!count) return [];
  return sums.map((value) => value / count);
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || !a.length || a.length !== b.length) return NaN;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index += 1) {
    const av = Number(a[index]) || 0;
    const bv = Number(b[index]) || 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (!normA || !normB) return NaN;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function normalizePath(value) {
  return String(value || '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function normalizePositiveInteger(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.floor(number);
}

function normalizePercent(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100, Math.floor(number)));
}

function normalizeChoice(value, choices, fallback) {
  const item = String(value || '').trim();
  return choices.includes(item) ? item : fallback;
}

function ok(value) {
  return Object.assign({ ok: true }, value);
}

function fail(code, message) {
  return { ok: false, code, message };
}

module.exports = {
  DEFAULT_SIMILAR_LIMIT,
  DEFAULT_MINIMUM_SCORE_PERCENT,
  DEFAULT_SIMILAR_MODE,
  createEmbeddingSimilaritySearch,
  averageVectors,
  cosineSimilarity,
  normalizeSearchOptions
};
