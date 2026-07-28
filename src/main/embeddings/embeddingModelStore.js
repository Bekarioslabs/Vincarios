'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const { createRuntimePaths } = require('../app/runtimePaths');
const { CURRENT_INTERNAL_NAMESPACE } = require('../../shared/internalNamespace');

const DEFAULT_ARTIFACT_SHA256 = Object.freeze({
  'config.json': '05b570bff786faa5c4604152aa16f19f77ed6dfc31e47dd0f3dd987078693ac7',
  'special_tokens_map.json': '06e405a36dfe4b9604f484f6a1e619af1a7f7d09e34a8555eb0b77b66318067f',
  'tokenizer.json': 'b60b6b43406a48bf3638526314f3d232d97058bc93472ff2de930d43686fa441',
  'tokenizer_config.json': '3f5961b9ac86288cccdb97f32fb848d6187c78e1603958c53f3ea1f296b7d8a2',
  'unigram.json': '71b44701d7efd054205115acfa6ef126c5d2f84bd3affe0c59e48163674d19a6',
  'onnx/model_quantized.onnx': '66fc00f5f29afcaff34092e1bdd20008ca3918265a82fb9695a551e510cc4ebc'
});

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
  sourceRevision: '2c4055b12046f11709e9df2c122e59ffbdc2f900',
  modelOnnxSha256: DEFAULT_ARTIFACT_SHA256['onnx/model_quantized.onnx'],
  artifactSha256: DEFAULT_ARTIFACT_SHA256,
  requiredArtifacts: Object.freeze(Object.keys(DEFAULT_ARTIFACT_SHA256))
});

function createEmbeddingModelStore(options) {
  options = options || {};
  const modelDefinition = options.modelDefinition || DEFAULT_EMBEDDING_MODEL;
  const fileSystem = options.fs || fs;
  const projectRoot = path.resolve(String(options.projectRoot || process.cwd()));
  const runtimePaths = options.runtimePaths || createRuntimePaths({
    projectRoot,
    isPackaged: options.isPackaged,
    portableExecutableDir: options.portableExecutableDir,
    executablePath: options.executablePath,
    resourcesPath: options.resourcesPath
  });

  function getBundledModelLocation() {
    const folderPath = path.join(runtimePaths.modelRoot, 'embeddings', modelDefinition.folderName);
    return {
      ok: true,
      modelId: modelDefinition.id,
      baseModelId: modelDefinition.baseModelId,
      artifactRepoId: modelDefinition.artifactRepoId,
      relativeFolder: runtimePaths.isPackaged
        ? 'resources/vincarios-models/embeddings/' + modelDefinition.folderName
        : CURRENT_INTERNAL_NAMESPACE + '/models/embeddings/' + modelDefinition.folderName,
      folderPath,
      manifestPath: path.join(folderPath, 'model-manifest.json')
    };
  }

  function writeBundledModelManifest(options) {
    options = options || {};
    if (runtimePaths.isPackaged) {
      return fail('embedding_model_resources_read_only', 'Packaged embedding resources are read-only.');
    }
    const location = getBundledModelLocation();
    const manifest = {
      version: 1,
      model: {
        id: modelDefinition.id,
        baseModelId: modelDefinition.baseModelId,
        artifactRepoId: modelDefinition.artifactRepoId,
        license: modelDefinition.license,
        dimensions: modelDefinition.dimensions
      },
      runtime: modelDefinition.runtime,
      source: {
        url: modelDefinition.sourceUrl,
        baseModelUrl: modelDefinition.baseModelUrl,
        revision: normalizeString(options.sourceRevision) || modelDefinition.sourceRevision,
        modelOnnxSha256: modelDefinition.modelOnnxSha256,
        artifactSha256: Object.assign({}, modelDefinition.artifactSha256)
      },
      requiredArtifacts: Array.from(modelDefinition.requiredArtifacts),
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
    const missingArtifacts = modelDefinition.requiredArtifacts.filter((fileName) => {
      return !fileSystem.existsSync(path.join(location.folderPath, fileName));
    });
    return {
      ok: true,
      modelId: modelDefinition.id,
      available: missingArtifacts.length === 0,
      missingArtifacts,
      folderPath: location.folderPath
    };
  }

  async function verifyBundledModelIntegrity() {
    const availability = checkBundledModelAvailability();
    if (!availability.available) {
      return Object.assign({}, availability, {
        integrityValid: false,
        code: 'embedding_model_unavailable',
        message: 'Local embedding model artifacts are unavailable.'
      });
    }

    try {
      for (const artifact of modelDefinition.requiredArtifacts) {
        const expectedSha256 = normalizeString(modelDefinition.artifactSha256 && modelDefinition.artifactSha256[artifact]).toLowerCase();
        if (!expectedSha256) {
          return Object.assign({}, availability, {
            available: false,
            integrityValid: false,
            code: 'embedding_model_hash_missing',
            message: 'Embedding model artifact hash is not pinned.',
            artifact
          });
        }
        const actualSha256 = await hashFileSha256(fileSystem, path.join(availability.folderPath, artifact));
        if (actualSha256 !== expectedSha256) {
          return Object.assign({}, availability, {
            available: false,
            integrityValid: false,
            code: 'embedding_model_integrity_mismatch',
            message: 'Local embedding model integrity verification failed.',
            artifact,
            expectedSha256,
            actualSha256
          });
        }
      }
      return Object.assign({}, availability, { integrityValid: true });
    } catch (error) {
      return Object.assign(fail('embedding_model_integrity_check_failed', 'Embedding model integrity could not be verified.'), {
        available: false,
        integrityValid: false
      });
    }
  }

  return Object.freeze({
    getBundledModelLocation,
    writeBundledModelManifest,
    checkBundledModelAvailability,
    verifyBundledModelIntegrity
  });
}

function hashFileSha256(fileSystem, filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fileSystem.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
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