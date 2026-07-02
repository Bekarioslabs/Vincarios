'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { getPortableDataRoot } = require('../app/portableDataPath');

const DEFAULT_EMBEDDING_MODEL = Object.freeze({
  id: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
  baseModelId: 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
  artifactRepoId: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
  folderName: 'paraphrase-multilingual-MiniLM-L12-v2',
  license: 'apache-2.0',
  dimensions: 384,
  runtime: 'transformers-js-onnx',
  sourceUrl: 'https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2',
  baseModelUrl: 'https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
  sourceRevision: '2c4055b',
  modelOnnxSha256: '66fc00f5f29afcaff34092e1bdd20008ca3918265a82fb9695a551e510cc4ebc',
  requiredArtifacts: Object.freeze([
    'config.json',
    'special_tokens_map.json',
    'tokenizer.json',
    'tokenizer_config.json',
    'unigram.json',
    'onnx/model_quantized.onnx'
  ])
});

function createEmbeddingModelStore(options) {
  options = options || {};
  const fileSystem = options.fs || fs;
  const projectRoot = path.resolve(String(options.projectRoot || process.cwd()));

  function getBundledModelLocation() {
    const folderPath = path.join(getPortableDataRoot(projectRoot), 'models', 'embeddings', DEFAULT_EMBEDDING_MODEL.folderName);
    return {
      ok: true,
      modelId: DEFAULT_EMBEDDING_MODEL.id,
      baseModelId: DEFAULT_EMBEDDING_MODEL.baseModelId,
      artifactRepoId: DEFAULT_EMBEDDING_MODEL.artifactRepoId,
      relativeFolder: '.zeus/models/embeddings/' + DEFAULT_EMBEDDING_MODEL.folderName,
      folderPath,
      manifestPath: path.join(folderPath, 'model-manifest.json')
    };
  }

  function writeBundledModelManifest(options) {
    options = options || {};
    const location = getBundledModelLocation();
    const manifest = {
      version: 1,
      model: {
        id: DEFAULT_EMBEDDING_MODEL.id,
        baseModelId: DEFAULT_EMBEDDING_MODEL.baseModelId,
        artifactRepoId: DEFAULT_EMBEDDING_MODEL.artifactRepoId,
        license: DEFAULT_EMBEDDING_MODEL.license,
        dimensions: DEFAULT_EMBEDDING_MODEL.dimensions
      },
      runtime: DEFAULT_EMBEDDING_MODEL.runtime,
      source: {
        url: DEFAULT_EMBEDDING_MODEL.sourceUrl,
        baseModelUrl: DEFAULT_EMBEDDING_MODEL.baseModelUrl,
        revision: normalizeString(options.sourceRevision) || DEFAULT_EMBEDDING_MODEL.sourceRevision,
        modelOnnxSha256: DEFAULT_EMBEDDING_MODEL.modelOnnxSha256
      },
      requiredArtifacts: Array.from(DEFAULT_EMBEDDING_MODEL.requiredArtifacts),
      artifactsDownloaded: false
    };

    try {
      fileSystem.mkdirSync(location.folderPath, { recursive: true });
      fileSystem.writeFileSync(location.manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
      return ok({ manifest, manifestPath: location.manifestPath });
    } catch (error) {
      return fail('embedding_model_manifest_write_failed', 'Embedding model manifest could not be written.');
    }
  }

  function checkBundledModelAvailability() {
    const location = getBundledModelLocation();
    const missingArtifacts = DEFAULT_EMBEDDING_MODEL.requiredArtifacts.filter((fileName) => {
      return !fileSystem.existsSync(path.join(location.folderPath, fileName));
    });
    return {
      ok: true,
      modelId: DEFAULT_EMBEDDING_MODEL.id,
      available: missingArtifacts.length === 0,
      missingArtifacts,
      folderPath: location.folderPath
    };
  }

  return Object.freeze({
    getBundledModelLocation,
    writeBundledModelManifest,
    checkBundledModelAvailability
  });
}

function normalizeString(value) {
  return String(value || '').trim();
}

function ok(value) {
  return Object.assign({ ok: true }, value);
}

function fail(code, message) {
  return { ok: false, code, message };
}

module.exports = {
  DEFAULT_EMBEDDING_MODEL,
  createEmbeddingModelStore
};
