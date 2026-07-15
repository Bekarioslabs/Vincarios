'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createEmbeddingIndexStatusService } = require('../src/main/embeddings/embeddingIndexStatusService');

test('embedding index status reports no_index without creating local cache files', () => {
  const service = createEmbeddingIndexStatusService({
    indexStore: { setRoot() { return { ok: true }; }, inspect() { return { ok: true, exists: false }; } },
    modelStore: { checkBundledModelAvailability() { return { ok: true, available: true, modelId: 'model-a', missingArtifacts: [] }; } },
    activeFingerprint: { modelId: 'model-a', dimensions: 384, revision: 'rev-1', indexVersion: 1 }
  });

  service.setRoot('D:/Vault');
  const status = service.getStatus();

  assert.equal(status.ok, true);
  assert.equal(status.state, 'no_index');
  assert.equal(status.canRefresh, true);
});

test('embedding index status detects fingerprint mismatch and unavailable model artifacts', () => {
  const indexStore = {
    setRoot() { return { ok: true }; },
    inspect() {
      return {
        ok: true,
        exists: true,
        manifest: { fingerprint: { modelId: 'model-old', dimensions: 384, revision: 'rev-1', indexVersion: 1 } },
        documents: { 'Note.md': { chunks: [{ id: 'one' }, { id: 'two' }] } }
      };
    }
  };
  const service = createEmbeddingIndexStatusService({
    indexStore,
    modelStore: { checkBundledModelAvailability() { return { ok: true, available: true, modelId: 'model-a', missingArtifacts: [] }; } },
    activeFingerprint: { modelId: 'model-a', dimensions: 384, revision: 'rev-1', indexVersion: 1 }
  });

  service.setRoot('D:/Vault');
  assert.equal(service.getStatus().state, 'rebuild_required');

  const unavailable = createEmbeddingIndexStatusService({
    indexStore,
    modelStore: { checkBundledModelAvailability() { return { ok: true, available: false, modelId: 'model-a', missingArtifacts: ['onnx/model_quantized.onnx'] }; } },
    activeFingerprint: { modelId: 'model-a', dimensions: 384, revision: 'rev-1', indexVersion: 1 }
  });
  unavailable.setRoot('D:/Vault');
  assert.equal(unavailable.getStatus().state, 'unavailable');
});

test('embedding index status treats unreadable index data as invalid', () => {
  const service = createEmbeddingIndexStatusService({
    indexStore: { setRoot() { return { ok: true }; }, inspect() { return { ok: false, code: 'invalid_embedding_manifest', message: 'Invalid manifest.' }; } },
    modelStore: { checkBundledModelAvailability() { return { ok: true, available: true, modelId: 'model-a', missingArtifacts: [] }; } },
    activeFingerprint: { modelId: 'model-a', dimensions: 384, revision: 'rev-1', indexVersion: 1 }
  });

  service.setRoot('D:/Vault');
  assert.equal(service.getStatus().state, 'invalid');
});


test('embedding index status reports no_vault before an index can be inspected', () => {
  const service = createEmbeddingIndexStatusService({
    indexStore: { setRoot() { return { ok: true }; }, inspect() { return { ok: false, code: 'vault_not_open' }; } },
    modelStore: { checkBundledModelAvailability() { return { ok: true, available: true, missingArtifacts: [] }; } },
    activeFingerprint: { modelId: 'model-a', dimensions: 384, revision: 'rev-1', indexVersion: 1 }
  });

  const status = service.getStatus();

  assert.equal(status.ok, true);
  assert.equal(status.state, 'no_vault');
  assert.equal(status.canRefresh, false);
});
