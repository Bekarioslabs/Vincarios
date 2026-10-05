'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('index loads review basket modules before chat and shell modules', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const profileIndex = source.indexOf('./src/shared/vaultProfile/defaults.js');
  const actionSchemaIndex = source.indexOf('./src/shared/actions/actionSchema.js');
  const modelActionParserIndex = source.indexOf('./src/shared/actions/modelActionParser.js');
  const proposalPlanIndex = source.indexOf('./src/shared/actions/proposalPlan.js');
  const diffPreviewIndex = source.indexOf('./src/shared/actions/diffPreview.js');
  const stateIndex = source.indexOf('./src/renderer/review/reviewBasketState.js');
  const viewIndex = source.indexOf('./src/renderer/review/mountReviewBasket.js');
  const chatIndex = source.indexOf('./src/renderer/chat/mountChat.js');
  const shellIndex = source.indexOf('./src/renderer/shell/mountShell.js');

  assert.equal(profileIndex > -1, true);
  assert.equal(actionSchemaIndex > profileIndex, true);
  assert.equal(modelActionParserIndex > actionSchemaIndex, true);
  assert.equal(proposalPlanIndex > modelActionParserIndex, true);
  assert.equal(diffPreviewIndex > proposalPlanIndex, true);
  assert.equal(stateIndex > diffPreviewIndex, true);
  assert.equal(stateIndex > -1, true);
  assert.equal(viewIndex > stateIndex, true);
  assert.equal(chatIndex > viewIndex, true);
  assert.equal(shellIndex > chatIndex, true);
});

test('shell mounts review basket view and passes it into chat', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');

  assert.match(source, /VincariosReviewBasket\.mountReviewBasket/);
  assert.match(source, /reviewBasket/);
  assert.match(source, /mountChat\(\{ api, app, status: activityStatus, activityReporter, reviewBasket, contextState \}\)/);
});

test('shell passes review basket into Markdown preview update wiring', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');

  assert.match(source, /wireVaultShell\(api, app, contextState, vaultUi, reviewBasket, filesPanelLayout, activityReporter\)/);
  assert.match(source, /function wireVaultShell\(api, app, contextState, vaultUi, reviewBasket, filesPanelLayout, activityReporter\)/);
  assert.match(source, /onProposeUpdate: \(proposal\) => addPreviewUpdateProposal\(reviewBasket, statusBar, proposal, contextState, permissionState\)/);
});
test('assistant messages expose a save-as-note action through the review basket', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'chat', 'mountChat.js'), 'utf8');

  assert.match(source, /Save as Note/);
  assert.match(source, /createSaveAssistantResponseProposal/);
  assert.match(source, /reviewBasket\.addProposal/);
});

test('assistant messages render markdown through the shared renderer while user messages stay plain text', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'chat', 'mountChat.js'), 'utf8');

  assert.match(source, /renderMessageBody\(body, role, content\)/);
  assert.match(source, /window\.VincariosMarkdownRenderer/);
  assert.match(source, /renderer\.renderMarkdown/);
  assert.match(source, /body\.innerHTML = renderer\.renderMarkdown/);
  assert.match(source, /body\.textContent = content/);
});
test('review basket view is isolated from shell rendering', () => {
  const shellSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');
  const viewSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'review', 'mountReviewBasket.js'), 'utf8');

  assert.doesNotMatch(shellSource, /function renderReviewBasket/);
  assert.match(viewSource, /function mountReviewBasket/);
  assert.match(viewSource, /createReviewBasketState/);
});
test('review basket view owns selection and execute controls without vault access', () => {
  const shellSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');
  const viewSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'review', 'mountReviewBasket.js'), 'utf8');

  assert.match(shellSource, /id="review-execute"/);
  assert.match(viewSource, /setSelected/);
  assert.match(viewSource, /getSelectedOpenItems/);
  assert.match(viewSource, /updateStatus/);
  assert.match(viewSource, /executeProposal/);
  assert.doesNotMatch(viewSource, /fs\./);
});

test('review controller executes create note proposals through the preload vault API only', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'review', 'reviewExecutionController.js'), 'utf8');

  assert.match(source, /function createReviewExecutionController/);
  assert.match(source, /api\.vault\.createNote/);
  assert.doesNotMatch(source, /require\('node:fs'\)/);
});

