'use strict';

const INDEX_VERSION = 1;
const INDEX_STORAGE = 'vault-vitruvios-index';

function createEmptyEmbeddingIndex(options) {
  options = options || {};
  return {
    version: INDEX_VERSION,
    storage: INDEX_STORAGE,
    model: {
      id: normalizeString(options.modelId),
      dimensions: normalizePositiveInteger(options.dimensions, 0)
    },
    documents: {}
  };
}

function createIndexedDocumentRecord(input) {
  input = input || {};
  return {
    path: normalizePath(input.path),
    hash: normalizeString(input.hash),
    mtimeMs: normalizePositiveNumber(input.mtimeMs, 0),
    chunks: normalizeChunks(input.chunks),
    vectors: normalizeVectors(input.vectors),
    bodyChunks: normalizeChunks(input.bodyChunks),
    bodyVectors: normalizeVectors(input.bodyVectors),
    frontmatterChunks: normalizeChunks(input.frontmatterChunks),
    frontmatterVectors: normalizeVectors(input.frontmatterVectors)
  };
}

function shouldReindexDocument(existingRecord, current) {
  const record = existingRecord || null;
  const state = current || {};
  if (!record) return true;
  if (state.modelChanged === true) return true;
  if (normalizeString(record.hash) !== normalizeString(state.hash)) return true;
  if (normalizePositiveNumber(record.mtimeMs, 0) !== normalizePositiveNumber(state.mtimeMs, 0)) return true;
  return false;
}

function normalizeChunks(chunks) {
  if (!Array.isArray(chunks)) return [];
  return chunks.map((chunk) => ({
    id: normalizeString(chunk && chunk.id),
    start: normalizePositiveInteger(chunk && chunk.start, 0),
    end: normalizePositiveInteger(chunk && chunk.end, 0),
    text: normalizeString(chunk && chunk.text)
  }));
}

function normalizeVectors(vectors) {
  if (!Array.isArray(vectors)) return [];
  return vectors.map((vector) => {
    if (!Array.isArray(vector)) return [];
    return vector.map((value) => Number.isFinite(Number(value)) ? Number(value) : 0);
  });
}

function normalizePath(value) {
  return normalizeString(value).replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function normalizeString(value) {
  return String(value || '').trim();
}

function normalizePositiveInteger(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return fallback;
  return Math.floor(number);
}

function normalizePositiveNumber(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return fallback;
  return number;
}

module.exports = {
  INDEX_VERSION,
  INDEX_STORAGE,
  createEmptyEmbeddingIndex,
  createIndexedDocumentRecord,
  shouldReindexDocument
};
