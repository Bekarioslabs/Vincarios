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

test('file panel uses ctrl click for visible descendant permission application', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'files', 'mountFilePanel.js'), 'utf8');

  assert.match(source, /event\.ctrlKey/);
  assert.match(source, /knownVisibleDescendantPaths\(path\)/);
  assert.match(source, /navigator\.isExpanded\(entry\.path\)/);
});
test('file panel uses shift click for recursive permission path collection', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'files', 'mountFilePanel.js'), 'utf8');

  assert.match(source, /event\.shiftKey/);
  assert.match(source, /collectRecursivePermissionPaths/);
  assert.match(source, /ensureFolderLoaded\(folderPath\)/);
});

test('file panel refresh preserves navigator state instead of reopening root', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'files', 'mountFilePanel.js'), 'utf8');

  assert.match(source, /async function refreshTree\(\)/);
  assert.match(source, /refreshButton\.addEventListener\('click', refreshTree\)/);
  assert.match(source, /refreshTree,/);
  assert.doesNotMatch(source, /refreshButton\.addEventListener\('click', async \(\) => \{\s*entriesByFolder\.clear\(\);\s*await openRoot\(\);\s*\}\);/);
});

test('file panel source avoids mojibake-prone inline icon glyphs', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'files', 'mountFilePanel.js'), 'utf8');

  assert.doesNotMatch(source, new RegExp(String.fromCharCode(65533)));
  assert.doesNotMatch(source, /\u00e2|\u2022/);
  assert.match(source, /icon\.classList\.toggle\('is-expanded'/);
  assert.doesNotMatch(source, /icon\.textContent = entry\.kind === 'folder'/);
});
test('file panel gates selected Markdown chat context through read permission', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'files', 'mountFilePanel.js'), 'utf8');

  assert.match(source, /function createContextDetails/);
  assert.match(source, /function canUsePathAsContext/);
  assert.match(source, /permissionState\.resolve\(path\)\.read === true/);
  assert.match(source, /contextState\.setFile\(read\.path, createContextDetails\(read\.path, read\.content\)\)/);
});
test('file panel keeps loaded preview content and resyncs read permission for active context', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'files', 'mountFilePanel.js'), 'utf8');

  assert.match(source, /readAllowed: canUsePathAsContext\(path\)/);
  assert.match(source, /function updatePermissionButtonState/);
  assert.match(source, /function syncSelectedContextPermission/);
  assert.match(source, /syncSelectedContextPermission\(\)/);
});