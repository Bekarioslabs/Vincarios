'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PREVIEW_RESOURCE_LIMITS,
  createBoundedPreviewHistory,
  createPreviewTaskPool
} = require('../src/renderer/markdown/previewResourcePolicy');

test('preview history keeps the newest entries within count and byte limits', () => {
  const history = createBoundedPreviewHistory({
    maxEntries: 3,
    maxBytes: 12
  });

  history.push({ path: 'A.md', source: 'aaaa' });
  history.push({ path: 'B.md', source: 'bbbb' });
  history.push({ path: 'C.md', source: 'cccc' });
  history.push({ path: 'D.md', source: 'dddd' });

  assert.deepEqual(history.entries().map((entry) => entry.path), ['B.md', 'C.md', 'D.md']);
  assert.equal(history.index(), 2);
});

test('preview history trims oversized old content while preserving current navigation', () => {
  const history = createBoundedPreviewHistory({
    maxEntries: 10,
    maxBytes: 8
  });

  history.push({ path: 'A.md', source: 'aaaa' });
  history.push({ path: 'B.md', source: 'bbbb' });
  history.push({ path: 'C.md', source: 'cccc' });

  assert.deepEqual(history.entries().map((entry) => entry.path), ['B.md', 'C.md']);
  assert.equal(history.move(-1).path, 'B.md');
  history.push({ path: 'D.md', source: 'dddd' });
  assert.deepEqual(history.entries().map((entry) => entry.path), ['B.md', 'D.md']);
});

test('preview task pool limits concurrency and invalidates stale generations', async () => {
  const pool = createPreviewTaskPool({ concurrency: 2 });
  let active = 0;
  let peak = 0;
  const releases = [];
  const completed = [];

  function task(id) {
    return pool.run(async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => releases.push(resolve));
      active -= 1;
      completed.push(id);
      return id;
    });
  }

  const first = task('A');
  const second = task('B');
  const third = task('C');
  await Promise.resolve();
  assert.equal(peak, 2);

  pool.invalidate();
  releases.splice(0).forEach((release) => release());
  await Promise.all([first.promise, second.promise, third.promise]);

  assert.deepEqual(completed.sort(), ['A', 'B']);
  assert.equal(pool.isCurrent(first.generation), false);
  assert.equal(PREVIEW_RESOURCE_LIMITS.maxConcurrentImages, 4);
});
