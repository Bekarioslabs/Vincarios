'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createVaultReviewBasketService, REVIEW_BASKET_RELATIVE_PATH } = require('../src/main/vault/vaultReviewBasketService');

function createVault() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-review-basket-'));
}

function createProposal(overrides) {
  return Object.assign({
    id: 'proposal-1',
    type: 'update_note',
    status: 'open',
    title: 'Update note',
    reason: 'Requested content update.',
    risk: 'medium',
    targetPath: 'Notes/One.md',
    currentContent: '# Before\n',
    proposedContent: '# After\n',
    selected: true
  }, overrides || {});
}

test('review basket stays vault-local and restores pending, executed, and failed entries', () => {
  const root = createVault();
  const service = createVaultReviewBasketService();
  service.setRoot(root);

  const saved = service.save({
    items: [
      createProposal(),
      createProposal({ id: 'proposal-2', status: 'done', selected: false }),
      createProposal({ id: 'proposal-3', status: 'failed', selected: false, error: 'Write permission changed.' }),
      createProposal({ id: 'proposal-4', status: 'dismissed' })
    ]
  });

  assert.equal(saved.ok, true);
  assert.equal(fs.existsSync(path.join(root, REVIEW_BASKET_RELATIVE_PATH)), true);

  const restored = service.load();
  assert.equal(restored.ok, true);
  assert.deepEqual(restored.snapshot.items.map((item) => [item.id, item.status]), [
    ['proposal-1', 'open'],
    ['proposal-2', 'done'],
    ['proposal-3', 'failed']
  ]);
});

test('review basket rejects unsafe paths and recovers safely from malformed cache data', () => {
  const root = createVault();
  const service = createVaultReviewBasketService();
  service.setRoot(root);

  const unsafe = service.save({ items: [createProposal({ targetPath: '../outside.md' })] });
  assert.equal(unsafe.ok, false);
  assert.equal(unsafe.code, 'invalid_review_snapshot');

  const cachePath = path.join(root, REVIEW_BASKET_RELATIVE_PATH);
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, '{not valid json', 'utf8');

  const restored = service.load();
  assert.equal(restored.ok, true);
  assert.deepEqual(restored.snapshot, { items: [] });
  assert.equal(restored.warning, 'Review Basket cache could not be restored.');
});