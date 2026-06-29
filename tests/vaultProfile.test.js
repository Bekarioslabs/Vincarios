'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_VAULT_PROFILE,
  FOLDER_ROLES,
  createVaultProfile,
  getFolderRolePath,
  joinFolderRolePath
} = require('../src/shared/vaultProfile/defaults');

test('default vault profile exposes stable folder roles', () => {
  assert.equal(FOLDER_ROLES.inbox, 'inbox');
  assert.equal(DEFAULT_VAULT_PROFILE.folders.inbox, '00_Inbox');
  assert.equal(DEFAULT_VAULT_PROFILE.folders.projects, '02_Projects');
  assert.equal(DEFAULT_VAULT_PROFILE.folders.knowledge, '03_Knowledge');
});

test('vault profile can override folder roles without changing consumers', () => {
  const profile = createVaultProfile({
    folders: {
      inbox: 'Eingang',
      projects: 'My Projects',
      research: 'Research Notes'
    }
  });

  assert.equal(getFolderRolePath(profile, 'inbox'), 'Eingang');
  assert.equal(getFolderRolePath(profile, 'projects'), 'My Projects');
  assert.equal(getFolderRolePath(profile, 'knowledge'), '03_Knowledge');
  assert.equal(getFolderRolePath(profile, 'research'), 'Research Notes');
});

test('folder role helper joins nested paths safely', () => {
  const profile = createVaultProfile({ folders: { inbox: '/Incoming/' } });

  assert.equal(joinFolderRolePath(profile, 'inbox', 'AI Responses'), 'Incoming/AI Responses');
  assert.equal(joinFolderRolePath(profile, 'archive', '/Trash/'), '99_Archive/Trash');
});

test('unknown folder roles fail clearly', () => {
  assert.throws(() => getFolderRolePath(DEFAULT_VAULT_PROFILE, 'missing'), /Unknown folder role/);
});