'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ICONS } = require('../src/renderer/icons/iconRegistry');

test('Lucide icons are bundled locally with license notice', () => {
  const root = path.join(__dirname, '..');
  const licensePath = path.join(root, 'third_party', 'lucide', 'LICENSE');

  assert.equal(fs.existsSync(licensePath), true);
  assert.match(fs.readFileSync(licensePath, 'utf8'), /ISC License/);

  Object.values(ICONS).forEach((fileName) => {
    const iconPath = path.join(root, 'src', 'renderer', 'assets', 'icons', 'lucide', fileName);
    assert.equal(fs.existsSync(iconPath), true, fileName + ' must exist');
    assert.match(fs.readFileSync(iconPath, 'utf8'), /<svg/);
  });
});

test('icon registry exposes semantic app icon names instead of raw UI usage names', () => {
  assert.equal(ICONS.folder, 'folder.svg');
  assert.equal(ICONS.markdownFile, 'file-text.svg');
  assert.equal(ICONS.save, 'save.svg');
  assert.equal(ICONS.copy, 'copy.svg');
  assert.equal(ICONS.warning, 'triangle-alert.svg');
  assert.equal(ICONS.lock, 'lock.svg');
  assert.equal(ICONS.plug, 'plug.svg');
  assert.equal(ICONS.send, 'arrow-up.svg');
});
test('bundled SVG icons do not contain visible escaped newline literals', () => {
  const root = path.join(__dirname, '..');
  Object.values(ICONS).forEach((fileName) => {
    const iconPath = path.join(root, 'src', 'renderer', 'assets', 'icons', 'lucide', fileName);
    const source = fs.readFileSync(iconPath, 'utf8');
    assert.equal(source.includes('`r`n'), false, fileName + ' must not contain visible escaped newlines');
  });
});
