'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { main, bootstrapElectron, shouldBootstrapElectron } = require('../src/main/index.js');

test('scaffold exposes main and Electron bootstrap points', () => {
  assert.equal(main().app, 'vitruvios');
  assert.equal(typeof bootstrapElectron, 'function');
});

test('Electron bootstrap detection stays disabled in normal Node tests', () => {
  assert.equal(shouldBootstrapElectron(), false);
});

test('Electron bootstrap detection supports browser main process and rejects renderer', () => {
  assert.equal(shouldBootstrapElectron({ versions: { electron: '42.4.1' }, type: 'browser' }), true);
  assert.equal(shouldBootstrapElectron({ versions: { electron: '42.4.1' }, type: undefined }), true);
  assert.equal(shouldBootstrapElectron({ versions: { electron: '42.4.1' }, type: 'renderer' }), false);
});
test('theme contract and controller load before shell startup', () => {
  const source = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  const themeContract = source.indexOf('./src/shared/settings/theme.js');
  const controller = source.indexOf('./src/renderer/theme/themeController.js');
  const shell = source.indexOf('./src/renderer/shell/mountShell.js');

  assert.equal(themeContract > -1, true);
  assert.equal(controller > themeContract, true);
  assert.equal(shell > controller, true);
});