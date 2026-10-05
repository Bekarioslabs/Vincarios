(function() {
  'use strict';

  const KNOWN_MESSAGES = Object.freeze({
    provider_unavailable: 'Local provider is unavailable. Start it, then check the active provider in Settings.',
    provider_request_unavailable: 'Local provider is unavailable. Start it, then check the active provider in Settings.',
    provider_timed_out: 'Local provider did not respond in time. Check the active model and provider in Settings.',
    provider_no_model: 'No model is available from the active provider. Load a model, then check Settings.',
    metadata_index_unavailable: 'Vault Index is not ready. Open Settings > Embeddings, then refresh enabled indexes.',
    full_text_not_enabled: 'Full-text Search is disabled for this vault. Enable it in Settings > Embeddings.',
    file_not_found: 'This file no longer exists in the vault. Refresh Files or select another file.',
    vault_not_found: 'The vault folder is no longer available. Open a vault.'
  });

  function formatUserFeedback(result, fallback) {
    const code = String(result && result.code || '').trim();
    if (code && KNOWN_MESSAGES[code]) return KNOWN_MESSAGES[code];
    return String(
      result && (result.message || result.error)
      || fallback
      || 'Something went wrong.'
    );
  }

  function getUserFeedbackTone(result) {
    const code = String(result && result.code || '').trim();
    return code && KNOWN_MESSAGES[code] ? 'error' : 'neutral';
  }

  const api = Object.freeze({ formatUserFeedback, getUserFeedbackTone });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosUserFeedbackMessages = api;
})();
