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
  assert.match(source, /wrapper\.classList\.toggle\('is-expanded'/);
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

test('file panel passes write permission into selected context details', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'files', 'mountFilePanel.js'), 'utf8');

  assert.match(source, /writeAllowed: canUsePathAsUpdateTarget\(path\)/);
  assert.match(source, /function canUsePathAsUpdateTarget/);
  assert.match(source, /permissionState\.resolve\(path\)\.write === true/);
});
test('file panel focuses rows before activation so keyboard navigation can continue', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'files', 'mountFilePanel.js'), 'utf8');

  assert.match(source, /focusTreeRow\(row\);\s*activateEntry\(entry\)/);
  assert.match(source, /focusRenderedPath\(entry\.path\)/);
});
test('file panel exposes a shell-owned collapse control and expands for explicit reveal actions', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'files', 'mountFilePanel.js'), 'utf8');

  assert.match(source, /const onToggleCollapse = typeof options\.onToggleCollapse === 'function' \? options\.onToggleCollapse : null/);
  assert.match(source, /data-files-collapse-toggle/);
  assert.match(source, /collapseButton\.addEventListener\('click', \(\) => \{/);
  assert.match(source, /function setCollapsed\(collapsed\)/);
  assert.match(source, /onRequestExpand\(\);/);
  assert.match(source, /setCollapsed,/);
});
test('file panel uses semantic icon renderer for tree and refresh icons', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'files', 'mountFilePanel.js'), 'utf8');

  assert.match(source, /attachRefreshIcon/);
  assert.match(source, /createFileRowIcon/);
  assert.match(source, /function getIconRenderer/);
  assert.match(source, /function isMarkdownPath/);
  assert.match(source, /function getFolderVisual\(path\)/);
  assert.match(source, /function resolveFolderVisualIconName\(visual\)/);
  assert.match(source, /createIconElement\(resolveFolderVisualIconName\(visual\), 'file-row-type-icon'\)/);
  assert.match(source, /'markdownFile'/);
  assert.match(source, /'chevronRight'/);
  assert.match(source, /'chevronDown'/);
});
test('file panel supports focused-row R and W permission hotkeys only through file tree rows', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'files', 'mountFilePanel.js'), 'utf8');

  assert.match(source, /handlePermissionHotkey\(event, entry\)/);
  assert.match(source, /event\.key\.toLowerCase\(\)/);
  assert.match(source, /event\.target\.closest\('\.file-row'\)/);
  assert.match(source, /togglePermission\(entry\.path, 'read'/);
  assert.match(source, /togglePermission\(entry\.path, 'write'/);
  assert.doesNotMatch(source, /document\.addEventListener\('keydown'.*togglePermission/s);
});
test('file panel exposes a targeted refresh for the currently loaded Markdown preview', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'files', 'mountFilePanel.js'), 'utf8');

  assert.equal(source.includes('async function refreshLoadedMarkdown(path)'), true);
  assert.equal(source.includes('previewController.getCurrentPath()'), true);
  assert.equal(source.includes('previewController.setSource(content, path, behavior)'), true);
  assert.match(source, /recordHistory: false/);
  assert.match(source, /refreshLoadedMarkdown,/);
});

test('file panel supports F2 Rename Light through the vault API only', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'files', 'mountFilePanel.js'), 'utf8');

  assert.match(source, /event\.key === 'F2'/);
  assert.match(source, /startInlineRename\(entry, row, label\)/);
  assert.match(source, /api\.vault\.renameFile\(\{ sourcePath: entry\.path, newName: nextName \}\)/);
  assert.match(source, /Links were not updated in V1/);
  assert.doesNotMatch(source, /fs\.rename/);
});
test('file panel treats selected image files as image selections instead of Markdown reads', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'files', 'mountFilePanel.js'), 'utf8');

  assert.match(source, /entry\.kind === 'image'/);
  assert.match(source, /Image file selected/);
  assert.match(source, /Image selected:/);
  assert.match(source, /createIconElement\(entry\.kind === 'image' \? 'image'/);
});

test('file panel applies update flash through visible row state without rebuilding the tree', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'files', 'mountFilePanel.js'), 'utf8');

  assert.match(source, /const updateFlashState = options\.updateFlashState \|\| null/);
  assert.match(source, /const visibleRows = new Map\(\)/);
  assert.match(source, /function subscribeToUpdateFlashState\(\)/);
  assert.match(source, /visibleRows\.forEach\(\(row, path\) => \{/);
  assert.match(source, /row\.classList\.toggle\('is-recently-updated', updateFlashState\.isFlashing\(path\)\)/);
  assert.match(source, /function flashPath\(path\)/);
  assert.match(source, /updateFlashState\.flashTargets\(\{ path, kind: 'file', reason: 'updated' \}\)/);
});

test('file panel renders folder appearance from shared Vault Profile state without configuration controls', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'files', 'mountFilePanel.js'), 'utf8');

  assert.match(source, /const vaultProfileState = options\.vaultProfileState \|\| null/);
  assert.match(source, /function subscribeToVaultProfileState\(\)/);
  assert.match(source, /vaultProfileState\.getFolderVisual\(path\)/);
  assert.doesNotMatch(source, /contextmenu/);
  assert.doesNotMatch(source, /FolderAppearance/);
});
