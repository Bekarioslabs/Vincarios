'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Inter variable font is bundled locally with license notice', () => {
  const root = path.join(__dirname, '..');
  const fontPath = path.join(root, 'src', 'renderer', 'assets', 'fonts', 'InterVariable.woff2');
  const licensePath = path.join(root, 'third_party', 'inter', 'LICENSE.txt');

  assert.equal(fs.existsSync(fontPath), true);
  assert.equal(fs.existsSync(licensePath), true);
  assert.match(fs.readFileSync(licensePath, 'utf8'), /SIL OPEN FONT LICENSE/);
});

test('tokens css bundles Inter but keeps system font active by default', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'tokens.css'), 'utf8');

  assert.match(css, /@font-face/);
  assert.match(css, /InterVariable\.woff2/);
  assert.match(css, /--font-interface:\s*'Segoe UI'/);
});