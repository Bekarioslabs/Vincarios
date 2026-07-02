'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createBlockedActionState,
  formatMissingPermissionMessage,
  normalizeRequiredPermission
} = require('../src/renderer/context/blockedActionState');

test('blocked action state stores one retryable blocked app action', () => {
  const state = createBlockedActionState();
  const blocked = state.set({
    type: 'folder_list',
    selectionId: 4,
    targetPath: '90_AI_Brain/Core',
    targetKind: 'folder',
    requiredPermission: 'read',
    userText: 'Was liegt in diesem Ordner?'
  });

  assert.equal(blocked.type, 'folder_list');
  assert.equal(blocked.selectionId, 4);
  assert.equal(blocked.targetPath, '90_AI_Brain/Core');
  assert.equal(blocked.requiredPermission, 'read');
  assert.equal(blocked.userText, 'Was liegt in diesem Ordner?');
  assert.equal(state.hasBlocked(), true);
  assert.deepEqual(state.snapshot(), blocked);
});

test('blocked action state clears only the matching blocked action id', () => {
  const state = createBlockedActionState();
  const blocked = state.set({ type: 'selected_file_read', selectionId: 9, targetPath: 'A.md' });

  assert.deepEqual(state.clear('other-id'), state.snapshot());
  assert.equal(state.hasBlocked(), true);
  assert.equal(state.clear(blocked.id), null);
  assert.equal(state.hasBlocked(), false);
});
test('blocked action permission helpers format read and write consistently', () => {
  assert.equal(normalizeRequiredPermission('read'), 'read');
  assert.equal(normalizeRequiredPermission('write'), 'write');
  assert.equal(normalizeRequiredPermission('delete'), 'read');
  assert.equal(formatMissingPermissionMessage({ requiredPermission: 'write', targetPath: '03_Wissen/Test.md' }), 'W is still disabled for this target: 03_Wissen/Test.md');
});
