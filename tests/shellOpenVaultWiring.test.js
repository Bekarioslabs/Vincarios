'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('open vault buttons are wired after review basket and before provider modules mount', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');
  const mountStart = source.indexOf('const contextState = createContextState();');
  const vaultWire = source.indexOf('wireVaultShell(api, app, contextState, vaultUi, reviewBasket, filesPanelLayout);', mountStart);
  const reviewMount = source.indexOf("mountOptional('review basket'", mountStart);
  const providerMount = source.indexOf("mountOptional('provider status'", mountStart);

  assert.equal(mountStart > -1, true);
  assert.equal(vaultWire > -1, true);
  assert.equal(reviewMount > -1, true);
  assert.equal(providerMount > -1, true);
  assert.equal(reviewMount < vaultWire, true);
  assert.equal(vaultWire < providerMount, true);
});

test('open vault click handler reports missing dependencies instead of being skipped', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');
  const wireStart = source.indexOf('function wireVaultShell');
  const clickHandler = source.indexOf('openButtons.forEach', wireStart);
  const unavailableStatus = source.indexOf("setText(statusBar, 'File panel unavailable.')", wireStart);

  assert.equal(wireStart > -1, true);
  assert.equal(clickHandler > -1, true);
  assert.equal(unavailableStatus > -1, true);
});
test('shell wires one shared Vault Profile state into file, settings, and preset modules', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');

  assert.match(source, /createVaultProfileState\(\{ api \}\)/);
  assert.match(source, /vaultProfileState/);
  assert.match(source, /mountSettingsPanel\(\{ api, app, status: globalStatus, vaultProfileState, themeController \}\)/);
});
