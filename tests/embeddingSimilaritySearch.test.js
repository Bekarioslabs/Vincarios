'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createEmbeddingSimilaritySearch } = require('../src/main/embeddings/embeddingSimilaritySearch');

test('embedding similarity search returns nearest notes and excludes the query document', async () => {
  const search = createEmbeddingSimilaritySearch({
    indexStore: createStore({
      'Notes/Alpha.md': record('Notes/Alpha.md', [[1, 0]]),
      'Notes/Beta.md': record('Notes/Beta.md', [[0.9, 0.1]]),
      'Notes/Gamma.md': record('Notes/Gamma.md', [[0, 1]])
    })
  });

  const result = await search.findSimilarNotes('Notes/Alpha.md', { limit: 2, minimumScorePercent: 0 });

  assert.equal(result.ok, true);
  assert.deepEqual(result.candidates.map((candidate) => candidate.path), ['Notes/Beta.md', 'Notes/Gamma.md']);
  assert.equal(result.candidates[0].kind, 'similar_note');
  assert.equal(result.candidates[0].score > result.candidates[1].score, true);
});

test('embedding similarity search averages chunk vectors for document comparison', async () => {
  const search = createEmbeddingSimilaritySearch({
    indexStore: createStore({
      'A.md': record('A.md', [[1, 0], [1, 0]]),
      'B.md': record('B.md', [[1, 0], [0, 1]]),
      'C.md': record('C.md', [[0, 1], [0, 1]])
    })
  });

  const result = await search.findSimilarNotes('A.md', { limit: 2, minimumScorePercent: 0 });

  assert.equal(result.ok, true);
  assert.deepEqual(result.candidates.map((candidate) => candidate.path), ['B.md', 'C.md']);
});

test('embedding similarity search reports missing index or target clearly', async () => {
  const empty = createEmbeddingSimilaritySearch({ indexStore: createStore({}) });
  const missing = await empty.findSimilarNotes('Missing.md');

  assert.equal(missing.ok, false);
  assert.equal(missing.code, 'embedding_target_not_indexed');

  const failed = await createEmbeddingSimilaritySearch({
    indexStore: { loadDocuments: () => ({ ok: false, code: 'vault_not_open', message: 'No vault is open.' }) }
  }).findSimilarNotes('A.md');

  assert.equal(failed.ok, false);
  assert.equal(failed.code, 'vault_not_open');
});

function splitRecord(path, bodyVectors, frontmatterVectors) {
  return Object.assign(record(path, bodyVectors), {
    bodyChunks: bodyVectors.map((_, index) => ({ id: path + '#body' + index, start: 0, end: 1, text: 'body' })),
    bodyVectors,
    frontmatterChunks: frontmatterVectors.map((_, index) => ({ id: path + '#meta' + index, start: 0, end: 1, text: 'meta' })),
    frontmatterVectors
  });
}

function record(path, vectors) {
  return {
    path,
    hash: path,
    mtimeMs: 1,
    chunks: vectors.map((_, index) => ({ id: path + '#' + index, start: 0, end: 1, text: 'x' })),
    vectors
  };
}

function createStore(documents) {
  return {
    loadDocuments() {
      return { ok: true, documents };
    }
  };
}


test('embedding similarity search filters by threshold and reports percent scores', async () => {
  const search = createEmbeddingSimilaritySearch({
    indexStore: createStore({
      'A.md': record('A.md', [[1, 0]]),
      'B.md': record('B.md', [[0.9, 0.1]]),
      'C.md': record('C.md', [[0.1, 0.9]])
    })
  });

  const result = await search.findSimilarNotes('A.md', { minimumScorePercent: 65, limit: 10 });

  assert.equal(result.ok, true);
  assert.equal(result.minimumScorePercent, 65);
  assert.deepEqual(result.candidates.map((candidate) => candidate.path), ['B.md']);
  assert.equal(result.candidates[0].scorePercent >= 65, true);
});

test('embedding similarity search includes a candidate when its displayed percent meets the minimum', async () => {
  const nearEightyPercent = [0.884, Math.sqrt(1 - (0.884 * 0.884))];
  const search = createEmbeddingSimilaritySearch({
    getVaultProfile() {
      return { ok: true, profile: { roles: { knowledge: 'Knowledge' } } };
    },
    indexStore: createStore({
      'Knowledge/One/Markdown_TEST.md': record('Knowledge/One/Markdown_TEST.md', [[1, 0]]),
      'Knowledge/Two/Markdown_TEST.md': record('Knowledge/Two/Markdown_TEST.md', [nearEightyPercent])
    })
  });

  const result = await search.findSimilarNotes('Knowledge/One/Markdown_TEST.md', {
    minimumScorePercent: 80,
    limit: 10
  });

  assert.equal(result.ok, true);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].scorePercent, 80);
  assert.equal(result.candidates[0].score, 0.8);
});

