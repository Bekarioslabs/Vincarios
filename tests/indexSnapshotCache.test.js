'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createIndexSnapshotCache } = require('../src/main/indexing/indexSnapshotCache');

test('index snapshot cache reuses a validated snapshot while file signatures stay unchanged', () => {
  const stats = new Map([
    ['manifest.json', { size: 10, mtimeMs: 1 }],
    ['records.json', { size: 20, mtimeMs: 1 }]
  ]);
  const cache = createIndexSnapshotCache({
    fs: {
      statSync(filePath) {
        if (!stats.has(filePath)) throw new Error('missing');
        return stats.get(filePath);
      }
    }
  });
  let loads = 0;
  const loader = () => ({ generation: ++loads });

  const first = cache.read('vault:metadata', ['manifest.json', 'records.json'], loader);
  const second = cache.read('vault:metadata', ['manifest.json', 'records.json'], loader);

  assert.equal(first, second);
  assert.equal(loads, 1);
});

test('index snapshot cache reparses after an indexed file changes', () => {
  let modified = 1;
  const cache = createIndexSnapshotCache({
    fs: {
      statSync() {
        return { size: 10, mtimeMs: modified };
      }
    }
  });
  let loads = 0;

  cache.read('vault:search', ['manifest.json'], () => ++loads);
  modified = 2;
  const result = cache.read('vault:search', ['manifest.json'], () => ++loads);

  assert.equal(result, 2);
  assert.equal(loads, 2);
});

test('index snapshot cache invalidation is explicit on root changes and deletes', () => {
  const cache = createIndexSnapshotCache({
    fs: { statSync: () => ({ size: 1, mtimeMs: 1 }) }
  });
  let loads = 0;
  cache.read('vault:embeddings', ['index.json'], () => ++loads);
  cache.invalidate('vault:embeddings');
  cache.read('vault:embeddings', ['index.json'], () => ++loads);

  assert.equal(loads, 2);
});
