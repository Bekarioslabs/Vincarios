'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const BROWSER_SHARED_SCRIPTS = [
  'src/shared/fileTypes.js',
  'src/shared/pathRules/newNames.js',
  'src/shared/vaultProfile/defaults.js',
  'src/shared/vaultProfile/folderVisuals.js',
  'src/shared/themes/themePacks.js',
  'src/shared/security/payloadLimits.js',
  'src/shared/text/lineEndings.js',
  'src/shared/actions/actionSchema.js',
  'src/shared/actions/modelActionParser.js',
  'src/shared/actions/proposalPlan.js',
  'src/shared/actions/diffPreview.js'
];
const BROWSER_RENDERER_SCRIPTS = [
  'src/renderer/files/mountFilePanel.js',
  'src/renderer/shell/mountShell.js',
  'src/renderer/icons/iconRegistry.js',
  'src/renderer/icons/iconRenderer.js',
  'src/renderer/vaultProfile/vaultProfileState.js',
  'src/renderer/vaultProfile/vaultProfileDraftState.js',
  'src/renderer/vaultProfile/visualIconRenderer.js'
];


test('browser-loaded shared scripts are isolated in IIFEs', () => {
  BROWSER_SHARED_SCRIPTS.forEach((relativePath) => {
    const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8').trimStart();
    assert.equal(source.startsWith('(function() {'), true, relativePath);
  });
});

test('write-name validation loads before presets and rejects unsafe names in a browser without require', () => {
  const vm = require('node:vm');
  const browser = { window: {} };
  for (const script of ['src/shared/pathRules/newNames.js', 'src/shared/fileTypes.js', 'src/shared/vaultProfile/defaults.js', 'src/shared/templates/presetRegistry.js']) {
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', script), 'utf8'), browser);
  }
  assert.throws(() => browser.window.VincariosTemplatePresets.materializePreset('note.default', { title: 'CON' }), /reserved by Windows/);
  assert.equal(browser.window.VincariosTemplatePresets.materializePreset('note.default', { title: 'Aurora!' }).files[0].path, '00_Inbox/Aurora!.md');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(html.indexOf('./src/shared/pathRules/newNames.js') < html.indexOf('./src/shared/templates/presetRegistry.js'));
  const bootstrap = fs.readFileSync(path.join(__dirname, '..', 'src/renderer/bootstrap.js'), 'utf8');
  assert.match(bootstrap, /globalName: 'VincariosNewNames', methods: \['validateNewName'\]/);
});

test('index loads all isolated shared scripts before renderer script modules', () => {
  const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const firstRendererScript = index.indexOf('<script src="./src/renderer/');

  assert.equal(firstRendererScript > -1, true);
  BROWSER_SHARED_SCRIPTS.forEach((relativePath) => {
    const htmlPath = './' + relativePath.replace(/\\/g, '/');
    const scriptIndex = index.indexOf(htmlPath);
    assert.equal(scriptIndex > -1, true, htmlPath);
    assert.equal(scriptIndex < firstRendererScript, true, htmlPath);
  });
});

test('line-ending helpers load before their editor and review consumers and are startup-validated', () => {
  const vm = require('node:vm');
  const relativePath = 'src/shared/text/lineEndings.js';
  const browser = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8'), browser);
  assert.equal(browser.window.VincariosLineEndings.normalizeLineEndings('A\r\nB'), 'A\nB');
  assert.equal(browser.window.VincariosLineEndings.preserveLineEndings('New\n', 'Old\r\n'), 'New\r\n');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const dependency = html.indexOf('./' + relativePath);
  for (const consumer of ['review/reviewBasketState.js', 'markdown/markdownPreviewController.js']) {
    assert.ok(dependency >= 0 && dependency < html.indexOf('./src/renderer/' + consumer));
  }
  const bootstrap = fs.readFileSync(path.join(__dirname, '..', 'src/renderer/bootstrap.js'), 'utf8');
  assert.match(bootstrap, /globalName: 'VincariosLineEndings', methods: \['normalizeLineEndings', 'preserveLineEndings'\]/);
});

test('shared file types load before browser consumers and are startup-validated', () => {
  const vm = require('node:vm');
  const browser = { window: {} };
  const shared = 'src/shared/fileTypes.js';
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', shared), 'utf8'), browser);
  for (const consumer of [
    'src/shared/cleanup/inboxCleanupReport.js',
    'src/renderer/selectionActions/actionRegistry.js',
    'src/renderer/selectionActions/fileSummaryAction.js',
    'src/renderer/selectionActions/tagCandidateAction.js',
    'src/renderer/context/mountContextBasket.js',
    'src/renderer/markdown/markdownLinkPicker.js',
    'src/renderer/markdown/markdownLinkResolver.js',
    'src/renderer/markdown/editorFormatting.js'
  ]) vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', consumer), 'utf8'), browser);
  assert.equal(browser.window.VincariosSelectionActionRegistry.getTargetKind({ kind: 'file', path: 'Note.markdown' }), 'markdown');
  assert.equal(browser.window.VincariosMarkdownLinkPicker.normalizeLinkResults([{ path: 'Note.MARKDOWN' }])[0].title, 'Note');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(html.indexOf('./' + shared) < html.indexOf('./src/shared/cleanup/inboxCleanupReport.js'));
  const bootstrap = fs.readFileSync(path.join(__dirname, '..', 'src/renderer/bootstrap.js'), 'utf8');
  assert.match(bootstrap, /globalName: 'VincariosFileTypes', methods: \['isMarkdownPath', 'stripMarkdownExtension'\]/);
});
test('Vault Profile visual icon renderer loads before its consumer modules', () => {
  const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const rendererIndex = index.indexOf('./src/renderer/vaultProfile/visualIconRenderer.js');
  const filePanelIndex = index.indexOf('./src/renderer/files/mountFilePanel.js');
  const settingsPanelIndex = index.indexOf('./src/renderer/settings/mountSettingsPanel.js');

  assert.equal(rendererIndex > -1, true);
  assert.equal(rendererIndex < filePanelIndex, true);
  assert.equal(rendererIndex < settingsPanelIndex, true);
});
test('index does not contain visible escaped newline literals', () => {
  const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.equal(index.includes('`r'), false);
  assert.equal(index.includes('`n'), false);
  assert.equal(index.includes('\\r\\n'), false);
});


test('browser-loaded renderer scripts do not start with a UTF-8 BOM', () => {
  BROWSER_RENDERER_SCRIPTS.forEach((relativePath) => {
    const buffer = fs.readFileSync(path.join(__dirname, '..', relativePath));
    assert.equal(buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf, false, relativePath);
  });
});

test('index declares a strict renderer content security policy', () => {
  const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.match(index, /http-equiv="Content-Security-Policy"/);
  assert.match(index, /default-src 'self'/);
  assert.match(index, /script-src 'self'/);
  assert.match(index, /style-src 'self'/);
  assert.match(index, /img-src 'self' data: file:/);
  assert.match(index, /font-src 'self'/);
  assert.match(index, /connect-src 'none'/);
  assert.equal(index.includes("'unsafe-inline'"), false);
  assert.equal(index.includes("'unsafe-eval'"), false);
});
