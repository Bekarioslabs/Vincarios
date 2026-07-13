'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PROFILE_RELATIVE_PATH, createVaultFolderVisualService } = require('../src/main/vault/vaultFolderVisualService');

test('folder visuals persist only validated top-level folder choices in vault .zeus profile', () => {
  const root = createTempVault();
  fs.mkdirSync(path.join(root, '00_Inbox'));
  const service = createVaultFolderVisualService();
  assert.equal(service.setRoot(root).ok, true);

  const result = service.setFolderVisual({
    path: '00_Inbox',
    visual: { icon: 'inbox', color: 'amber' }
  });

  assert.deepEqual(result.visuals, { '00_Inbox': { icon: 'inbox', color: 'amber' } });
  const saved = JSON.parse(fs.readFileSync(path.join(root, PROFILE_RELATIVE_PATH), 'utf8'));
  assert.deepEqual(saved.folderVisuals, { '00_Inbox': { icon: 'inbox', color: 'amber' } });
});

test('folder visuals reject dot folders, nested paths, missing folders, and unsupported choices', () => {
  const root = createTempVault();
  fs.mkdirSync(path.join(root, '02_Projects'), { recursive: true });
  fs.mkdirSync(path.join(root, '02_Projects', 'Nested'));
  const service = createVaultFolderVisualService();
  service.setRoot(root);

  assert.equal(service.setFolderVisual({ path: '.obsidian', visual: { icon: 'folder', color: 'amber' } }).code, 'invalid_folder_visual');
  assert.equal(service.setFolderVisual({ path: '02_Projects/Nested', visual: { icon: 'folder', color: 'amber' } }).code, 'invalid_folder_visual');
  assert.equal(service.setFolderVisual({ path: 'Missing', visual: { icon: 'folder', color: 'amber' } }).code, 'folder_not_found');
  assert.equal(service.setFolderVisual({ path: '02_Projects', visual: { icon: 'unknown', color: 'amber' } }).code, 'invalid_folder_visual');
});

test('folder visual clearing preserves future profile fields and removes only the selected override', () => {
  const root = createTempVault();
  fs.mkdirSync(path.join(root, '99_Archive'));
  fs.mkdirSync(path.join(root, '.zeus'));
  fs.writeFileSync(path.join(root, PROFILE_RELATIVE_PATH), JSON.stringify({
    version: 3,
    futureProfileField: 'keep',
    folderVisuals: { '99_Archive': { icon: 'archive', color: 'red' } }
  }));
  const service = createVaultFolderVisualService();
  service.setRoot(root);

  const result = service.clearFolderVisual({ path: '99_Archive' });
  assert.deepEqual(result.visuals, {});
  const saved = JSON.parse(fs.readFileSync(path.join(root, PROFILE_RELATIVE_PATH), 'utf8'));
  assert.equal(saved.futureProfileField, 'keep');
  assert.deepEqual(saved.folderVisuals, {});
});

function createTempVault() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'zeus-folder-visuals-'));
}
