'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { main, bootstrapElectron, shouldBootstrapElectron } = require('../src/main/index.js');

test('scaffold exposes main and Electron bootstrap points', () => {
  assert.equal(main().app, 'ZEUS Agent');
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