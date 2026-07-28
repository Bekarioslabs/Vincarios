(function() {
  'use strict';

  const DEFAULT_PAYLOAD_LIMITS = Object.freeze({
    maxCreateNoteChars: 200000,
    maxUpdateNoteChars: 300000,
    maxProviderMessageChars: 120000
  });

  function normalizePayloadLimits(options) {
    options = options || {};
    return Object.freeze({
      maxCreateNoteChars: positiveIntegerOrDefault(options.maxCreateNoteChars, DEFAULT_PAYLOAD_LIMITS.maxCreateNoteChars),
      maxUpdateNoteChars: positiveIntegerOrDefault(options.maxUpdateNoteChars, DEFAULT_PAYLOAD_LIMITS.maxUpdateNoteChars),
      maxProviderMessageChars: positiveIntegerOrDefault(options.maxProviderMessageChars, DEFAULT_PAYLOAD_LIMITS.maxProviderMessageChars)
    });
  }

  function validateTextPayload(value, options) {
    options = options || {};
    const label = String(options.label || 'Payload');
    const maxChars = positiveIntegerOrDefault(options.maxChars, DEFAULT_PAYLOAD_LIMITS.maxProviderMessageChars);
    const chars = countChars(value);
    if (chars <= maxChars) return { ok: true, chars, maxChars };
    return {
      ok: false,
      code: 'payload_too_large',
      message: label + ' is too large (' + chars + '/' + maxChars + ' chars).',
      chars,
      maxChars
    };
  }

  function validateCreateNotePayload(content, options) {
    const limits = normalizePayloadLimits(options);
    return validateTextPayload(content, {
      label: 'Create note content',
      maxChars: limits.maxCreateNoteChars
    });
  }

  function validateUpdateNotePayload(content, options) {
    const limits = normalizePayloadLimits(options);
    return validateTextPayload(content, {
      label: 'Update note content',
      maxChars: limits.maxUpdateNoteChars
    });
  }

  function validateProviderMessagesPayload(messages, options) {
    const limits = normalizePayloadLimits(options);
    const chars = countProviderMessageChars(messages);
    if (chars <= limits.maxProviderMessageChars) {
      return { ok: true, chars, maxChars: limits.maxProviderMessageChars };
    }
    return {
      ok: false,
      code: 'payload_too_large',
      message: 'Provider message payload is too large (' + chars + '/' + limits.maxProviderMessageChars + ' chars).',
      chars,
      maxChars: limits.maxProviderMessageChars
    };
  }

  function countProviderMessageChars(messages) {
    if (!Array.isArray(messages)) return 0;
    return messages.reduce((total, message) => total + countChars(message && message.content), 0);
  }

  function countChars(value) {
    return String(value == null ? '' : value).length;
  }

  function positiveIntegerOrDefault(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
  }

  const api = {
    DEFAULT_PAYLOAD_LIMITS,
    normalizePayloadLimits,
    validateTextPayload,
    validateCreateNotePayload,
    validateUpdateNotePayload,
    validateProviderMessagesPayload,
    countProviderMessageChars
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosPayloadLimits = Object.freeze(api);
})();
