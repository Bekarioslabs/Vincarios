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

  assert.match(source, /ZeusMarkdownRenderer\.renderMarkdown/);
  assert.match(source, /preview\.textContent = String\(source \|\| ''\)/);
  assert.match(source, /editButton\.textContent = sourceMode \? 'Preview' : 'Edit'/);
  assert.match(source, /Use Update to send changes to Review Basket/);
  assert.match(source, /type: 'update_note'/);
  assert.match(source, /currentContent: loadedSource/);
  assert.match(source, /proposedContent/);
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
  const statusIndex = source.indexOf("const statusBar = app.querySelector('#status-bar');");
  const previewControllerIndex = source.indexOf('const previewController = window.ZeusMarkdownPreview');

  assert.equal(statusIndex > -1, true);
  assert.equal(previewControllerIndex > statusIndex, true);
});
