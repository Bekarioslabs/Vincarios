'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('index loads selection action modules before shell', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const categoriesIndex = source.indexOf('./src/renderer/selectionActions/actionCategories.js');
  const permissionIndex = source.indexOf('./src/renderer/selectionActions/permissionText.js');
  const registryIndex = source.indexOf('./src/renderer/selectionActions/actionRegistry.js');
  const summaryIndex = source.indexOf('./src/renderer/selectionActions/fileSummaryAction.js');
  const similarPresentationIndex = source.indexOf('./src/renderer/selectionActions/similarNotesPresentation.js');
  const mountIndex = source.indexOf('./src/renderer/selectionActions/mountSelectionActions.js');
  const shellIndex = source.indexOf('./src/renderer/shell/mountShell.js');

  assert.equal(categoriesIndex > -1, true);
  assert.equal(permissionIndex > categoriesIndex, true);
  assert.equal(registryIndex > permissionIndex, true);
  assert.equal(summaryIndex > registryIndex, true);
  assert.equal(similarPresentationIndex > summaryIndex, true);
  assert.equal(mountIndex > similarPresentationIndex, true);
  assert.equal(shellIndex > mountIndex, true);
});

test('bootstrap requires selection action renderer modules', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'bootstrap.js'), 'utf8');

  assert.match(source, /ZeusSelectionActionCategories/);
  assert.match(source, /ZeusSelectionActionPermissionText/);
  assert.match(source, /ZeusSelectionActionRegistry/);
  assert.match(source, /ZeusSelectionActions/);
  assert.match(source, /ZeusFileSummaryAction/);
});

test('shell mounts selection action panel with context state', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');

  assert.match(source, /ZeusSelectionActions\.mountSelectionActions/);
  assert.match(source, /contextState/);
  assert.match(source, /reviewBasket/);
  assert.match(source, /suggestionState/);
});

test('context basket renders target-type icons separate from action colors', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'context', 'mountContextBasket.js'), 'utf8');

  assert.match(source, /context-basket-icon/);
  assert.match(source, /targetIconFor/);
  assert.match(source, /MD/);
});
test('file panel exposes revealFolder for context basket folder items', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'files', 'mountFilePanel.js'), 'utf8');

  assert.match(source, /async function revealFolder/);
  assert.match(source, /revealFolder,/);
  assert.match(source, /contextState\.setFolder/);
});
test('context basket labels use compact basename while keeping full path in title', () => {
  const basket = require('../src/renderer/context/mountContextBasket');

  assert.equal(basket.formatItemLabel({ kind: 'file', path: '02_Projects/StarLu/Tasks.md' }), 'Tasks.md');
  assert.equal(basket.formatItemLabel({ kind: 'folder', path: '02_Projects/StarLu' }), 'StarLu');
  assert.equal(basket.formatItemTitle({ kind: 'file', path: '02_Projects/StarLu/Tasks.md' }), '02_Projects/StarLu/Tasks.md');
});
test('list folder messages expose a whole-tree follow-up through the folder controller', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'mountSelectionActions.js'), 'utf8');

  assert.match(source, /Check whole tree/);
  assert.match(source, /appendActionMessage\(formatFolderListing\(snapshot\.path, result\),/);
  assert.match(source, /listFolderTree/);
  assert.match(source, /formatRecursiveFolderListing/);
  assert.match(source, /chat-message-actions/);
  assert.match(source, /chat-message-action-button/);
  assert.doesNotMatch(source, /chat-message-action';/);
});

test('summarize file uses the dedicated summary action module and provider API', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'mountSelectionActions.js'), 'utf8');

  assert.match(source, /file\.summarize/);
  assert.match(source, /summarizeFile/);
  assert.match(source, /buildFileSummaryMessages/);
  assert.match(source, /api\.chat\.send/);
  assert.match(source, /ZeusChat\.appendMessage/);
});

test('provider-backed selection actions use removable pending action messages', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'mountSelectionActions.js'), 'utf8');

  assert.match(source, /appendActionMessage\('Summarizing file: ' \+ request\.path, \[\], \{ pending: true \}\)/);
  assert.match(source, /chat-message-pending/);
  assert.match(source, /removeNode\(pending\)/);
});
test('folder analyze action is wired to the folder analysis handler', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'mountSelectionActions.js'), 'utf8');

  assert.match(source, /action\.id === 'folder\.analyze'/);
  assert.match(source, /analyzeFolder\(snapshot\)/);
  assert.match(source, /formatFolderAnalysis\(snapshot\.path, result\)/);
});
test('folder markdown summary action is loaded and wired through the selection action panel', () => {
  const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'mountSelectionActions.js'), 'utf8');

  assert.equal(index.includes('./src/renderer/selectionActions/folderSummaryAction.js'), true);
  assert.match(source, /folder\.summarizeMarkdown/);
  assert.match(source, /summarizeFolderMarkdown\(snapshot\)/);
  assert.match(source, /buildFolderMarkdownSummaryMessages/);
  assert.match(source, /api\.vault\.readMarkdown/);
});
test('summary title builder uses target type tokens for files and folders', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'mountSelectionActions.js'), 'utf8');

  assert.match(source, /Summary - ' \+ normalizeSummaryKind\(kind\) \+ ' - /);
  assert.match(source, /if \(value === 'md'\) return 'MD'/);
  assert.match(source, /if \(value === 'dir'\) return 'DIR'/);
});
test('provider-backed selection summary results pass review basket into saveable chat messages', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'mountSelectionActions.js'), 'utf8');

  assert.match(source, /const reviewBasket = options\.reviewBasket/);
  assert.match(source, /reviewBasket: reviewBasket/);
  assert.match(source, /suggestedTitle: buildSummaryTitle\('md', request\.path\)/);
  assert.match(source, /suggestedTitle: buildSummaryTitle\('dir', snapshot\.path\)/);
  assert.match(source, /responseSubfolder: 'Summaries'/);
});
test('propose update uses the selected update proposal builder from selection actions', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'mountSelectionActions.js'), 'utf8');

  assert.match(source, /file\.proposeUpdate/);
  assert.match(source, /proposeFileUpdate\(snapshot, instruction\)/);
  assert.match(source, /buildSelectedFileUpdateMessages/);
  assert.match(source, /parseSelectedFileUpdateProposal/);
  assert.match(source, /reviewBasket\.addProposal\(proposal\.proposal\)/);
});
test('propose update uses an inline instruction form instead of browser prompt', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'mountSelectionActions.js'), 'utf8');

  assert.match(source, /renderUpdateInstructionForm\(snapshot\)/);
  assert.match(source, /selection-action-form/);
  assert.match(source, /textarea/);
  assert.match(source, /Create proposal/);
  assert.match(source, /Content update instruction/);
  assert.match(source, /Rename\/move are not part of this action/);
  assert.doesNotMatch(source, /window\.prompt/);
});

