'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('search workspace uses a themed app clear control instead of the native search cancel control', () => {
  const workspace = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'search', 'mountSearchWorkspace.js'), 'utf8');
  const styles = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'search.css'), 'utf8');

  assert.match(workspace, /search-clear ui-tool-button/);
  assert.match(workspace, /Clear search/);
  assert.match(workspace, /input\.addEventListener\('input', \(\) => \{ clear\.hidden = !input\.value; \}\)/);
  assert.match(styles, /::-webkit-search-cancel-button/);
  assert.match(styles, /\.search-clear:hover,[\s\S]*?color: var\(--text-accent\)/);
});