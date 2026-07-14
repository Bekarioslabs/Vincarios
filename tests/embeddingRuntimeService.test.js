'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createEmbeddingRuntimeService } = require('../src/main/embeddings/embeddingRuntimeService');

test('embedding runtime refuses to load when bundled artifacts are unavailable', async () => {
  const service = createEmbeddingRuntimeService({
    modelStore: {
      checkBundledModelAvailability() {
        return { available: false, missingArtifacts: ['onnx/model_quantized.onnx'] };
      }
    },
    loadTransformers: shouldNotLoad
  });

  const result = await service.embedText('hello');

  assert.equal(result.ok, false);
  assert.equal(result.code, 'embedding_model_unavailable');
  assert.deepEqual(result.missingArtifacts, ['onnx/model_quantized.onnx']);
});

test('embedding runtime loads local model with remote models disabled', async () => {
  const calls = [];
  const modelPath = path.join('D:', 'Vitruvios_AGENT', '.vitruvios', 'models', 'embeddings', 'model');
  const service = createEmbeddingRuntimeService({
    modelStore: createAvailableModelStore(modelPath),
    loadTransformers: async () => {
      const env = {};
      return {
        env,
        pipeline: async (task, selectedModelPath, options) => {
          calls.push({ task, selectedModelPath, options, env });
          return async () => ({ data: new Float32Array([1, 2, 3]) });
        }
      };
    }
  });

  const result = await service.embedText('hello world');

  assert.equal(result.ok, true);
  assert.deepEqual(result.vector, [1, 2, 3]);
  assert.equal(result.dimensions, 3);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].task, 'feature-extraction');
  assert.equal(calls[0].selectedModelPath, modelPath);
  assert.equal(calls[0].options.dtype, 'q8');
  assert.equal(calls[0].env.allowRemoteModels, false);
  assert.equal(calls[0].env.allowLocalModels, true);
});

test('embedding runtime caches the extractor between calls', async () => {
  let pipelineCalls = 0;
  const service = createEmbeddingRuntimeService({
    modelStore: createAvailableModelStore('local-model'),
    loadTransformers: async () => ({
      env: {},
      pipeline: async () => {
        pipelineCalls += 1;
        return async () => ({ data: new Float32Array([1, 2]) });
      }
    })
  });

  await service.embedText('first');
  await service.embedText('second');

  assert.equal(pipelineCalls, 1);
});

test('embedding runtime validates text before inference', async () => {
  const service = createEmbeddingRuntimeService({
    modelStore: createAvailableModelStore('local-model'),
    loadTransformers: shouldNotLoad,
    maxTextChars: 5
  });

  assert.equal((await service.embedText('')).code, 'embedding_text_empty');
  assert.equal((await service.embedText('123456')).code, 'embedding_text_too_large');
});

function createAvailableModelStore(folderPath) {
  return {
    checkBundledModelAvailability() {
      return { available: true, missingArtifacts: [], folderPath, modelId: 'test-model' };
    }
  };
}

function shouldNotLoad() {
  throw new Error('transformers loader should not be called');
}

