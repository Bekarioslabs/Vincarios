'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createIndexRefreshCoordinator } = require('../src/main/indexing/indexRefreshCoordinator');

test('index refresh coordinator shares one in-flight operation per key', async () => {
  const coordinator = createIndexRefreshCoordinator();
  let calls = 0;
  let release;
  const operation = () => {
    calls += 1;
    return new Promise((resolve) => { release = resolve; });
  };

  const first = coordinator.run('embeddings', operation);
  const second = coordinator.run('embeddings', operation);

  assert.equal(first, second);
  assert.equal(calls, 1);
  release({ ok: true });
  assert.deepEqual(await first, { ok: true });
  assert.equal(coordinator.isRunning('embeddings'), false);
});

test('index refresh coordinator keeps independent index kinds separate', async () => {
  const coordinator = createIndexRefreshCoordinator();
  const values = await Promise.all([
    coordinator.run('metadata', async () => 'metadata'),
    coordinator.run('full-text', async () => 'full-text')
  ]);

  assert.deepEqual(values, ['metadata', 'full-text']);
});

test('index refresh coordinator clears failed operations for retry', async () => {
  const coordinator = createIndexRefreshCoordinator();
  let calls = 0;
  await assert.rejects(coordinator.run('metadata', async () => {
    calls += 1;
    throw new Error('failed');
  }));
  const result = await coordinator.run('metadata', async () => {
    calls += 1;
    return 'recovered';
  });

  assert.equal(result, 'recovered');
  assert.equal(calls, 2);
});
