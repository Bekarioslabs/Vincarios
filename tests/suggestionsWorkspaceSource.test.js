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
  assert.match(source, /add.disabled = !conversion.canConvertAll/);
  assert.doesNotMatch(source, /api\.vault/);
  assert.doesNotMatch(source, /api\.chat/);
});

test('suggestions group headers use compact category labels and basename targets', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'suggestions', 'mountSuggestionsWorkspace.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'suggestions.css'), 'utf8');
  const icons = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'icons', 'iconRegistry.js'), 'utf8');

  assert.match(source, /formatGroupTargetName/);
  assert.match(source, /return basename\(value\) \|\| title/);
  assert.match(source, /TAG CANDIDATES/);
  assert.match(source, /SIMILAR NOTES/);
  assert.match(source, /renderGroupIcon/);
  assert.match(source, /title\.title = group\.title/);
  assert.match(css, /\.suggestions-group-prefix/);
  assert.match(css, /var\(--icon-accent-filter/);
  assert.match(icons, /metadata: 'file-text\.svg'/);
});
test('suggestions workspace supports visible group selection and clearing selected items', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'suggestions', 'mountSuggestionsWorkspace.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'suggestions.css'), 'utf8');

  assert.match(source, /suggestions-group-check/);
  assert.match(source, /checkbox\.indeterminate/);
  assert.match(source, /setGroupChecked\(group\.id, checkbox\.checked\)/);
  assert.match(source, /Clear selected/);
  assert.match(source, /dismissChecked\(\)/);
  assert.match(source, /countCheckedSuggestions/);
  assert.match(css, /\.suggestions-group-check/);
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

test('suggestions score colors are scoped to score rings', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'mountSelectionActions.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'suggestions.css'), 'utf8');

  assert.match(source, /scoreToneForPercent/);
  assert.match(source, /score >= 90/);
  assert.match(source, /score >= 80/);
  assert.match(source, /score >= 60/);
  assert.match(css, /\.suggestions-score-ring-wrap\.is-score-green/);
  assert.match(css, /\.suggestions-score-ring-wrap\.is-score-yellow/);
  assert.match(css, /\.suggestions-score-ring-wrap\.is-score-orange/);
  assert.match(css, /\.suggestions-score-ring-wrap\.is-score-red/);
});
test('similar notes does not open suggestions workspace for empty result groups', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'mountSelectionActions.js'), 'utf8');

  assert.match(source, /const added = addSimilarNotesSuggestionGroup/);
  assert.match(source, /if \(added\)/);
  assert.match(source, /if \(!items\.length\) return false/);
  assert.match(source, /return true/);
  assert.doesNotMatch(source, /Similar notes found\. Opened Suggestions workspace\.[\s\S]{0,220}if \(!items\.length\)/);
});
test('suggestions detail uses compact info above larger preview slot', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'suggestions', 'mountSuggestionsWorkspace.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'suggestions.css'), 'utf8');

  assert.match(source, /suggestions-detail-info/);
  assert.match(source, /suggestions-preview-slot/);
  assert.match(source, /suggestions-preview-empty/);
  assert.match(source, /No change preview yet/);
  assert.match(css, /\.suggestions-detail-grid/);
  assert.match(css, /grid-template-rows: auto minmax\(0, 1fr\)/);
  assert.match(css, /\.suggestions-detail-info[\s\S]*max-height: 150px/);
  assert.match(css, /\.suggestions-preview-slot/);
});
test('suggestions workspace tab exposes an item count indicator without auto switching', () => {
  const shell = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');

  assert.match(shell, /wireSuggestionIndicator\(app, suggestionState\)/);
  assert.match(shell, /data-suggestions-count/);
  assert.match(shell, /countSuggestionItems/);
  assert.match(css, /\.left-button-count/);
});


