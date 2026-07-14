'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('index loads selection action modules before shell', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const categoriesIndex = source.indexOf('./src/renderer/selectionActions/actionCategories.js');
  const registryIndex = source.indexOf('./src/renderer/selectionActions/actionRegistry.js');
  const summaryIndex = source.indexOf('./src/renderer/selectionActions/fileSummaryAction.js');
  const mountIndex = source.indexOf('./src/renderer/selectionActions/mountSelectionActions.js');
  const shellIndex = source.indexOf('./src/renderer/shell/mountShell.js');

  assert.equal(categoriesIndex > -1, true);
  assert.equal(registryIndex > categoriesIndex, true);
  assert.equal(summaryIndex > registryIndex, true);
  assert.equal(mountIndex > summaryIndex, true);
  assert.equal(shellIndex > mountIndex, true);
});

test('bootstrap requires selection action renderer modules', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'bootstrap.js'), 'utf8');

  assert.match(source, /VitruviosSelectionActionCategories/);
  assert.match(source, /VitruviosSelectionActionRegistry/);
  assert.match(source, /VitruviosSelectionActions/);
  assert.match(source, /VitruviosFileSummaryAction/);
});

test('shell mounts selection action panel with context state', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');

  assert.match(source, /VitruviosSelectionActions\.mountSelectionActions/);
  assert.match(source, /contextState/);
  assert.match(source, /reviewBasket/);
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
  assert.match(source, /VitruviosChat\.appendMessage/);
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

  assert.match(source, /renderUpdateInstructionForm\(snapshot, host\)/);
  assert.match(source, /selection-action-form/);
  assert.match(source, /textarea/);
  assert.match(source, /Create proposal/);
  assert.doesNotMatch(source, /window\.prompt/);
});
test('selection action update form styles stay in layout stylesheet', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');

  assert.match(source, /\.selection-action-form/);
  assert.match(source, /\.selection-action-form textarea/);
  assert.match(source, /\.selection-action-form-actions/);
});

test('selection action number inputs hide native spinner chrome', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');

  assert.match(source, /\.selection-action-form input\[type="number"\]/);
  assert.match(source, /appearance:\s*textfield/);
  assert.match(source, /::-webkit-inner-spin-button/);
  assert.match(source, /-webkit-appearance:\s*none/);
});
test('Markdown highlights use dedicated theme tokens and scoped styles', () => {
  const tokens = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'tokens.css'), 'utf8');
  const markdown = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'markdown.css'), 'utf8');

  assert.match(tokens, /--markdown-highlight-background:/);
  assert.match(tokens, /--markdown-highlight-text:/);
  assert.match(markdown, /\.markdown-preview mark/);
  assert.match(markdown, /var\(--markdown-highlight-background\)/);
  assert.match(markdown, /var\(--markdown-highlight-text\)/);
});
