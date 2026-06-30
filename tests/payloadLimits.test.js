'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_PAYLOAD_LIMITS,
  normalizePayloadLimits,
  validateTextPayload,
  validateProviderMessagesPayload
} = require('../src/shared/security/payloadLimits');

test('payload limits expose conservative defaults for writes and provider requests', () => {
  assert.equal(DEFAULT_PAYLOAD_LIMITS.maxCreateNoteChars, 200000);
  assert.equal(DEFAULT_PAYLOAD_LIMITS.maxUpdateNoteChars, 300000);
  assert.equal(DEFAULT_PAYLOAD_LIMITS.maxProviderMessageChars, 120000);
});

test('payload limits reject oversized text payloads with a stable error code', () => {
  const result = validateTextPayload('abcd', {
    label: 'Create note content',
    maxChars: 3
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'payload_too_large');
  assert.equal(result.chars, 4);
  assert.equal(result.maxChars, 3);
  assert.match(result.message, /Create note content/i);
});

test('payload limits reject oversized aggregate provider messages', () => {
  const result = validateProviderMessagesPayload([
    { role: 'system', content: 'abc' },
    { role: 'user', content: 'defg' }
  ], { maxProviderMessageChars: 6 });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'payload_too_large');
  assert.equal(result.chars, 7);
  assert.equal(result.maxChars, 6);
});

test('payload limits normalize invalid settings back to defaults', () => {
  const limits = normalizePayloadLimits({
    maxCreateNoteChars: -1,
    maxUpdateNoteChars: 42,
    maxProviderMessageChars: 'large'
  });

  assert.equal(limits.maxCreateNoteChars, DEFAULT_PAYLOAD_LIMITS.maxCreateNoteChars);
  assert.equal(limits.maxUpdateNoteChars, 42);
  assert.equal(limits.maxProviderMessageChars, DEFAULT_PAYLOAD_LIMITS.maxProviderMessageChars);
});
