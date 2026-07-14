'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const helpers = require('../src/shared/vaultProfile/folderVisuals');
const { createVaultProfileDraftState } = require('../src/renderer/vaultProfile/vaultProfileDraftState');

function role(folderPath, colorId) {
  return {
    folderPath,
    visual: {
      icon: { kind: 'builtin', id: 'folder' },
      color: { kind: 'token', id: colorId || 'amber-400' }
    }
  };
}

test('Vault Profile drafts retain unsaved changes across another role commit', () => {
  const state = createVaultProfileDraftState({ helpers });
  state.reset({
    roles: { inbox: '00_Inbox', projects: '02_Projects' },
    roleVisuals: {}
  });

  state.updateRole('inbox', role('00_Inbox', 'blue-400'));
  state.updateRole('projects', role('03_Knowledge', 'violet-400'));
  state.commitRole('inbox', {
    roles: { inbox: '00_Inbox', projects: '02_Projects' },
    roleVisuals: { inbox: { icon: { kind: 'builtin', id: 'folder' }, color: { kind: 'token', id: 'blue-400' } } }
  });

  assert.equal(state.isDirty('inbox'), false);
  assert.equal(state.isDirty('projects'), true);
  assert.equal(state.getRole('projects').folderPath, '03_Knowledge');
});

test('Vault Profile drafts expose effective folder ownership and keep own assignment available', () => {
  const state = createVaultProfileDraftState({ helpers });
  state.reset({
    roles: { inbox: '00_Inbox', projects: '02_Projects' },
    roleVisuals: {}
  });
  state.updateRole('projects', role('03_Knowledge', 'violet-400'));

  assert.equal(state.getAssignedRole('00_Inbox'), 'inbox');
  assert.equal(state.getAssignedRole('03_Knowledge'), 'projects');
  assert.equal(state.isFolderAvailable('03_Knowledge', 'projects'), true);
  assert.equal(state.isFolderAvailable('03_Knowledge', 'inbox'), false);
});
test('Vault Profile draft invalidation requires the authoritative profile to be loaded again', () => {
  const state = createVaultProfileDraftState({ helpers });
  state.reset({
    roles: { inbox: '00_Inbox' },
    roleVisuals: {}
  });

  state.invalidate();

  assert.equal(state.hasBase(), false);
  state.reset({
    roles: { inbox: 'Incoming' },
    roleVisuals: {
      inbox: { icon: { kind: 'builtin', id: 'inbox' }, color: { kind: 'token', id: 'blue-400' } }
    }
  });
  assert.equal(state.getRole('inbox').folderPath, 'Incoming');
  assert.equal(state.getRole('inbox').visual.color.id, 'blue-400');
});