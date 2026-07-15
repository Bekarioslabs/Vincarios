'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PROFILE_RELATIVE_PATH, createVaultProfileService } = require('../src/main/vault/vaultProfileService');

test('vault profile detects only existing standard roots and keeps foreign vault roles unassigned', () => {
  const standardRoot = createTempVault();
  fs.mkdirSync(path.join(standardRoot, '00_Inbox'));
  fs.mkdirSync(path.join(standardRoot, '02_Projects'));
  const standard = createVaultProfileService();
  standard.setRoot(standardRoot);

  assert.deepEqual(standard.getProfile().profile.roles, { inbox: '00_Inbox', projects: '02_Projects' });

  const foreignRoot = createTempVault();
  fs.mkdirSync(path.join(foreignRoot, 'Creative Work'));
  const foreign = createVaultProfileService();
  foreign.setRoot(foreignRoot);
  assert.deepEqual(foreign.getProfile().profile.roles, {});
});

test('vault profile assigns canonical top-level folders and role visuals through one portable record', () => {
  const root = createTempVault();
  fs.mkdirSync(path.join(root, 'Creative Work'));
  const service = createVaultProfileService();
  service.setRoot(root);

  const result = service.setRole({
    role: 'projects',
    folderPath: 'creative work',
    visual: { icon: { kind: 'builtin', id: 'briefcase' }, color: { kind: 'token', id: 'violet-400' } }
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.profile.roles, { projects: 'Creative Work' });
  assert.deepEqual(result.profile.roleVisuals, { projects: { icon: { kind: 'builtin', id: 'briefcase' }, color: { kind: 'token', id: 'violet-400' } } });
  const saved = JSON.parse(fs.readFileSync(path.join(root, PROFILE_RELATIVE_PATH), 'utf8'));
  assert.deepEqual(saved.roles, { projects: 'Creative Work' });
  assert.deepEqual(saved.roleVisuals, { projects: { icon: { kind: 'builtin', id: 'briefcase' }, color: { kind: 'token', id: 'violet-400' } } });
});

test('vault profile prevents one folder from being assigned to two roles and reset restores detected defaults', () => {
  const root = createTempVault();
  fs.mkdirSync(path.join(root, '00_Inbox'));
  const service = createVaultProfileService();
  service.setRoot(root);

  assert.equal(service.setRole({ role: 'projects', folderPath: '00_Inbox' }).code, 'folder_role_conflict');
  assert.equal(service.setRole({ role: 'inbox', folderPath: '' }).ok, true);
  assert.deepEqual(service.getProfile().profile.roles, {});
  assert.equal(service.resetRole({ role: 'inbox' }).ok, true);
  assert.deepEqual(service.getProfile().profile.roles, { inbox: '00_Inbox' });
});

test('vault profile migrates legacy path-keyed folder visuals when they match a detected default role', () => {
  const root = createTempVault();
  fs.mkdirSync(path.join(root, '99_Archive'));
  fs.mkdirSync(path.join(root, '.vitruvios'));
  fs.writeFileSync(path.join(root, PROFILE_RELATIVE_PATH), JSON.stringify({
    version: 1,
    futureProfileField: 'keep',
    folderVisuals: { '99_Archive': { icon: { kind: 'builtin', id: 'star' }, color: { kind: 'token', id: 'orange-400' } } }
  }));
  const service = createVaultProfileService();
  service.setRoot(root);

  assert.deepEqual(service.getProfile().profile.roleVisuals, { archive: { icon: { kind: 'builtin', id: 'star' }, color: { kind: 'token', id: 'orange-400' } } });
  service.setRole({ role: 'archive', folderPath: '99_Archive' });
  const saved = JSON.parse(fs.readFileSync(path.join(root, PROFILE_RELATIVE_PATH), 'utf8'));
  assert.equal(saved.futureProfileField, 'keep');
  assert.equal(saved.folderVisuals, undefined);
  assert.deepEqual(saved.roleVisuals, { archive: { icon: { kind: 'builtin', id: 'star' }, color: { kind: 'token', id: 'orange-400' } } });
});

function createTempVault() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vitruvios-vault-profile-'));
}
test('vault profile lists only safe local SVG icons from the portable icon folder', () => {
  const root = createTempVault();
  const iconRoot = path.join(root, '.vitruvios', 'icons');
  fs.mkdirSync(iconRoot, { recursive: true });
  fs.writeFileSync(path.join(iconRoot, 'briefcase.svg'), '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>');
  fs.writeFileSync(path.join(iconRoot, 'unsafe.svg'), '<svg><script>alert(1)</script></svg>');
  fs.writeFileSync(path.join(iconRoot, 'note.txt'), 'not an icon');
  const service = createVaultProfileService();
  service.setRoot(root);

  const result = service.listLocalIcons();

  assert.equal(result.ok, true);
  assert.equal(result.icons.length, 1);
  assert.equal(result.icons[0].path, '.vitruvios/icons/briefcase.svg');
  assert.match(result.icons[0].src, /^data:image\/svg\+xml;base64,/);
});
test('vault profile persists a normalized appearance theme override', () => {
  const root = createTempVault();
  const service = createVaultProfileService();
  service.setRoot(root);

  const result = service.setAppearance({ themeOverride: 'light' });

  assert.equal(result.ok, true);
  assert.equal(result.profile.appearance.themeOverride, 'light');
  const saved = JSON.parse(fs.readFileSync(path.join(root, PROFILE_RELATIVE_PATH), 'utf8'));
  assert.equal(saved.appearance.themeOverride, 'light');
  assert.equal(service.setAppearance({ themeOverride: 'system' }).profile.appearance.themeOverride, 'inherit');
});