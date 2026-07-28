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

  assert.match(source, /VincariosSelectionActionCategories/);
  assert.match(source, /VincariosSelectionActionPermissionText/);
  assert.match(source, /VincariosSelectionActionRegistry/);
  assert.match(source, /VincariosSelectionActions/);
  assert.match(source, /VincariosFileSummaryAction/);
  assert.match(source, /VincariosFolderScopeOptions/);
  assert.match(source, /VincariosSummaryResponsePresentation/);
  assert.match(source, /VincariosFolderScopeForm/);
  assert.match(source, /VincariosFolderMarkdownScopeReader/);
  assert.match(source, /VincariosFolderContextSnapshotAction/);
});

test('shell mounts selection action panel with context state', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');

  assert.match(source, /VincariosSelectionActions\.mountSelectionActions/);
  assert.match(source, /contextState/);
  assert.match(source, /reviewBasket/);
  assert.match(source, /suggestionState/);
  assert.match(source, /onRequestPanelExpand/);
  assert.match(source, /closeOpenForms/);
  assert.match(source, /Could not save layout preference\./);
  assert.match(source, /function wireFilesPanelLayout/);
  assert.match(source, /const filesPanelLayout = wireFilesPanelLayout/);
  assert.match(source, /onToggleCollapse: filesPanelLayout && filesPanelLayout\.toggle/);
  assert.match(source, /onRequestExpand: filesPanelLayout && filesPanelLayout\.requestExpand/);
  assert.match(source, /async function persistPanelLayoutPreference\(api, panelLayoutState, status\) \{[\s\S]*try \{[\s\S]*catch \(error\)/);
  assert.match(source, /class="selection-actions-content"/);
});

test('selection action renderer keeps the shell-owned panel header outside its dynamic content root', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'mountSelectionActions.js'), 'utf8');

  assert.match(source, /querySelector\('\.selection-actions-content'\)/);
  assert.doesNotMatch(source, /querySelector\('\.selection-actions-pane'\)/);
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
test('folder inspection exposes the bounded tree follow-up through the folder controller', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'mountSelectionActions.js'), 'utf8');

  assert.match(source, /Check whole tree/);
  assert.match(source, /inspectFolderTree/);
  assert.match(source, /maxDepth: options\.maxDepth/);
  assert.match(source, /maxListedFiles: options\.maxFiles/);
  assert.match(source, /buildFolderTreeInspectionReport/);
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
  assert.match(source, /VincariosChat\.appendMessage/);
});

test('provider-backed selection actions use removable pending action messages', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'mountSelectionActions.js'), 'utf8');

  assert.match(source, /appendActionMessage\('Summarizing file: ' \+ request\.path, \[\], \{ pending: true \}\)/);
  assert.match(source, /chat-message-pending/);
  assert.match(source, /removeNode\(pending\)/);
});
test('folder inspect action opens a bounded scope form and uses the shared inspection renderer', () => {
  const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const registry = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'actionRegistry.js'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'mountSelectionActions.js'), 'utf8');

  assert.equal(index.includes('./src/renderer/selectionActions/folderScopeOptions.js'), true);
  assert.equal(index.includes('./src/renderer/selectionActions/folderInspectAction.js'), true);
  assert.match(registry, /id: 'folder\.inspect'/);
  assert.doesNotMatch(registry, /id: 'folder\.listCurrent'/);
  assert.doesNotMatch(registry, /id: 'folder\.analyze'/);
  assert.match(source, /renderFolderInspectForm\(snapshot, host\)/);
  assert.match(source, /normalizeFolderScopeOptions/);
  assert.match(source, /buildFolderInspectionReport/);
  assert.match(source, /buildFolderTreeInspectionReport/);
});
test('folder markdown summary action is loaded and wired through the selection action panel', () => {
  const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'mountSelectionActions.js'), 'utf8');

  assert.equal(index.includes('./src/renderer/selectionActions/folderSummaryAction.js'), true);
  assert.match(source, /folder\.summarizeMarkdown/);
  assert.match(source, /renderFolderSummaryForm\(snapshot, host\)/);
  assert.match(source, /summarizeFolderMarkdown\(snapshot, scopeOptions\)/);
  assert.match(source, /listScopedMarkdownFiles/);
  assert.match(source, /scope,/);
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
  const mountSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'mountSelectionActions.js'), 'utf8');
  const formSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'updateInstructionForm.js'), 'utf8');

  assert.match(mountSource, /renderUpdateInstructionForm\(snapshot, host\)/);
  assert.match(mountSource, /mountUpdateInstructionForm/);
  assert.match(formSource, /selection-action-form/);
  assert.match(formSource, /textarea/);
  assert.match(formSource, /Create proposal/);
  assert.match(formSource, /Content update instruction/);
  assert.match(formSource, /Rename\/move are not part of this action/);
  assert.doesNotMatch(formSource, /window\.prompt/);
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
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'selectionActions.css'), 'utf8');

  assert.match(source, /action\.softDisabled/);
  assert.match(source, /is-soft-disabled/);
  assert.match(source, /aria-disabled/);
  assert.match(source, /renderSoftDisabledLock/);
  assert.match(source, /selection-action-lock-icon/);
  assert.doesNotMatch(source, /selection-actions-target/);
  assert.match(source, /createIconElement\('lock', 'selection-action-lock-icon'\)/);
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
  assert.match(source, /renderSimilarNotesForm\(snapshot, host\)/);
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
  const mountSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'mountSelectionActions.js'), 'utf8');
  const formSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'similarNotesForm.js'), 'utf8');

  assert.match(mountSource, /renderSimilarNotesForm\(snapshot, host\)/);
  assert.match(mountSource, /let similarNotesSessionOptions = null/);
  assert.match(mountSource, /getSimilaritySourceOptions/);
  assert.match(mountSource, /loadSimilarNotesDefaults/);
  assert.match(mountSource, /api.settings.get/);
  assert.match(formSource, /data-similar-source/);
  assert.match(formSource, /data-similar-min/);
  assert.doesNotMatch(formSource, /data-similar-content-weight/);
  assert.match(formSource, /data-similar-refresh-index/);
  assert.match(formSource, /data-similar-scope/);
  assert.match(formSource, /Relevant area/);
  assert.match(formSource, /normalizeSimilarNotesFormOptions/);
  assert.match(mountSource, /createActionRow/);
  assert.match(mountSource, /selection-action-row/);
  assert.match(formSource, /host\.appendChild\(form\)/);
  assert.match(mountSource, /addSimilarNotesSuggestionGroup/);
  assert.doesNotMatch(mountSource, /reviewBasket.addProposal[sS]{0,500}file.findSimilar/);
});

