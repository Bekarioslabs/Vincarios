'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  DEFAULT_EMBEDDING_MODEL,
  createEmbeddingModelStore
} = require('../src/main/embeddings/embeddingModelStore');

test('embedding model store resolves bundled model artifacts under portable project .vitruvios', () => {
  const projectRoot = createTempProject();
  const vaultRoot = createTempProject();
  const store = createEmbeddingModelStore({ projectRoot });

  const location = store.getBundledModelLocation();

  assert.equal(location.modelId, DEFAULT_EMBEDDING_MODEL.id);
  assert.equal(location.artifactRepoId, 'Xenova/paraphrase-multilingual-MiniLM-L12-v2');
  assert.equal(location.baseModelId, 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2');
  assert.equal(location.relativeFolder, '.vitruvios/models/embeddings/paraphrase-multilingual-MiniLM-L12-v2');
  assert.equal(location.folderPath, path.join(projectRoot, '.vitruvios', 'models', 'embeddings', 'paraphrase-multilingual-MiniLM-L12-v2'));
  assert.equal(location.folderPath.startsWith(vaultRoot), false);
});

test('embedding model store resolves packaged artifacts from read-only release resources', () => {
  const projectRoot = createTempProject();
  const modelRoot = path.join(projectRoot, 'resources', 'vitruvios-models');
  const store = createEmbeddingModelStore({
    projectRoot,
    runtimePaths: { isPackaged: true, modelRoot }
  });

  const location = store.getBundledModelLocation();

  assert.equal(location.folderPath, path.join(modelRoot, 'embeddings', 'paraphrase-multilingual-MiniLM-L12-v2'));
  assert.equal(location.relativeFolder, 'resources/vitruvios-models/embeddings/paraphrase-multilingual-MiniLM-L12-v2');
  assert.equal(store.writeBundledModelManifest().ok, false);
});

test('embedding model store writes a local manifest without downloading model files', () => {
  const projectRoot = createTempProject();
  const store = createEmbeddingModelStore({ projectRoot });

  const result = store.writeBundledModelManifest({ sourceRevision: 'pinned-later' });
  const manifest = JSON.parse(fs.readFileSync(result.manifestPath, 'utf8'));

  assert.equal(result.ok, true);
  assert.equal(manifest.model.id, DEFAULT_EMBEDDING_MODEL.id);
  assert.equal(manifest.model.baseModelId, 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2');
  assert.equal(manifest.model.artifactRepoId, 'Xenova/paraphrase-multilingual-MiniLM-L12-v2');
  assert.equal(manifest.model.license, 'apache-2.0');
  assert.equal(manifest.model.dimensions, 384);
  assert.equal(manifest.runtime, 'transformers-js-onnx');
  assert.equal(manifest.source.revision, 'pinned-later');
  assert.equal(manifest.source.modelOnnxSha256, '66fc00f5f29afcaff34092e1bdd20008ca3918265a82fb9695a551e510cc4ebc');
  assert.equal(manifest.requiredArtifacts.includes('onnx/model_quantized.onnx'), true);
  assert.equal(manifest.artifactsDownloaded, false);
});

test('embedding model availability stays false until expected local artifacts exist', () => {
  const projectRoot = createTempProject();
  const store = createEmbeddingModelStore({ projectRoot });
  const missing = store.checkBundledModelAvailability();
  assert.equal(missing.available, false);

  const location = store.getBundledModelLocation();
  fs.mkdirSync(location.folderPath, { recursive: true });
  fs.mkdirSync(path.join(location.folderPath, 'onnx'), { recursive: true });
  for (const fileName of DEFAULT_EMBEDDING_MODEL.requiredArtifacts) {
    fs.mkdirSync(path.dirname(path.join(location.folderPath, fileName)), { recursive: true });
    fs.writeFileSync(path.join(location.folderPath, fileName), fileName === 'onnx/model_quantized.onnx' ? 'fake model' : '{}');
  }

  const available = store.checkBundledModelAvailability();
  assert.equal(available.available, true);
});

function createTempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vitruvios-embedding-model-'));
}
