'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('suggestions workspace renderer module is loaded before shell', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const stateIndex = html.indexOf('./src/renderer/suggestions/suggestionState.js');
  const mountIndex = html.indexOf('./src/renderer/suggestions/mountSuggestionsWorkspace.js');
  const shellIndex = html.indexOf('./src/renderer/shell/mountShell.js');

  assert.equal(mountIndex > stateIndex, true);
  assert.equal(shellIndex > mountIndex, true);
});

test('suggestions workspace renderer owns list detail and disabled conversion UI', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'suggestions', 'mountSuggestionsWorkspace.js'), 'utf8');

  assert.match(source, /mountSuggestionsWorkspace/);
  assert.match(source, /suggestions-workspace-empty/);
  assert.match(source, /suggestions-item/);
  assert.match(source, /suggestions-detail/);
  assert.match(source, /Add selected to Review Basket/);
  assert.match(source, /disabled = true/);
  assert.doesNotMatch(source, /api\.vault/);
  assert.doesNotMatch(source, /api\.chat/);
});

test('suggestions workspace styles use dedicated layout classes', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'suggestions.css'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const layout = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');

  assert.match(css, /\.suggestions-workspace\s*\{/);
  assert.match(css, /\.suggestions-list\s*\{/);
  assert.match(css, /\.suggestions-detail\s*\{/);
  assert.match(css, /\.suggestions-item\.is-selected/);
});

test('shell wires workspace tabs and mounts suggestions without touching vault panel', () => {
  const shell = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');

  assert.match(shell, /data-workspace-tab="chat"/);
  assert.match(shell, /data-workspace-tab="suggestions"/);
  assert.match(shell, /data-workspace-panel="chat"/);
  assert.match(shell, /data-workspace-panel="suggestions"/);
  assert.match(shell, /createWorkspaceState/);
  assert.match(shell, /createSuggestionState/);
  assert.match(shell, /mountSuggestionsWorkspace/);
  assert.match(shell, /selection-actions-pane/);
  assert.match(shell, /preview-pane/);
});

test('suggestions workspace hides empty dismissed groups and keeps nested paths readable', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'suggestions', 'mountSuggestionsWorkspace.js'), 'utf8');

  assert.match(source, /visibleGroups/);
  assert.match(source, /item\.dismissed !== true/);
  assert.match(source, /formatSuggestionName/);
  assert.match(source, /formatSuggestionParent/);
  assert.match(source, /row\.title = item\.path \|\| item\.title/);
});

test('suggestions score colors are scoped to score badges', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'mountSelectionActions.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'suggestions.css'), 'utf8');

  assert.match(source, /scoreToneForPercent/);
  assert.match(source, /score >= 90/);
  assert.match(source, /score >= 80/);
  assert.match(source, /score >= 60/);
  assert.match(css, /\.suggestions-item-score\.is-score-green/);
  assert.match(css, /\.suggestions-item-score\.is-score-yellow/);
  assert.match(css, /\.suggestions-item-score\.is-score-orange/);
  assert.match(css, /\.suggestions-item-score\.is-score-red/);
});
test('similar notes does not open suggestions workspace for empty result groups', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'mountSelectionActions.js'), 'utf8');

  assert.match(source, /const added = addSimilarNotesSuggestionGroup/);
  assert.match(source, /if \(added\)/);
  assert.match(source, /if \(!items\.length\) return false/);
  assert.match(source, /return true/);
  assert.doesNotMatch(source, /Similar notes found\. Opened Suggestions workspace\.[\s\S]{0,220}if \(!items\.length\)/);
});