'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('startup screen displays the version from app metadata instead of a renderer constant', () => {
  const shell = read('src/renderer/shell/mountShell.js');
  const css = read('src/renderer/styles/startup.css');

  assert.match(shell, /data-start-version/);
  assert.match(shell, /\[data-start-version\][\s\S]{0,120}info\.version/);
  assert.match(css, /\.start-version\s*\{/);
});