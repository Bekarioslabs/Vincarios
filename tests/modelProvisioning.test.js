'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { provisionEmbeddingModel } = require('../scripts/provision-embedding-model');

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

test('model provisioning downloads a pinned revision and verifies every artifact before install', async () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-model-provision-'));
  const artifacts = {
    'config.json': '{"model":"fixture"}',
    'onnx/model.onnx': 'trusted-model-bytes',
  };
  const modelDefinition = Object.freeze({
    id: 'fixture/model',
    baseModelId: 'fixture/base',
    artifactRepoId: 'fixture/repository',
    folderName: 'fixture-model',
    license: 'apache-2.0',
    dimensions: 2,
    runtime: 'test',
    sourceUrl: 'https://huggingface.co/fixture/repository',
    baseModelUrl: 'https://huggingface.co/fixture/base',
    sourceRevision: '0123456789abcdef0123456789abcdef01234567',
    modelOnnxSha256: sha256(artifacts['onnx/model.onnx']),
    requiredArtifacts: Object.freeze(Object.keys(artifacts)),
    artifactSha256: Object.freeze(Object.fromEntries(Object.entries(artifacts).map(([name, value]) => [name, sha256(value)]))),
  });
  const requested = [];
  const result = await provisionEmbeddingModel({
    projectRoot,
    modelDefinition,
    fetchImpl: async (url) => {
      requested.push(url);
      const artifact = Object.keys(artifacts).find((name) => url.includes(name));
      return new Response(artifacts[artifact], { status: 200 });
    },
  });

  assert.equal(result.ok, true);
  assert.equal(requested.length, 2);
  assert.equal(requested.every((url) => url.includes(modelDefinition.sourceRevision)), true);
  const installedRoot = path.join(projectRoot, '.vincarios', 'models', 'embeddings', 'fixture-model');
  assert.equal(fs.readFileSync(path.join(installedRoot, 'config.json'), 'utf8'), artifacts['config.json']);
  assert.equal(fs.readFileSync(path.join(installedRoot, 'onnx', 'model.onnx'), 'utf8'), artifacts['onnx/model.onnx']);
});

test('model provisioning rejects a hash mismatch without replacing an existing model', async () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-model-provision-'));
  const modelDefinition = Object.freeze({
    id: 'fixture/model',
    baseModelId: 'fixture/base',
    artifactRepoId: 'fixture/repository',
    folderName: 'fixture-model',
    license: 'apache-2.0',
    dimensions: 2,
    runtime: 'test',
    sourceUrl: 'https://huggingface.co/fixture/repository',
    baseModelUrl: 'https://huggingface.co/fixture/base',
    sourceRevision: '0123456789abcdef0123456789abcdef01234567',
    modelOnnxSha256: sha256('expected'),
    requiredArtifacts: Object.freeze(['model.bin']),
    artifactSha256: Object.freeze({ 'model.bin': sha256('expected') }),
  });
  const installedRoot = path.join(projectRoot, '.vincarios', 'models', 'embeddings', 'fixture-model');
  fs.mkdirSync(installedRoot, { recursive: true });
  fs.writeFileSync(path.join(installedRoot, 'keep.txt'), 'existing');

  const result = await provisionEmbeddingModel({
    projectRoot,
    modelDefinition,
    fetchImpl: async () => new Response('tampered', { status: 200 }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'embedding_model_download_hash_mismatch');
  assert.equal(fs.readFileSync(path.join(installedRoot, 'keep.txt'), 'utf8'), 'existing');
});
test('model provisioning refreshes trusted manifest metadata without downloading valid artifacts again', async () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-model-provision-'));
  const bytes = 'trusted-model';
  const modelDefinition = Object.freeze({
    id: 'fixture/model',
    baseModelId: 'fixture/base',
    artifactRepoId: 'fixture/repository',
    folderName: 'fixture-model',
    license: 'apache-2.0',
    dimensions: 2,
    runtime: 'test',
    sourceUrl: 'https://huggingface.co/fixture/repository',
    baseModelUrl: 'https://huggingface.co/fixture/base',
    sourceRevision: '0123456789abcdef0123456789abcdef01234567',
    modelOnnxSha256: sha256(bytes),
    requiredArtifacts: Object.freeze(['model.bin']),
    artifactSha256: Object.freeze({ 'model.bin': sha256(bytes) }),
  });
  const installedRoot = path.join(projectRoot, '.vincarios', 'models', 'embeddings', 'fixture-model');
  fs.mkdirSync(installedRoot, { recursive: true });
  fs.writeFileSync(path.join(installedRoot, 'model.bin'), bytes);
  fs.writeFileSync(path.join(installedRoot, 'model-manifest.json'), JSON.stringify({ source: { revision: 'main' } }));

  const result = await provisionEmbeddingModel({
    projectRoot,
    modelDefinition,
    fetchImpl: async () => { throw new Error('valid local artifacts must not be downloaded'); },
  });

  assert.equal(result.ok, true);
  assert.equal(result.alreadyPresent, true);
  const manifest = JSON.parse(fs.readFileSync(path.join(installedRoot, 'model-manifest.json'), 'utf8'));
  assert.equal(manifest.source.revision, modelDefinition.sourceRevision);
  assert.deepEqual(manifest.source.artifactSha256, modelDefinition.artifactSha256);
  assert.equal(manifest.artifactsDownloaded, true);
});