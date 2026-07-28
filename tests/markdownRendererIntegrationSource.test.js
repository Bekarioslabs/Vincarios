'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('renderer shell provides preview and source editor controls', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');

  assert.match(source, /<article id="markdown-preview"/);
  assert.match(source, /id="markdown-edit-toggle"/);
  assert.match(source, /id="markdown-propose-update"/);
  assert.match(source, /disabled>Update<\/button>/);
  assert.match(source, /id="markdown-source-editor"/);
  assert.doesNotMatch(source, /<pre id="markdown-preview"/);
});

test('file panel passes Markdown content to the preview controller', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'files', 'mountFilePanel.js'), 'utf8');

  assert.match(source, /previewController\.setSource\(content, path, behavior\)/);
  assert.match(source, /setPreviewSource\(read\.content, read\.path\)/);
  assert.match(source, /previewController\.setMessage\(message\)/);
});

test('preview controller owns rendered/source mode switching', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'markdown', 'markdownPreviewController.js'), 'utf8');

  assert.match(source, /VincariosMarkdownRenderer\.renderMarkdown/);
  assert.match(source, /preview\.textContent = String\(source \|\| ''\)/);
  assert.match(source, /function setEditModeControl\(sourceMode\)/);
  assert.match(source, /sourceMode \? 'Show rendered Markdown preview' : 'Edit Markdown source'/);
  assert.match(source, /Local changes are not saved\. Use Update to send them to Review Basket\./);
  assert.match(source, /type: 'update_note'/);
  assert.match(source, /currentContent: loadedSource/);
  assert.match(source, /proposedContent/);
  assert.match(source, /function openSource\(expectedPath\)/);
  assert.match(source, /openSource,/);
});

test('shell shares the mounted preview controller with selection actions', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');

  assert.match(source, /vaultUi\.previewController = previewController/);
  assert.match(source, /vaultUi\.previewController && typeof vaultUi\.previewController\.openSource === 'function'/);
  assert.doesNotMatch(source, /openSourceEditor: \(targetPath\) => previewController &&/);
});

test('index loads Markdown preview controller before the file panel and shell', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const rendererIndex = source.indexOf('./src/renderer/markdown/markdownRenderer.js');
  const controllerIndex = source.indexOf('./src/renderer/markdown/markdownPreviewController.js');
  const filePanelIndex = source.indexOf('./src/renderer/files/mountFilePanel.js');
  const shellIndex = source.indexOf('./src/renderer/shell/mountShell.js');

  assert.equal(rendererIndex > -1, true);
  assert.equal(controllerIndex > rendererIndex, true);
  assert.equal(filePanelIndex > controllerIndex, true);
  assert.equal(shellIndex > filePanelIndex, true);
});
test('shell creates status bar before mounting Markdown preview controller', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');
    const rawStatusIndex = source.indexOf("const rawStatusBar = app.querySelector('#status-bar-global');");
  const statusSinkIndex = source.indexOf("const statusBar = activityReporter && typeof activityReporter.createStatusSink === 'function'");
  const previewControllerIndex = source.indexOf('const previewController = window.VincariosMarkdownPreview');

  assert.equal(rawStatusIndex > -1, true);
  assert.equal(statusSinkIndex > rawStatusIndex, true);
  assert.equal(previewControllerIndex > statusSinkIndex, true);
});
test('index loads the bundled Markdown engine and focused extensions before the renderer facade', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const vendorIndex = source.indexOf('./third_party/markdown-it/markdown-it.min.js');
  const formattingIndex = source.indexOf('./src/renderer/markdown/markdownFormattingCompat.js');
  const extensionIndex = source.indexOf('./src/renderer/markdown/obsidianMarkdownExtension.js');
  const engineIndex = source.indexOf('./src/renderer/markdown/markdownEngine.js');
  const propertiesIndex = source.indexOf('./src/renderer/markdown/markdownProperties.js');
  const rendererIndex = source.indexOf('./src/renderer/markdown/markdownRenderer.js');

  assert.equal(vendorIndex > -1, true);
  assert.equal(formattingIndex > vendorIndex, true);
  assert.equal(extensionIndex > formattingIndex, true);
  assert.equal(engineIndex > extensionIndex, true);
  assert.equal(propertiesIndex > engineIndex, true);
  assert.equal(rendererIndex > propertiesIndex, true);
});

test('index loads YAML runtime and Frontmatter Contract before all consumers', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const runtimeIndex = source.indexOf('./src/shared/metadata/yamlBrowserRuntime.js');
  const contractIndex = source.indexOf('./src/shared/metadata/frontmatterContract.js');
  const generatedMetadataIndex = source.indexOf('./src/shared/metadata/generatedNoteMetadata.js');
  const tagCandidatesIndex = source.indexOf('./src/renderer/selectionActions/tagCandidateAction.js');
  const propertiesIndex = source.indexOf('./src/renderer/markdown/markdownProperties.js');

  assert.equal(runtimeIndex > -1, true);
  assert.equal(contractIndex > runtimeIndex, true);
  assert.equal(generatedMetadataIndex > contractIndex, true);
  assert.equal(tagCandidatesIndex > contractIndex, true);
  assert.equal(propertiesIndex > contractIndex, true);
});

test('Obsidian Markdown extension wires the formatting compatibility module', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'markdown', 'obsidianMarkdownExtension.js'), 'utf8');

  assert.match(source, /loadFormattingCompat/);
  assert.match(source, /useMarkdownFormattingCompat\(md\)/);
  assert.doesNotMatch(source, /vincarios_safe_mark_html/);
});