test('similar note suggestions carry numeric scores for workspace presentation', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'mountSelectionActions.js'), 'utf8');

  assert.match(source, /scorePercent: candidate.scorePercent/);
  assert.match(source, /scoreTone:\s*scoreToneForPercent\(candidate\.scorePercent\)/);
});


test('files collapse locks selection actions without clearing the selected target', () => {
  const shell = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'mountSelectionActions.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'selectionActions.css'), 'utf8');

  assert.match(shell, /vincarios:files-collapse-change/);
  assert.match(shell, /isTargetAvailable:\s*\(\) => filesPanelLayout\.isCollapsed\(\) !== true/);
  assert.match(source, /files-collapse-change/);
  assert.match(source, /createLayoutLockedAction/);
  assert.match(source, /Expand Files to use Selection Actions\./);
  assert.match(css, /\.selection-action-button\.is-layout-locked/);
});
test('selection action renderer uses registry-owned compact labels icons category dots and execution markers', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'mountSelectionActions.js'), 'utf8');

  assert.match(source, /button\.dataset\.actionExecution/);
  assert.match(source, /selection-action-category-dot/);
  assert.match(source, /action\.shortLabel/);
  assert.match(source, /renderExecutionMarker/);
  assert.match(source, /actionProvider/);
  assert.match(source, /actionEmbedding/);
});
test('folder context uses the shared scope form and bounded snapshot action', () => {
  const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'mountSelectionActions.js'), 'utf8');

  assert.equal(index.includes('./src/renderer/selectionActions/folderScopeForm.js'), true);
  assert.equal(index.includes('./src/renderer/selectionActions/folderContextSnapshotAction.js'), true);
  assert.match(source, /renderFolderContextForm\(snapshot, host\)/);
  assert.match(source, /getFolderContextSnapshotAction\(\)/);
  assert.match(source, /buildFolderContextSnapshot/);
  assert.match(source, /renderFolderScopeForm\(snapshot, host, config\)/);
  assert.doesNotMatch(source, /addContextItem\(\{ kind: 'folder', path: snapshot\.path \}\)/);
});

test('Similar Notes uses one explicit source mode instead of a content metadata weight slider', () => {
  const formSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'similarNotesForm.js'), 'utf8');

  assert.match(formSource, /data-similar-source/);
  assert.match(formSource, /Content/);
  assert.match(formSource, /Metadata/);
  assert.match(formSource, /Both/);
  assert.doesNotMatch(formSource, /data-similar-content-weight/);
  assert.doesNotMatch(formSource, /wireSimilarWeightSlider/);
});

test('Similar Notes resets session-only choices when Embedding defaults are saved', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'mountSelectionActions.js'), 'utf8');
  assert.match(source, /vincarios:embedding-similar-defaults-change/);
  assert.match(source, /similarNotesSessionOptions = null/);
});
