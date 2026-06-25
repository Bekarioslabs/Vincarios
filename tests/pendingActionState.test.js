'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createPendingActionState } = require('../src/renderer/context/pendingActionState');

test('pending action state stores one request-scoped folder action', () => {
  const state = createPendingActionState();
  const pending = state.set({
    type: 'folder_scope',
    selectionId: 7,
    targetPath: '90_AI_Brain',
    targetKind: 'folder'
  });

  assert.equal(pending.type, 'folder_scope');
  assert.equal(pending.selectionId, 7);
  assert.equal(pending.targetPath, '90_AI_Brain');
  assert.equal(state.hasPending(), true);
  assert.deepEqual(state.snapshot(), pending);
});

test('pending action state clears stale or completed actions', () => {
  const state = createPendingActionState();
  state.set({ type: 'folder_scope', selectionId: 3, targetPath: '03_Wissen' });

  const cleared = state.clear();

  assert.equal(cleared, null);
  assert.equal(state.hasPending(), false);
  assert.equal(state.snapshot(), null);
});
