'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const helpers = require('../src/shared/vaultProfile/folderVisuals');
const { createVaultProfileState } = require('../src/renderer/vaultProfile/vaultProfileState');

test('Vault Profile state renders a top-level visual only for an assigned role', async () => {
  const state = createVaultProfileState({
    helpers,
    api: { vault: { async getProfile() { return { ok: true, profile: { roles: { projects: 'Creative Work' }, roleVisuals: { projects: { icon: { kind: 'builtin', id: 'star' }, color: { kind: 'token', id: 'orange-400' } } } } }; } } }
  });

  await state.load();

  assert.deepEqual(state.getFolderVisual('Creative Work'), { icon: { kind: 'builtin', id: 'star' }, color: { kind: 'token', id: 'orange-400' } });
  assert.equal(state.getFolderVisual('02_Projects'), null);
  assert.equal(state.getFolderVisual('Creative Work/Alpha'), null);
});

test('Vault Profile state keeps an ephemeral custom SVG source for renderer display', async () => {
  const source = 'data:image/svg+xml;base64,PHN2Zy8+';
  const state = createVaultProfileState({
    helpers,
    api: { vault: { async getProfile() { return { ok: true, profile: {
      roles: { projects: 'Creative Work' },
      roleVisuals: { projects: {
        icon: { kind: 'custom', path: '.vitruvios/icons/custom-a1b2c3.svg', src: source },
        color: { kind: 'token', id: 'violet-600' }
      } }
    } }; } } }
  });

  await state.load();

  assert.deepEqual(state.getFolderVisual('Creative Work'), {
    icon: { kind: 'custom', path: '.vitruvios/icons/custom-a1b2c3.svg', src: source },
    color: { kind: 'token', id: 'violet-600' }
  });
});