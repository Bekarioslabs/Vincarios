'use strict';

const crypto = require('node:crypto');
const { createEmbeddingIndexStore } = require('./embeddingIndexStore');
const { createEmbeddingMarkdownSource } = require('./embeddingMarkdownSource');
const { createEmbeddingRuntimeService } = require('./embeddingRuntimeService');
const { DEFAULT_EMBEDDING_MODEL } = require('./embeddingModelStore');
const {
  createIndexedDocumentRecord,
  shouldReindexDocument
} = require('../../shared/embeddings/embeddingIndexSchema');

const DEFAULT_CHUNK_SIZE_CHARS = 1200;
const DEFAULT_CHUNK_OVERLAP_CHARS = 120;

function createEmbeddingIndexer(options) {
  options = options || {};
  const source = options.source || createEmbeddingMarkdownSource(options);
  const indexStore = options.indexStore || createEmbeddingIndexStore(options);
  const runtime = options.runtime || createEmbeddingRuntimeService(options);
  const modelId = normalizeString(options.modelId) || DEFAULT_EMBEDDING_MODEL.id;
  const dimensions = normalizePositiveInteger(options.dimensions, DEFAULT_EMBEDDING_MODEL.dimensions);
  const chunkSizeChars = normalizePositiveInteger(options.chunkSizeChars, DEFAULT_CHUNK_SIZE_CHARS);
  const chunkOverlapChars = Math.min(
    normalizePositiveInteger(options.chunkOverlapChars, DEFAULT_CHUNK_OVERLAP_CHARS),
    Math.max(0, chunkSizeChars - 1)
  );

  function setRoot(vaultRoot) {
    const sourceResult = typeof source.setRoot === 'function' ? source.setRoot(vaultRoot) : ok({});
    if (!sourceResult.ok) return sourceResult;
    const storeResult = typeof indexStore.setRoot === 'function' ? indexStore.setRoot(vaultRoot) : ok({});
    if (!storeResult.ok) return storeResult;
    return ok({ root: storeResult.root || sourceResult.root || '' });
  }

  async function rebuildIndex() {
    const listed = source.listMarkdownDocuments();
    if (!listed.ok) return listed;

    const loaded = indexStore.loadDocuments();
    if (!loaded.ok) return loaded;

    const manifest = indexStore.saveManifest({ modelId, dimensions });
    if (!manifest.ok) return manifest;

    const previousDocuments = loaded.documents || {};
    const nextDocuments = {};
    let indexedDocuments = 0;
    let skippedDocuments = 0;
    let chunkCount = 0;

    for (const document of listed.documents || []) {
      const state = getDocumentState(document);
      const existing = previousDocuments[state.path];
      if (!shouldReindexDocument(existing, { hash: state.hash, mtimeMs: state.mtimeMs, modelChanged: false })) {
        nextDocuments[state.path] = existing;
        skippedDocuments += 1;
        chunkCount += existing.chunks.length;
        continue;
      }

      const chunks = chunkText(state.path, state.content, { chunkSizeChars, chunkOverlapChars });
      const vectors = [];
      for (const chunk of chunks) {
        const embedded = await runtime.embedText(chunk.text);
        if (!embedded.ok) return embedded;
        vectors.push(embedded.vector);
      }
      nextDocuments[state.path] = createIndexedDocumentRecord({
        path: state.path,
        hash: state.hash,
        mtimeMs: state.mtimeMs,
        chunks,
        vectors
      });
      indexedDocuments += 1;
      chunkCount += chunks.length;
    }

    const saved = indexStore.saveDocuments(nextDocuments);
    if (!saved.ok) return saved;

    return ok({
      totalDocuments: (listed.documents || []).length,
      indexedDocuments,
      skippedDocuments,
      chunkCount
    });
  }

  return Object.freeze({
    setRoot,
    rebuildIndex
  });
}

function getDocumentState(document) {
  const content = String(document && document.content || '');
  return {
    path: normalizePath(document && document.path),
    content,
    hash: normalizeString(document && document.hash) || hashText(content),
    mtimeMs: Number(document && document.mtimeMs) || 0
  };
}

function chunkText(documentPath, text, options) {
  const size = options.chunkSizeChars;
  const overlap = options.chunkOverlapChars;
  const normalizedText = String(text || '').trim();
  if (!normalizedText) {
    return [{ id: documentPath + '#0', start: 0, end: 0, text: documentPath }];
  }

  const chunks = [];
  let start = 0;
  while (start < normalizedText.length) {
    const end = Math.min(normalizedText.length, start + size);
    chunks.push({
      id: documentPath + '#' + chunks.length,
      start,
      end,
      text: normalizedText.slice(start, end)
    });
    if (end >= normalizedText.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

function hashText(text) {
  return crypto.createHash('sha256').update(String(text || ''), 'utf8').digest('hex');
}

function normalizePath(value) {
  return normalizeString(value).replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function normalizeString(value) {
  return String(value || '').trim();
}

function normalizePositiveInteger(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.floor(number);
}

function ok(value) {
  return Object.assign({ ok: true }, value);
}

module.exports = {
  DEFAULT_CHUNK_SIZE_CHARS,
  DEFAULT_CHUNK_OVERLAP_CHARS,
  createEmbeddingIndexer,
  chunkText,
  hashText
};
