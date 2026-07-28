'use strict';

const { createEmbeddingModelStore } = require('../src/main/embeddings/embeddingModelStore');

async function main() {
  const store = createEmbeddingModelStore({ projectRoot: process.cwd() });
  const result = await store.verifyBundledModelIntegrity();
  if (!result.available || !result.integrityValid) {
    const detail = result.artifact ? ' Artifact: ' + result.artifact + '.' : '';
    process.stderr.write((result.message || 'Embedding model verification failed.') + detail + '\n');
    process.stderr.write('Run npm run model:provision from a trusted network before packaging.\n');
    process.exitCode = 1;
    return;
  }
  process.stdout.write('Embedding model integrity verified: ' + result.folderPath + '\n');
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write((error && error.message ? error.message : 'Embedding model verification failed.') + '\n');
    process.exitCode = 1;
  });
}

module.exports = { main };
