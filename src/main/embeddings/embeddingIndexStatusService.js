'use strict';

const { createEmbeddingIndexStore } = require('./embeddingIndexStore');
const { createEmbeddingModelStore, DEFAULT_EMBEDDING_MODEL } = require('./embeddingModelStore');
const { INDEX_VERSION, createEmbeddingFingerprint, embeddingFingerprintsMatch } = require('../../shared/embeddings/embeddingIndexSchema');

function createEmbeddingIndexStatusService(options) {
  options = options || {};
  const indexStore = options.indexStore || createEmbeddingIndexStore(options);
  const modelStore = options.modelStore || createEmbeddingModelStore(options);
  const activeFingerprint = createEmbeddingFingerprint(options.activeFingerprint || {
    modelId: DEFAULT_EMBEDDING_MODEL.id,
    dimensions: DEFAULT_EMBEDDING_MODEL.dimensions,
    revision: DEFAULT_EMBEDDING_MODEL.sourceRevision,
    indexVersion: INDEX_VERSION
  });

  function setRoot(vaultRoot) {
    return typeof indexStore.setRoot === 'function'
      ? indexStore.setRoot(vaultRoot)
      : fail('embedding_index_unavailable', 'Embedding index store unavailable.');
  }

  function getStatus() {
    const availability = typeof modelStore.checkBundledModelAvailability === 'function'
      ? modelStore.checkBundledModelAvailability()
      : { ok: false, available: false, missingArtifacts: [] };
    if (!availability.ok || availability.available !== true) {
      return ok({
        state: 'unavailable',
        canRefresh: false,
        modelId: activeFingerprint.modelId,
        missingArtifacts: Array.isArray(availability.missingArtifacts) ? availability.missingArtifacts : []
      });
    }

    const inspected = typeof indexStore.inspect === 'function'
      ? indexStore.inspect()
      : fail('embedding_index_unavailable', 'Embedding index inspection unavailable.');
    if (!inspected.ok && inspected.code === 'vault_not_open') {
      return ok({ state: 'no_vault', canRefresh: false, modelId: activeFingerprint.modelId });
    }
    if (!inspected.ok) return ok({ state: 'invalid', canRefresh: true, modelId: activeFingerprint.modelId });
    if (inspected.exists !== true) return ok({ state: 'no_index', canRefresh: true, modelId: activeFingerprint.modelId, documentCount: 0, chunkCount: 0 });

    const manifest = inspected.manifest || {};
    if (!embeddingFingerprintsMatch(manifest.fingerprint, activeFingerprint)) {
      return ok({
        state: 'rebuild_required',
        canRefresh: true,
        modelId: activeFingerprint.modelId,
        documentCount: countDocuments(inspected.documents),
        chunkCount: countChunks(inspected.documents)
      });
    }

    return ok({
      state: 'ready',
      canRefresh: true,
      modelId: activeFingerprint.modelId,
      documentCount: countDocuments(inspected.documents),
      chunkCount: countChunks(inspected.documents)
    });
  }

  return Object.freeze({ setRoot, getStatus });
}

function countDocuments(documents) {
  return documents && typeof documents === 'object' ? Object.keys(documents).length : 0;
}

function countChunks(documents) {
  return Object.values(documents || {}).reduce((total, record) => {
    const body = Array.isArray(record && record.bodyChunks) ? record.bodyChunks : (Array.isArray(record && record.chunks) ? record.chunks : []);
    const frontmatter = Array.isArray(record && record.frontmatterChunks) ? record.frontmatterChunks : [];
    return total + body.length + frontmatter.length;
  }, 0);
}

function ok(value) {
  return Object.assign({ ok: true }, value);
}

function fail(code, message) {
  return { ok: false, code, message };
}

module.exports = { createEmbeddingIndexStatusService };