test('create proposals expose an edit button instead of a second execute-time title prompt', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'review', 'mountReviewBasket.js'), 'utf8');

  assert.match(source, /renderEditButton/);
  assert.match(source, /showCreateEditModal/);
  assert.doesNotMatch(source, /return confirmCreateNote\(item\)/);
});

test('review basket sends edited create-note title to the execution boundary', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'review', 'mountReviewBasket.js'), 'utf8');

  assert.match(source, /Object\.assign\(\{\}, item, confirmed\.patch\)/);
  assert.match(source, /executeProposal\(proposal\)/);
});
test('review basket view displays diff preview summaries for existing-file actions', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'review', 'mountReviewBasket.js'), 'utf8');

  assert.match(source, /renderDiffSummary/);
  assert.match(source, /item\.diffPreview\.summary/);
  assert.match(source, /Diff required/);
});
test('review basket exposes a dedicated diff approval modal for diff proposals', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'review', 'mountReviewBasket.js'), 'utf8');

  assert.match(source, /review-diff-button/);
  assert.match(source, /showDiffPreviewModal/);
  assert.match(source, /Diff Preview/);
  assert.match(source, /getDiffLineRenderer\(\)\.renderDiffLines/);
});
test('review basket confirms update note proposals before execution', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'review', 'mountReviewBasket.js'), 'utf8');

  assert.match(source, /confirmUpdateNote/);
  assert.match(source, /Apply Update Preview/);
  assert.match(source, /Apply update/);
  assert.match(source, /item\.type === 'update_note'/);
});test('review controller executes update note proposals through the preload vault API only', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'review', 'reviewExecutionController.js'), 'utf8');

  assert.match(source, /api\.vault\.updateNote/);
  assert.match(source, /proposal\.currentContent/);
  assert.match(source, /proposal\.proposedContent/);
});


test('shell composes review execution while the controller owns post-write refresh', () => {
  const shellSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');
  const controllerSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'review', 'reviewExecutionController.js'), 'utf8');

  assert.match(shellSource, /VincariosReviewExecution\.createReviewExecutionController/);
  assert.match(shellSource, /executeProposal: reviewExecution\.executeProposal/);
  assert.match(shellSource, /vaultUi\.filePanel = filePanel/);
  assert.match(controllerSource, /filePanel\.refreshTree\(\)/);
});
test('shell exposes context basket and passes context state into chat', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');

  assert.match(source, /id="context-basket"/);
  assert.match(source, /id="context-basket-items"/);
  assert.match(source, /id="context-clear-all"/);
  assert.match(source, /VincariosContextBasket\.mountContextBasket/);
  assert.match(source, /mountChat\(\{ api, app, status: activityStatus, activityReporter, reviewBasket, contextState \}\)/);
  assert.doesNotMatch(source, /active-context-toggle/);
  assert.doesNotMatch(source, /setAutoContextEnabled/);
});

test('chat builds request-scoped context without storing it in chat history', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'chat', 'mountChat.js'), 'utf8');

  assert.match(source, /buildChatContextPackage/);
  assert.match(source, /contextState\.snapshot\(\)/);
  assert.match(source, /outboundMessages/);
  assert.match(source, /## User Request/);
});

