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
test('file panel renders permission controls before icon and label', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'files', 'mountFilePanel.js'), 'utf8');
  const controlsIndex = source.indexOf('row.appendChild(createPermissionControls(entry.path));');
  const iconIndex = source.indexOf('row.appendChild(icon);');
  const labelIndex = source.indexOf('row.appendChild(label);');

  assert.equal(controlsIndex > -1, true);
  assert.equal(iconIndex > controlsIndex, true);
  assert.equal(labelIndex > iconIndex, true);
});

test('file panel uses ctrl click for known descendant permission application', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'files', 'mountFilePanel.js'), 'utf8');

  assert.match(source, /event\.ctrlKey/);
  assert.match(source, /knownDescendantPaths\(path\)/);
  assert.match(source, /entriesByFolder\.get\(folderPath\)/);
});
test('file panel uses shift click for recursive permission path collection', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'files', 'mountFilePanel.js'), 'utf8');

  assert.match(source, /event\.shiftKey/);
  assert.match(source, /collectRecursivePermissionPaths/);
  assert.match(source, /ensureFolderLoaded\(folderPath\)/);
});
