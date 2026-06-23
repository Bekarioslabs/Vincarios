'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('collapsible left subactions preserve hidden state despite flex layout', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');

  assert.match(css, /\.left-subactions\s*\{[\s\S]*display:\s*flex;/);
  assert.match(css, /\.left-subactions\[hidden\]\s*\{\s*display:\s*none;\s*\}/);
});
test('permission buttons have explicit inactive and active styling', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'files.css'), 'utf8');

  assert.match(css, /\.file-permission-controls\s*\{/);
  assert.match(css, /\.file-permission-button\s*\{/);
  assert.match(css, /\.file-permission-button\.is-active\s*\{/);
});