test('propose update reports provider parser and review basket diagnostics', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'mountSelectionActions.js'), 'utf8');

  assert.match(source, /formatUpdateProposalDiagnostics\(request, 'provider'/);
  assert.match(source, /formatUpdateProposalDiagnostics\(request, 'parser'/);
  assert.match(source, /formatUpdateProposalDiagnostics\(request, 'review_basket'/);
  assert.match(source, /Current chars:/);
  assert.match(source, /Context truncated:/);
});


test('propose update stays clickable so missing permissions can show app guidance', () => {
  const registry = require('../src/renderer/selectionActions/actionRegistry');
  const actions = registry.getSelectionActions({
    kind: 'file',
    path: 'Notes/Test.md',
    content: '# Test',
    readAllowed: true,
    writeAllowed: false
  });
  const update = actions.find((action) => action.id === 'file.proposeUpdate');

  assert.equal(update.enabled, true);
  assert.equal(update.requiredPermission, 'write');
  assert.equal(update.softDisabled, true);
});
test('propose update routes missing W through permission guidance without retry action', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'mountSelectionActions.js'), 'utf8');

  assert.match(source, /createMissingPermissionAction/);
  assert.match(source, /missingPermissionMessage/);
  assert.match(source, /createMissingPermissionAction\(snapshot, 'write', 'file.proposeUpdate'\)/);
  assert.doesNotMatch(source, /formatBlockedActionRetryLabel/);
  assert.doesNotMatch(source, /retrySelectionAction/);
});

test('propose update soft-disabled state is visual only', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'mountSelectionActions.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');

  assert.match(source, /action\.softDisabled/);
  assert.match(source, /is-soft-disabled/);
  assert.match(source, /aria-disabled/);
  assert.match(css, /\.selection-action-button\.is-soft-disabled/);
});
test('soft-disabled actions route through missing permission guidance', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'mountSelectionActions.js'), 'utf8');

  assert.match(source, /if \(action\.softDisabled\)/);
  assert.match(source, /createSoftDisabledActionGate\(action, snapshot\)/);
  assert.match(source, /appendMissingPermissionMessage\(gate, action\.id\)/);
});
test('find similar notes action routes details to suggestions workspace', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'mountSelectionActions.js'), 'utf8');

  assert.match(source, /file\.findSimilar/);
  assert.match(source, /renderSimilarNotesForm\(snapshot\)/);
  assert.match(source, /api\.embeddings\.findSimilarNotes/);
  assert.match(source, /addSimilarNotesSuggestionGroup/);
  assert.match(source, /suggestionState\.addGroup/);
  assert.doesNotMatch(source, /workspaceState\.setActiveWorkspace\('suggestions'\)/);
  assert.match(source, /Similar notes found\. Suggestions updated\./);
  assert.doesNotMatch(source, /renderSimilarNotesResultsPanel/);
  assert.doesNotMatch(source, /formatSimilarNotesReport/);
  assert.doesNotMatch(source, /file\.findSimilar[\s\S]{0,240}reviewBasket\.addProposal/);
});


test('find similar notes opens a settings-backed mini form', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'mountSelectionActions.js'), 'utf8');

  assert.match(source, /renderSimilarNotesForm\(snapshot\)/);
  assert.match(source, /let similarNotesSessionOptions = null/);
  assert.equal(source.includes('function normalizePercent(value, fallback)'), true);
  assert.equal(source.indexOf('function normalizePercent(value, fallback)') < source.indexOf('function wireSimilarWeightSlider'), true);
  assert.match(source, /loadSimilarNotesDefaults/);
  assert.match(source, /api.settings.get/);
  assert.match(source, /data-similar-mode/);
  assert.match(source, /data-similar-min/);
  assert.match(source, /data-similar-content-weight/);
  assert.match(source, /data-similar-refresh-index/);
  assert.match(source, /addSimilarNotesSuggestionGroup/);
  assert.doesNotMatch(source, /reviewBasket.addProposal[sS]{0,500}file.findSimilar/);
});
