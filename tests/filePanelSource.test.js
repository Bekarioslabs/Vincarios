'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('file rows are not buttons because they contain permission buttons', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'files', 'mountFilePanel.js'), 'utf8');

  assert.doesNotMatch(source, /const row = document\.createElement\('button'\)/);
  assert.match(source, /const row = document\.createElement\('div'\)/);
  assert.match(source, /row\.setAttribute\('role', 'button'\)/);
  assert.match(source, /createPermissionButton/);
});