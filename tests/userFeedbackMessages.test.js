'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { formatUserFeedback, getUserFeedbackTone } = require('../src/renderer/feedback/userFeedbackMessages');

test('formats known provider failures as one actionable local-provider message', () => {
  assert.equal(
    formatUserFeedback({ ok: false, code: 'provider_unavailable', error: 'Provider unavailable.' }),
    'Local provider is unavailable. Start it, then check the active provider in Settings.'
  );
  assert.equal(
    formatUserFeedback({ ok: false, code: 'provider_request_unavailable' }),
    'Local provider is unavailable. Start it, then check the active provider in Settings.'
  );
  assert.equal(
    formatUserFeedback({ ok: false, code: 'provider_timed_out' }),
    'Local provider did not respond in time. Check the active model and provider in Settings.'
  );
});

test('formats index and local file failures with their relevant next step', () => {
  assert.equal(
    formatUserFeedback({ ok: false, code: 'metadata_index_unavailable' }),
    'Vault Index is not ready. Open Settings > Embeddings, then refresh enabled indexes.'
  );
  assert.equal(
    formatUserFeedback({ ok: false, code: 'full_text_not_enabled' }),
    'Full-text Search is disabled for this vault. Enable it in Settings > Embeddings.'
  );
  assert.equal(
    formatUserFeedback({ ok: false, code: 'file_not_found' }),
    'This file no longer exists in the vault. Refresh Files or select another file.'
  );
  assert.equal(
    formatUserFeedback({ ok: false, code: 'vault_not_found' }),
    'The vault folder is no longer available. Open a vault.'
  );
});

test('preserves unknown and permission messages for diagnostics and existing shared permission copy', () => {
  assert.equal(
    formatUserFeedback({ ok: false, code: 'read_required', message: 'Please enable R for this file: 00_Inbox/Note.md' }),
    'Please enable R for this file: 00_Inbox/Note.md'
  );
  assert.equal(
    formatUserFeedback({ ok: false, code: 'unexpected', error: 'Specific service detail.' }, 'Fallback.'),
    'Specific service detail.'
  );
});

test('exposes a semantic error tone for known blocking feedback while leaving neutral guidance quiet', () => {
  assert.equal(getUserFeedbackTone({ ok: false, code: 'metadata_index_unavailable' }), 'error');
  assert.equal(getUserFeedbackTone({ ok: false, code: 'file_not_found' }), 'error');
  assert.equal(getUserFeedbackTone({ ok: false, code: 'unexpected' }), 'neutral');
});