test('file panel stores loaded Markdown content in context state', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'files', 'mountFilePanel.js'), 'utf8');

  assert.match(source, /contextState\.setFile\(read\.path, createContextDetails\(read\.path, read\.content\)\)/);
});
test('index loads context intent and folder controller before chat uses context state', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const intentIndex = source.indexOf('./src/renderer/context/contextIntent.js');
  const pendingIndex = source.indexOf('./src/renderer/context/pendingActionState.js');
  const blockedIndex = source.indexOf('./src/renderer/context/blockedActionState.js');
  const folderControllerIndex = source.indexOf('./src/renderer/context/folderContextController.js');
  const stateIndex = source.indexOf('./src/renderer/context/contextState.js');
  const packageIndex = source.indexOf('./src/renderer/context/contextPackageBuilder.js');
  const basketIndex = source.indexOf('./src/renderer/context/mountContextBasket.js');
  const runnerIndex = source.indexOf('./src/renderer/chat/modelReadActionRunner.js');
  const preflightIndex = source.indexOf('./src/renderer/chat/readContextPreflight.js');
  const chatIndex = source.indexOf('./src/renderer/chat/mountChat.js');

  assert.equal(intentIndex > -1, true);
  assert.equal(pendingIndex > intentIndex, true);
  assert.equal(blockedIndex > pendingIndex, true);
  assert.equal(folderControllerIndex > blockedIndex, true);
  assert.equal(stateIndex > folderControllerIndex, true);
  assert.equal(packageIndex > stateIndex, true);
  assert.equal(basketIndex > packageIndex, true);
  assert.equal(runnerIndex > basketIndex, true);
  assert.equal(preflightIndex > runnerIndex, true);
  assert.equal(chatIndex > preflightIndex, true);
});
test('renderer browser globals take priority over CommonJS fallbacks', () => {
  const files = [
    path.join(__dirname, '..', 'src', 'renderer', 'context', 'contextState.js'),
    path.join(__dirname, '..', 'src', 'renderer', 'context', 'contextPackageBuilder.js'),
    path.join(__dirname, '..', 'src', 'renderer', 'context', 'folderContextController.js'),
    path.join(__dirname, '..', 'src', 'renderer', 'chat', 'modelReadActionRunner.js'),
    path.join(__dirname, '..', 'src', 'renderer', 'chat', 'readContextPreflight.js'),
    path.join(__dirname, '..', 'src', 'renderer', 'review', 'reviewBasketState.js')
  ];

  files.forEach((file) => {
    const source = fs.readFileSync(file, 'utf8');
    const firstWindow = source.indexOf('typeof window');
    const firstRequire = source.indexOf('typeof require');
    assert.equal(firstWindow > -1, true, file);
    if (firstRequire > -1) assert.equal(firstWindow < firstRequire, true, file);
  });
});
test('chat renders folder scope actions as message actions without blocked retry buttons', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'chat', 'mountChat.js'), 'utf8');

  assert.match(source, /scopeActions/);
  assert.doesNotMatch(source, /blockedActions/);
  assert.doesNotMatch(source, /runBlockedAction/);
  assert.match(source, /createMessageActions/);
  assert.match(source, /chat-message-action-button/);
  assert.match(source, /runScopeAction/);
});

test('index loads selected update proposal action before chat', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const updateIndex = source.indexOf('./src/renderer/chat/selectedUpdateProposalAction.js');
  const chatIndex = source.indexOf('./src/renderer/chat/mountChat.js');

  assert.equal(updateIndex > -1, true);
  assert.equal(updateIndex < chatIndex, true);
});

test('chat does not auto-route selected Markdown update text into write proposals', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'chat', 'mountChat.js'), 'utf8');

  assert.doesNotMatch(source, /runSelectedUpdateProposalRequest/);
  assert.doesNotMatch(source, /VincariosSelectedUpdateProposalAction/);
});
test('index loads model action parser before model read action runner and chat', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const parserIndex = source.indexOf('./src/shared/actions/modelActionParser.js');
  const runnerIndex = source.indexOf('./src/renderer/chat/modelReadActionRunner.js');
  const preflightIndex = source.indexOf('./src/renderer/chat/readContextPreflight.js');
  const chatIndex = source.indexOf('./src/renderer/chat/mountChat.js');

  assert.equal(parserIndex > -1, true);
  assert.equal(runnerIndex > parserIndex, true);
  assert.equal(preflightIndex > runnerIndex, true);
  assert.equal(chatIndex > preflightIndex, true);
});
test('review basket exposes clear executed and compact dismiss controls', () => {
  const shellSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');
  const viewSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'review', 'mountReviewBasket.js'), 'utf8');

  assert.match(shellSource, /id="review-clear-done"/);
  assert.match(shellSource, /review-danger-button/);
  assert.match(shellSource, /aria-label="Clear pending review items"/);
  assert.match(shellSource, /aria-label="Clear executed review items"/);
  assert.match(viewSource, /clearDone/);
  assert.match(viewSource, /review-basket-item-actions/);
  assert.match(viewSource, /renderDismissButton/);
  assert.match(viewSource, /review-remove-icon/);
});

test('update instruction cancel protects typed text before removing the form', () => {
  const formSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'updateInstructionForm.js'), 'utf8');

  assert.match(formSource, /canDiscard\(textarea, options\.confirmDiscard\)/);
  assert.match(formSource, /function canDiscard/);
  assert.match(formSource, /confirmDiscard\('Discard update instruction\?'\)/);
});