test('embedding similarity search promotes equal indexed content to an exact duplicate', async () => {
  const original = Object.assign(record('Knowledge/Original.md', [[1, 0]]), { hash: 'same-content' });
  const copy = Object.assign(record('Knowledge/Copy.md', [[0.1, 0.9]]), { hash: 'same-content' });
  const search = createEmbeddingSimilaritySearch({
    getVaultProfile() {
      return { ok: true, profile: { roles: { knowledge: 'Knowledge' } } };
    },
    indexStore: createStore({
      'Knowledge/Original.md': original,
      'Knowledge/Copy.md': copy
    })
  });

  const result = await search.findSimilarNotes('Knowledge/Original.md', {
    minimumScorePercent: 100,
    limit: 10
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.candidates.map((candidate) => candidate.relationship), ['exact_duplicate']);
  assert.equal(result.candidates[0].scorePercent, 100);
  assert.equal(result.candidates[0].reasons.includes('Identical indexed content'), true);
});

test('embedding similarity search supports content metadata and mixed modes', async () => {
  const search = createEmbeddingSimilaritySearch({
    indexStore: createStore({
      'A.md': splitRecord('A.md', [[1, 0]], [[1, 0]]),
      'Body.md': splitRecord('Body.md', [[0.95, 0.05]], [[0, 1]]),
      'Meta.md': splitRecord('Meta.md', [[0, 1]], [[0.95, 0.05]])
    })
  });

  const content = await search.findSimilarNotes('A.md', { mode: 'content', minimumScorePercent: 0, limit: 2 });
  const metadata = await search.findSimilarNotes('A.md', { mode: 'metadata', minimumScorePercent: 0, limit: 2 });
  const mixed = await search.findSimilarNotes('A.md', { mode: 'mixed', contentWeight: 80, metadataWeight: 20, minimumScorePercent: 0, limit: 2 });

  assert.equal(content.candidates[0].path, 'Body.md');
  assert.equal(metadata.candidates[0].path, 'Meta.md');
  assert.equal(mixed.candidates[0].path, 'Body.md');
  assert.equal(typeof mixed.candidates[0].contentScorePercent, 'number');
  assert.equal(typeof mixed.candidates[0].metadataScorePercent, 'number');
});

test('embedding similarity search reads defaults from settings store', async () => {
  const search = createEmbeddingSimilaritySearch({
    settingsStore: {
      getSettings() {
        return { embeddings: { similarNotes: { minimumScorePercent: 65, maxResults: 3, mode: 'content', contentWeight: 100, metadataWeight: 0 } } };
      }
    },
    indexStore: createStore({
      'A.md': record('A.md', [[1, 0]]),
      'B.md': record('B.md', [[0.9, 0.1]])
    })
  });

  const result = await search.findSimilarNotes('A.md');

  assert.equal(result.ok, true);
  assert.equal(result.mode, 'content');
  assert.equal(result.minimumScorePercent, 65);
  assert.equal(result.candidates.length, 1);
});


test('embedding similarity search can refresh the index before searching', async () => {
  let documents = {
    'A.md': record('A.md', [[1, 0]])
  };
  const search = createEmbeddingSimilaritySearch({
    indexStore: createStore(documents),
    indexer: {
      setRoot() { return { ok: true }; },
      async rebuildIndex() {
        documents['Copy/A.md'] = record('Copy/A.md', [[1, 0]]);
        return { ok: true, indexedDocuments: 1 };
      }
    }
  });

  const result = await search.findSimilarNotes('A.md', { refreshIndex: true, scope: 'whole_vault', minimumScorePercent: 65 });

  assert.equal(result.ok, true);
  assert.deepEqual(result.candidates.map((candidate) => candidate.path), ['Copy/A.md']);
});

test('embedding similarity search excludes unrelated high-cosine notes outside the active Vault Role by default', async () => {
  const search = createEmbeddingSimilaritySearch({
    getVaultProfile() {
      return { ok: true, profile: { roles: { brain: 'AI Core', knowledge: 'Knowledge' } } };
    },
    indexStore: createStore({
      'AI Core/Agent Bootstrap.md': record('AI Core/Agent Bootstrap.md', [[1, 0]]),
      'AI Core/Rules.md': record('AI Core/Rules.md', [[0.95, 0.05]]),
      'Knowledge/Agent Guide.md': record('Knowledge/Agent Guide.md', [[0.99, 0.01]])
    })
  });

  const result = await search.findSimilarNotes('AI Core/Agent Bootstrap.md', { minimumScorePercent: 0 });

  assert.equal(result.ok, true);
  assert.equal(result.scope, 'same_role');
  assert.deepEqual(result.candidates.map((candidate) => candidate.path), ['AI Core/Rules.md']);
});

test('embedding similarity search permits an explicit whole-vault search', async () => {
  const search = createEmbeddingSimilaritySearch({
    getVaultProfile() {
      return { ok: true, profile: { roles: { brain: 'AI Core', knowledge: 'Knowledge' } } };
    },
    indexStore: createStore({
      'AI Core/Agent Bootstrap.md': record('AI Core/Agent Bootstrap.md', [[1, 0]]),
      'Knowledge/Agent Guide.md': record('Knowledge/Agent Guide.md', [[0.99, 0.01]])
    })
  });

  const result = await search.findSimilarNotes('AI Core/Agent Bootstrap.md', { scope: 'whole_vault', minimumScorePercent: 0 });

  assert.equal(result.ok, true);
  assert.equal(result.scope, 'whole_vault');
  assert.deepEqual(result.candidates.map((candidate) => candidate.path), ['Knowledge/Agent Guide.md']);
});
