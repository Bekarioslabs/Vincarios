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

  const result = await search.findSimilarNotes('A.md', { minimumScorePercent: 80, limit: 10 });

  assert.equal(result.ok, true);
  assert.equal(result.minimumScorePercent, 80);
  assert.deepEqual(result.candidates.map((candidate) => candidate.path), ['B.md']);
  assert.equal(result.candidates[0].scorePercent >= 80, true);
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
        return { embeddings: { similarNotes: { minimumScorePercent: 95, maxResults: 3, mode: 'content', contentWeight: 100, metadataWeight: 0 } } };
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
  assert.equal(result.minimumScorePercent, 95);
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

  const result = await search.findSimilarNotes('A.md', { refreshIndex: true, minimumScorePercent: 90 });

  assert.equal(result.ok, true);
  assert.deepEqual(result.candidates.map((candidate) => candidate.path), ['Copy/A.md']);
});
