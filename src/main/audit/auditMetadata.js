'use strict';

const { createHash } = require('node:crypto');
const { ORIGIN_ACTIONS } = require('../../shared/metadata/generatedNoteMetadata');

const ORIGINS = new Set(Object.values(ORIGIN_ACTIONS).concat([
  'source_editor', 'ai_update', 'suggest_tags', 'rename', 'backup'
]));
const PROVIDERS = new Set(['lm-studio', 'ollama']);
const MAX_MODEL_ID_LENGTH = 160;

function normalizeAuditProvenance(input) {
  input = input && typeof input === 'object' ? input : {};
  const provider = PROVIDERS.has(input.provider) ? input.provider : null;
  const model = input.model;
  // IDs only: no URLs, local drive paths, free text, or control characters.
  const validModel = provider && typeof model === 'string' && model.length <= MAX_MODEL_ID_LENGTH
    && /^[a-z0-9][a-z0-9._:/@+-]*$/i.test(model) && !/^[a-z]:|:\/\//i.test(model);
  return {
    origin: ORIGINS.has(input.origin) ? input.origin : 'unknown',
    provider,
    model: validModel ? model : null
  };
}

function contentSnapshot(content) {
  if (content === null) return null;
  const bytes = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
  return { sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length };
}

function contentIntegrity(before, after) {
  return { before: contentSnapshot(before), after: contentSnapshot(after) };
}

module.exports = { normalizeAuditProvenance, contentIntegrity };
