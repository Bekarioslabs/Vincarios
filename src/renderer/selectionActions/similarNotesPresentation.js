(function() {
  'use strict';

  const LOW_CONTENT_CHARS = 100;

  function classifySimilarScore(scorePercent) {
    const score = Number(scorePercent);
    if (Number.isFinite(score) && score >= 90) return { label: 'strong', className: 'is-strong' };
    if (Number.isFinite(score) && score >= 80) return { label: 'medium', className: 'is-medium' };
    if (Number.isFinite(score) && score >= 60) return { label: 'weak', className: 'is-weak' };
    return { label: 'noisy', className: 'is-noisy' };
  }

  function formatSimilarNotesSummary(targetPath, result, targetContent) {
    if (!result || !result.ok) {
      return 'Similar notes unavailable for: ' + targetPath + '\n\n' + ((result && (result.message || result.code)) || 'Unknown error.');
    }

    const candidates = Array.isArray(result.candidates) ? result.candidates : [];
    if (!candidates.length) {
      return 'Similar notes for: ' + targetPath + '\n\nNo similar indexed Markdown notes found.';
    }

    const summary = summarizeCandidateStrength(candidates);
    const lines = [
      'Similar notes for: ' + targetPath,
      '',
      candidates.length + ' ' + summary + ' matches found.',
      'Mode: ' + (result.mode || 'mixed') + ' | Scope: ' + formatScope(result.scope) + ' | Minimum match: ' + normalizePercent(result.minimumScorePercent, 0) + '%'
    ];

    if (isLowContent(targetContent)) {
      lines.push('Low content target. Results may be noisy.');
    }

    lines.push('Details are shown in the Selection Actions panel.');
    return lines.join('\n');
  }

  function normalizeSimilarNotesCandidates(candidates) {
    return (Array.isArray(candidates) ? candidates : []).map((candidate) => {
      const score = normalizePercent(candidate && candidate.scorePercent, null);
      const contentScore = normalizePercent(candidate && candidate.contentScorePercent, null);
      const metadataScore = normalizePercent(candidate && candidate.metadataScorePercent, null);
      const classification = classifySimilarScore(score);
      return {
        path: String(candidate && candidate.path || ''),
        scorePercent: score,
        scoreText: formatPercent(score),
        scoreLabel: classification.label,
        scoreClassName: classification.className,
        relationship: String(candidate && candidate.relationship || 'related_note'),
        relationshipLabel: String(candidate && candidate.relationshipLabel || 'Related note'),
        contentScoreText: 'content ' + formatPercent(contentScore),
        metadataScoreText: 'metadata ' + formatPercent(metadataScore),
        reasonText: formatReasons(candidate && candidate.reasons)
      };
    });
  }

  function formatScope(value) {
    return value === 'whole_vault' ? 'Whole vault' : 'Relevant area';
  }

  function formatReasons(reasons) {
    const values = Array.isArray(reasons) ? reasons.map((reason) => String(reason || '').trim()).filter(Boolean) : [];
    return values.length ? values.join(' · ') : 'Semantic match';
  }
  function summarizeCandidateStrength(candidates) {
    const normalized = normalizeSimilarNotesCandidates(candidates);
    if (normalized.some((candidate) => candidate.scoreLabel === 'strong')) return 'strong';
    if (normalized.some((candidate) => candidate.scoreLabel === 'medium')) return 'medium';
    if (normalized.some((candidate) => candidate.scoreLabel === 'weak')) return 'weak/noisy';
    return 'noisy';
  }

  function isLowContent(value) {
    return String(value || '').trim().length < LOW_CONTENT_CHARS;
  }

  function formatPercent(value) {
    return Number.isFinite(value) ? value + '%' : 'n/a';
  }

  function normalizePercent(value, fallback) {
    if (value === null || value === undefined || value === '') return fallback;
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(0, Math.min(100, Math.round(number)));
  }

  const api = {
    LOW_CONTENT_CHARS,
    classifySimilarScore,
    formatSimilarNotesSummary,
    normalizeSimilarNotesCandidates,
    formatScope,
    formatReasons,
    isLowContent
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosSimilarNotesPresentation = Object.freeze(api);
})();
