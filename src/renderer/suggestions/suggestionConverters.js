(function() {
  'use strict';

  const CONVERTIBLE_KINDS = Object.freeze(['metadata_candidate']);

  function isConvertibleSuggestion(item) {
    return CONVERTIBLE_KINDS.includes(normalizeKind(item && item.kind)) && validateSuggestionData(item).ok;
  }

  function convertSuggestionToReviewProposal(item) {
    const validation = validateSuggestionData(item);
    if (!validation.ok) return validation;
    return {
      ok: true,
      proposal: {
        type: 'update_note',
        category: 'tags/properties',
        title: 'Update metadata: ' + baseName(validation.targetPath),
        targetPath: validation.targetPath,
        currentContent: validation.currentContent,
        proposedContent: validation.proposedContent,
        updateMode: 'whole_note',
        reason: validation.reason || 'Apply reviewed metadata suggestion.',
        risk: 'medium'
      }
    };
  }

  function getConvertibleCheckedSuggestions(snapshot) {
    const checked = getCheckedSuggestions(snapshot);
    const convertible = checked.filter(isConvertibleSuggestion);
    return {
      checked,
      convertible,
      canConvertAll: checked.length > 0 && checked.length === convertible.length
    };
  }

  function buildSuggestionDiffPreview(item) {
    const validation = validateSuggestionData(item);
    if (!validation.ok) return validation;
    return getDiffPreviewApi().buildMarkdownDiffPreview({
      currentContent: validation.currentContent,
      proposedContent: validation.proposedContent
    });
  }

  function getCheckedSuggestions(snapshot) {
    const groups = snapshot && Array.isArray(snapshot.groups) ? snapshot.groups : [];
    return groups.reduce((items, group) => {
      const groupItems = group && Array.isArray(group.items) ? group.items : [];
      return items.concat(groupItems.filter((item) => item && item.checked === true && item.dismissed !== true));
    }, []);
  }

  function validateSuggestionData(item) {
    if (normalizeKind(item && item.kind) !== 'metadata_candidate') {
      return fail('unsupported_kind', 'Only metadata candidates can be converted in this step.');
    }
    const data = item && item.data ? item.data : {};
    const targetPath = normalizePath(data.targetPath || item.path);
    const currentContent = String(data.currentContent || '');
    const proposedContent = String(data.proposedContent || '');
    if (!targetPath) return fail('missing_target', 'Suggestion has no target path.');
    if (!currentContent || !proposedContent) return fail('missing_content', 'Suggestion needs current and proposed Markdown content.');
    return {
      ok: true,
      targetPath,
      currentContent,
      proposedContent,
      reason: String(data.reason || item.detail || '')
    };
  }

  function normalizeKind(kind) {
    return String(kind || '').trim().toLowerCase();
  }

  function normalizePath(path) {
    return String(path || '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
  }

  function baseName(path) {
    const parts = normalizePath(path).split('/').filter(Boolean);
    return parts.length ? parts[parts.length - 1] : 'Markdown note';
  }

  function fail(code, message) {
    return { ok: false, code, message };
  }

  function getDiffPreviewApi() {
    if (typeof window !== 'undefined' && window.ZeusDiffPreview) return window.ZeusDiffPreview;
    if (typeof require === 'function') {
      try {
        return require('../../shared/actions/diffPreview');
      } catch (error) {
        // Fall through to the explicit error below.
      }
    }
    throw new Error('Diff preview API unavailable.');
  }

  const api = {
    isConvertibleSuggestion,
    convertSuggestionToReviewProposal,
    getConvertibleCheckedSuggestions,
    buildSuggestionDiffPreview
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusSuggestionConverters = Object.freeze(api);
})();
