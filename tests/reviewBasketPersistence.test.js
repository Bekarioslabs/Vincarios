'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createReviewBasketPersistence } = require('../src/renderer/review/reviewBasketPersistence');

test('review basket persistence restores a vault-local snapshot through the preload API', async () => {
  const calls = [];
  const persistence = createReviewBasketPersistence({
    api: {
      vault: {
        loadReviewBasket() {
          calls.push('load');
          return { ok: true, snapshot: { items: [{ id: 'proposal-1', status: 'open' }] } };
        },
        saveReviewBasket(snapshot) {
          calls.push(['save', snapshot]);
          return { ok: true };
        }
      }
    }
  });
  let restored = null;

  const result = await persistence.restore({
    restoreSnapshot(snapshot) { restored = snapshot; }
  });
  const saved = await persistence.persist({ items: [{ id: 'proposal-2', status: 'done' }] });

  assert.equal(result.ok, true);
  assert.deepEqual(restored, { items: [{ id: 'proposal-1', status: 'open' }] });
  assert.equal(saved.ok, true);
  assert.deepEqual(calls, ['load', ['save', { items: [{ id: 'proposal-2', status: 'done' }] }]]);
});

test('review basket persistence fails softly when its preload API is unavailable', async () => {
  const persistence = createReviewBasketPersistence({ api: {} });
  const restored = await persistence.restore({ restoreSnapshot() {} });
  const saved = await persistence.persist({ items: [] });

  assert.equal(restored.ok, false);
  assert.equal(saved.ok, false);
});