test('suggestions workspace loads converter before mount', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const converterIndex = html.indexOf('./src/renderer/suggestions/suggestionConverters.js');
  const mountIndex = html.indexOf('./src/renderer/suggestions/mountSuggestionsWorkspace.js');

  assert.equal(converterIndex > -1, true);
  assert.equal(mountIndex > converterIndex, true);
});

test('suggestions workspace can convert metadata candidates but keeps report-only items disabled', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'suggestions', 'mountSuggestionsWorkspace.js'), 'utf8');

  assert.match(source, /getSuggestionConverters/);
  assert.match(source, /convertCheckedSuggestionsToReviewBasket/);
  assert.match(source, /canConvertAll/);
  assert.match(source, /metadata_candidate/);
});

test('suggestions preview uses the shared diff line renderer', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'suggestions', 'mountSuggestionsWorkspace.js'), 'utf8');

  const rendererIndex = html.indexOf('./src/renderer/diff/diffLineRenderer.js');
  const suggestionsIndex = html.indexOf('./src/renderer/suggestions/mountSuggestionsWorkspace.js');

  assert.equal(rendererIndex > -1, true);
  assert.equal(suggestionsIndex > rendererIndex, true);
  assert.match(source, /getDiffLineRenderer\(\)\.renderDiffLines\(body, diff\)/);
  assert.match(source, /review-diff-body/);
  assert.doesNotMatch(source, /formatDiffPreview/);
});
test('suggestions workspace empty states use compact icon feedback', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'suggestions', 'mountSuggestionsWorkspace.js'), 'utf8');

  assert.match(source, /createEmptyState\('search', 'No suggestions yet\.'/);
  assert.match(source, /createEmptyState\('file', 'Select a suggestion\.'/);
  assert.match(source, /createEmptyState\('warning', 'No change preview yet\.'/);
  assert.match(source, /getIconRenderer/);
  assert.match(source, /empty-state-icon/);
});

test('suggestions score presentation uses real SVG rings instead of pills or meters', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'suggestions', 'mountSuggestionsWorkspace.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'suggestions.css'), 'utf8');

  assert.match(source, /function renderScoreRing\(item, variant\)/);
  assert.match(source, /document\.createElementNS\('http:\/\/www\.w3\.org\/2000\/svg', 'svg'\)/);
  assert.match(source, /suggestions-score-ring-fill/);
  assert.match(source, /strokeDasharray/);
  assert.match(source, /renderSuggestionSignal\(item, 'list'\)/);
  assert.match(source, /renderSuggestionSignal\(item, 'detail'\)/);
  assert.match(source, /if \(hasSimilarityScore\(item\)\) return renderScoreRing\(item, variant\)/);
  assert.doesNotMatch(source, /renderScoreBadge/);
  assert.doesNotMatch(source, /suggestions-item-score-meter/);
  assert.doesNotMatch(css, /suggestions-item-score-meter/);
  assert.doesNotMatch(css, /suggestions-item-score\s*\{/);
  assert.match(css, /.suggestions-score-ring/);
  assert.match(css, /.suggestions-score-ring-fill/);
});


test('suggestions metadata candidates use type badges and icon dismiss controls', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'suggestions', 'mountSuggestionsWorkspace.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'suggestions.css'), 'utf8');

  assert.match(source, /function renderSuggestionSignal\(item, variant\)/);
  assert.match(source, /hasSimilarityScore\(item\)/);
  assert.match(source, /kind \|\| ''\) !== 'similar_note'\) return false/);
  assert.match(source, /return renderTypeBadge\(item, variant\)/);
  assert.match(source, /metadata_candidate'\) return 'TAG'/);
  assert.match(source, /function renderDismissButton\(group, item\)/);
  assert.match(source, /review-basket-remove/);
  assert.match(source, /createIconElement\('close', 'review-remove-icon'\)/);
  assert.match(css, /\.suggestions-type-badge\s*{/);
  assert.match(css, /\.suggestions-item-dismiss\.review-basket-remove\s*{/);
});
