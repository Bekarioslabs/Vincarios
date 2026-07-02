'use strict';

const { createEmbeddingModelStore, DEFAULT_EMBEDDING_MODEL } = require('./embeddingModelStore');

const DEFAULT_MAX_TEXT_CHARS = 12000;

function createEmbeddingRuntimeService(options) {
  options = options || {};
  const modelStore = options.modelStore || createEmbeddingModelStore({ projectRoot: options.projectRoot });
  const loadTransformers = options.loadTransformers || defaultLoadTransformers;
  const maxTextChars = Number.isFinite(options.maxTextChars) ? options.maxTextChars : DEFAULT_MAX_TEXT_CHARS;
  let extractorPromise = null;

  async function embedText(text) {
    const normalizedText = String(text || '').trim();
    if (!normalizedText) {
      return fail('embedding_text_empty', 'Embedding text is empty.');
    }
    if (normalizedText.length > maxTextChars) {
      return fail('embedding_text_too_large', 'Embedding text exceeds the local embedding limit.');
    }

    const availability = modelStore.checkBundledModelAvailability();
    if (!availability.available) {
      return Object.assign(fail('embedding_model_unavailable', 'Local embedding model artifacts are unavailable.'), {
        missingArtifacts: availability.missingArtifacts || []
      });
    }

    try {
      const extractor = await getExtractor(availability.folderPath);
      const output = await extractor(normalizedText, { pooling: 'mean', normalize: true });
      const vector = Array.from(output.data || []);
      return ok({
        modelId: availability.modelId || DEFAULT_EMBEDDING_MODEL.id,
        dimensions: vector.length,
        vector
      });
    } catch (error) {
      return fail('embedding_runtime_failed', normalizeErrorMessage(error));
    }
  }

  async function getExtractor(folderPath) {
    if (!extractorPromise) {
      extractorPromise = loadTransformers().then(async ({ pipeline, env }) => {
        env.allowRemoteModels = false;
        env.allowLocalModels = true;
        return pipeline('feature-extraction', folderPath, { dtype: 'q8' });
      });
    }
    return extractorPromise;
  }

  return Object.freeze({
    embedText
  });
}

async function defaultLoadTransformers() {
  return import('@huggingface/transformers');
}

function normalizeErrorMessage(error) {
  return error && error.message ? error.message : 'Embedding runtime failed.';
}

function ok(value) {
  return Object.assign({ ok: true }, value);
}

function fail(code, message) {
  return { ok: false, code, message };
}

module.exports = {
  DEFAULT_MAX_TEXT_CHARS,
  createEmbeddingRuntimeService
};
