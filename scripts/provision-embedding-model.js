'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Readable, Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');

const {
  DEFAULT_EMBEDDING_MODEL,
  createEmbeddingModelStore,
} = require('../src/main/embeddings/embeddingModelStore');

async function provisionEmbeddingModel(options) {
  options = options || {};
  const projectRoot = path.resolve(String(options.projectRoot || process.cwd()));
  const modelDefinition = options.modelDefinition || DEFAULT_EMBEDDING_MODEL;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    return fail('embedding_model_fetch_unavailable', 'A fetch implementation is required to provision the embedding model.');
  }

  const store = createEmbeddingModelStore({ projectRoot, modelDefinition });
  const location = store.getBundledModelLocation();
  const current = await store.verifyBundledModelIntegrity();
  if (current.available && current.integrityValid) {
    await writeManifest(location.folderPath, modelDefinition);
    return ok({ folderPath: location.folderPath, alreadyPresent: true });
  }

  const stagingPath = location.folderPath + '.staging-' + process.pid + '-' + Date.now();
  const backupPath = location.folderPath + '.previous-' + process.pid + '-' + Date.now();
  let movedExisting = false;
  try {
    await fs.promises.rm(stagingPath, { recursive: true, force: true });
    for (const artifact of modelDefinition.requiredArtifacts) {
      const expectedSha256 = String(modelDefinition.artifactSha256 && modelDefinition.artifactSha256[artifact] || '').toLowerCase();
      if (!expectedSha256) {
        return fail('embedding_model_hash_missing', 'Embedding model artifact hash is not pinned.', { artifact });
      }
      const destination = path.join(stagingPath, artifact);
      const url = buildArtifactUrl(modelDefinition, artifact);
      const downloaded = await downloadArtifact({ fetchImpl, url, destination, expectedSha256 });
      if (!downloaded.ok) return downloaded;
    }

    await writeManifest(stagingPath, modelDefinition);
    await fs.promises.mkdir(path.dirname(location.folderPath), { recursive: true });
    if (fs.existsSync(location.folderPath)) {
      await fs.promises.rename(location.folderPath, backupPath);
      movedExisting = true;
    }
    await fs.promises.rename(stagingPath, location.folderPath);
    if (movedExisting) await fs.promises.rm(backupPath, { recursive: true, force: true });
    return ok({ folderPath: location.folderPath, alreadyPresent: false });
  } catch (error) {
    if (movedExisting && !fs.existsSync(location.folderPath) && fs.existsSync(backupPath)) {
      await fs.promises.rename(backupPath, location.folderPath).catch(() => {});
    }
    return fail('embedding_model_provision_failed', error && error.message ? error.message : 'Embedding model provisioning failed.');
  } finally {
    await fs.promises.rm(stagingPath, { recursive: true, force: true }).catch(() => {});
  }
}

function buildArtifactUrl(modelDefinition, artifact) {
  const repo = String(modelDefinition.artifactRepoId || '').split('/').map(encodeURIComponent).join('/');
  const revision = encodeURIComponent(String(modelDefinition.sourceRevision || ''));
  const artifactPath = String(artifact || '').split('/').map(encodeURIComponent).join('/');
  return 'https://huggingface.co/' + repo + '/resolve/' + revision + '/' + artifactPath + '?download=true';
}

async function downloadArtifact(options) {
  const response = await options.fetchImpl(options.url, { redirect: 'follow' });
  if (!response || !response.ok || !response.body) {
    return fail('embedding_model_download_failed', 'Embedding model artifact download failed.', {
      status: response && response.status,
      url: options.url,
    });
  }

  await fs.promises.mkdir(path.dirname(options.destination), { recursive: true });
  const partialPath = options.destination + '.part';
  const hash = crypto.createHash('sha256');
  const hashStream = new Transform({
    transform(chunk, encoding, callback) {
      hash.update(chunk);
      callback(null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(response.body), hashStream, fs.createWriteStream(partialPath, { flags: 'wx' }));
    const actualSha256 = hash.digest('hex');
    if (actualSha256 !== options.expectedSha256) {
      return fail('embedding_model_download_hash_mismatch', 'Downloaded embedding model artifact failed checksum verification.', {
        expectedSha256: options.expectedSha256,
        actualSha256,
        url: options.url,
      });
    }
    await fs.promises.rename(partialPath, options.destination);
    return ok({ path: options.destination, sha256: actualSha256 });
  } finally {
    await fs.promises.rm(partialPath, { force: true }).catch(() => {});
  }
}

async function writeManifest(folderPath, modelDefinition) {
  const manifest = {
    version: 1,
    model: {
      id: modelDefinition.id,
      baseModelId: modelDefinition.baseModelId,
      artifactRepoId: modelDefinition.artifactRepoId,
      license: modelDefinition.license,
      dimensions: modelDefinition.dimensions,
    },
    runtime: modelDefinition.runtime,
    source: {
      url: modelDefinition.sourceUrl,
      baseModelUrl: modelDefinition.baseModelUrl,
      revision: modelDefinition.sourceRevision,
      modelOnnxSha256: modelDefinition.modelOnnxSha256,
      artifactSha256: Object.assign({}, modelDefinition.artifactSha256),
    },
    requiredArtifacts: Array.from(modelDefinition.requiredArtifacts),
    artifactsDownloaded: true,
    verifiedAt: new Date().toISOString(),
  };
  await fs.promises.writeFile(path.join(folderPath, 'model-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
}

function ok(value) {
  return Object.assign({ ok: true }, value);
}

function fail(code, message, details) {
  return Object.assign({ ok: false, code, message }, details || {});
}

async function main() {
  const result = await provisionEmbeddingModel();
  if (!result.ok) {
    process.stderr.write(result.message + '\n');
    process.exitCode = 1;
    return;
  }
  process.stdout.write((result.alreadyPresent ? 'Embedding model already verified: ' : 'Embedding model provisioned and verified: ') + result.folderPath + '\n');
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write((error && error.message ? error.message : 'Embedding model provisioning failed.') + '\n');
    process.exitCode = 1;
  });
}

module.exports = {
  buildArtifactUrl,
  downloadArtifact,
  provisionEmbeddingModel,
};
