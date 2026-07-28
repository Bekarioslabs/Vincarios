'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('renderer vault paths normalize one relative-path contract', () => {
  const { normalizeRelativePath } = require('../src/renderer/path/vaultPath');

  assert.equal(normalizeRelativePath('  /Folder\\Nested//Note.md/  '), 'Folder/Nested/Note.md');
  assert.equal(normalizeRelativePath(null), '');
});

test('renderer vault path contract loads before its consumers and remains startup-required', () => {
  const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const bootstrap = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'bootstrap.js'), 'utf8');

  const contract = index.indexOf('renderer/path/vaultPath.js');
  const pending = index.indexOf('renderer/context/pendingActionState.js');
  assert.equal(contract > -1, true);
  assert.equal(contract < pending, true);
  assert.match(bootstrap, /VincariosVaultPath[\s\S]*normalizeRelativePath/);
});
test('relative renderer-path consumers delegate to the shared contract', () => {
  const consumers = [
    'src/renderer/cleanup/mountInboxCleanup.js',
    'src/renderer/shell/mountShell.js',
    'src/renderer/review/reviewExecutionController.js',
    'src/renderer/context/pendingActionState.js',
    'src/renderer/context/blockedActionState.js',
    'src/renderer/context/folderContextController.js',
    'src/renderer/suggestions/suggestionConverters.js',
    'src/renderer/selectionActions/folderContextSnapshotAction.js',
    'src/renderer/selectionActions/folderMarkdownScopeReader.js',
    'src/renderer/selectionActions/mountSelectionActions.js',
    'src/renderer/selectionActions/tagCandidateAction.js',
  ];

  for (const relativePath of consumers) {
    const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
    assert.match(source, /VincariosVaultPath[\s\S]*normalizeRelativePath|require\(['"]\.\.\/path\/vaultPath['"]\)/, relativePath);
  }
});