test('review controller refreshes the active preview after a successful update', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'review', 'reviewExecutionController.js'), 'utf8');

  assert.match(source, /const result = await api\.vault\.updateNote/);
  assert.match(source, /await refreshLoadedMarkdown\(proposal\.targetPath\)/);
  assert.match(source, /filePanel\.refreshLoadedMarkdown\(targetPath\)/);
});

test('review basket source disables and labels no-change proposals', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'review', 'mountReviewBasket.js'), 'utf8');

  assert.match(source, /item\.executable === false/);
  assert.match(source, /No content changes proposed/);
});

test('review basket shows failed execution errors on the item', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'review', 'mountReviewBasket.js'), 'utf8');

  assert.match(source, /renderErrorSummary\(item\)/);
  assert.match(source, /review-basket-error-summary/);
  assert.match(source, /Failed: /);
});

test('review basket keeps stale-content conflicts distinct from ordinary execution failures', () => {
  const { getExecutionFailureStatus } = require('../src/renderer/review/mountReviewBasket');

  assert.equal(getExecutionFailureStatus({ code: 'stale_content' }), 'stale');
  assert.equal(getExecutionFailureStatus({ code: 'write_failed' }), 'failed');
});

test('template preset edit modal shows folders and files in the read-only plan preview', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'review', 'mountReviewBasket.js'), 'utf8');

  assert.match(source, /formatTemplatePlanPreview/);
  assert.match(source, /Folders:/);
  assert.match(source, /Files:/);
  assert.doesNotMatch(source, /formatTemplateFilesPreview/);
});

test('reviewed templates cross one atomic main boundary instead of renderer file loops', () => {
  const controllerSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'review', 'reviewExecutionController.js'), 'utf8');
  const serviceSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'templates', 'reviewedTemplateService.js'), 'utf8');

  assert.match(controllerSource, /api\.templates\.createFromReview\(proposal\)/);
  assert.doesNotMatch(controllerSource, /api\.vault\.createFolder/);
  assert.match(serviceSource, /executeAuditedMutation/);
  assert.match(serviceSource, /created\.slice\(\)\.reverse\(\)/);
  assert.match(serviceSource, /createdFolders\.slice\(\)\.reverse\(\)/);
});

test('review basket empty state uses compact icon feedback', () => {
  const viewSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'review', 'mountReviewBasket.js'), 'utf8');
  const contextSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'context', 'mountContextBasket.js'), 'utf8');

  assert.match(viewSource, /createEmptyState\('check', 'No review items\.'\)/);
  assert.match(viewSource, /mini-panel-empty-rich/);
  assert.match(contextSource, /createEmptyState\('file', 'No context items\.'\)/);
  assert.match(contextSource, /empty-state-icon/);
});

test('review controller flashes written file rows after successful reviewed writes', () => {
  const shellSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'review', 'reviewExecutionController.js'), 'utf8');

  assert.match(shellSource, /function createUpdateFlashState\(\)/);
  assert.match(source, /function reviewedWriteFlashTargets\(proposal, result\)/);
  assert.match(source, /flashState\.flashTargets\(targets\)/);
  assert.match(source, /proposal\.type === 'create_note'/);
  assert.match(source, /proposal\.type === 'update_note'/);
  assert.match(source, /proposal\.type === 'create_from_template'/);
  assert.doesNotMatch(source, /filePanel\.flashPath\(targetPath\)/);
});

test('review basket persistence loads before its view and restores only after a vault opens', () => {
  const indexSource = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const shellSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');
  const viewSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'review', 'mountReviewBasket.js'), 'utf8');
  const persistenceIndex = indexSource.indexOf('./src/renderer/review/reviewBasketPersistence.js');
  const viewIndex = indexSource.indexOf('./src/renderer/review/mountReviewBasket.js');

  assert.equal(persistenceIndex > -1, true);
  assert.equal(persistenceIndex < viewIndex, true);
  assert.match(viewSource, /createReviewBasketPersistence/);
  assert.match(viewSource, /persistence\.restore\(state\)/);
  assert.match(viewSource, /persistence\.persist\(snapshot\)/);
  assert.match(shellSource, /await reviewBasket\.restore\(\)/);
});
