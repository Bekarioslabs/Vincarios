'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createIndexedDocumentRecord } = require('../src/shared/embeddings/embeddingIndexSchema');
const { getDocumentVectors } = require('../src/main/embeddings/embeddingSimilaritySearch');

test('embedding records precompute body and frontmatter centroids once', () => {
  const record = createIndexedDocumentRecord({
    path: 'Note.md',
    bodyVectors: [[1, 0], [0, 1]],
    frontmatterVectors: [[0.8, 0.2], [0.6, 0.4]]
  });

  assert.deepEqual(record.bodyCentroid, [0.5, 0.5]);
  assert.equal(Math.abs(record.frontmatterCentroid[0] - 0.7) < 1e-12, true);
  assert.equal(Math.abs(record.frontmatterCentroid[1] - 0.3) < 1e-12, true);
});

test('similarity search consumes stored centroids before legacy vector arrays', () => {
  const vectors = getDocumentVectors({
    bodyCentroid: [0.25, 0.75],
    frontmatterCentroid: [0.9, 0.1],
    bodyVectors: [[1, 0]],
    frontmatterVectors: [[0, 1]]
  });

  assert.deepEqual(vectors.content, [0.25, 0.75]);
  assert.deepEqual(vectors.metadata, [0.9, 0.1]);
});
