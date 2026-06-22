'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { main } = require('../src/main/index.js');
const { bootstrapZeus } = require('../src/renderer/bootstrap.js');

test('scaffold exposes main and renderer bootstrap points', () => {
  assert.equal(main().app, 'ZEUS Agent');
  assert.equal(bootstrapZeus().app, 'ZEUS Agent');
});
