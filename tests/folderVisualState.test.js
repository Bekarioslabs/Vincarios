'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const helpers = require('../src/shared/vaultProfile/folderVisuals');
const { createFolderVisualState } = require('../src/renderer/files/folderVisualState');

test('folder visual state combines stored top-level overrides with the semantic defaults', async () => {
  const state = createFolderVisualState({
    helpers,
    api: {
      vault: {
        async getFolderVisuals() {
          return { ok: true, visuals: { '02_Projects': { icon: 'star', color: 'orange' } } };
        }
      }
    }
  });

  await state.load();

  assert.deepEqual(state.get('02_Projects'), { icon: 'star', color: 'orange' });
  assert.deepEqual(state.get('00_Inbox'), { icon: 'inbox', color: 'amber' });
  assert.equal(state.get('02_Projects/Alpha'), null);
});

test('folder visual state updates local overrides only after a successful explicit save', async () => {
  const state = createFolderVisualState({
    helpers,
    api: {
      vault: {
        async setFolderVisual(payload) {
          return { ok: true, visuals: { [payload.path]: payload.visual } };
        },
        async clearFolderVisual() {
          return { ok: true, visuals: {} };
        }
      }
    }
  });

  await state.set('03_Knowledge', { icon: 'compass', color: 'sky' });
  assert.deepEqual(state.get('03_Knowledge'), { icon: 'compass', color: 'sky' });
  await state.clear('03_Knowledge');
  assert.deepEqual(state.get('03_Knowledge'), { icon: 'book', color: 'green' });
});

test('folder visual state does not erase the current display state when its optional API is unavailable', async () => {
  const state = createFolderVisualState({ helpers });

  await state.load();

  assert.deepEqual(state.get('99_Archive'), { icon: 'archive', color: 'red' });
  assert.deepEqual(state.snapshot().overrides, {});
});
