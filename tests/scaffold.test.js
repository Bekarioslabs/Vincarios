'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { main, bootstrapElectron } = require('../src/main/index.js');

test('scaffold exposes main and Electron bootstrap points', () => {
  assert.equal(main().app, 'ZEUS Agent');
  assert.equal(typeof bootstrapElectron, 'function');
});