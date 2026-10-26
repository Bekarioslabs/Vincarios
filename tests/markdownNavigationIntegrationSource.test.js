'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('index loads Markdown link resolver before preview controller', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const resolverIndex = source.indexOf('./src/renderer/markdown/markdownLinkResolver.js');
  const controllerIndex = source.indexOf('./src/renderer/markdown/markdownPreviewController.js');

  assert.equal(resolverIndex > -1, true);
  assert.equal(controllerIndex > resolverIndex, true);
});

test('preview toolbar exposes reveal without coupling it to edit mode', () => {
  const shell = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');
  assert.match(shell, /id="markdown-history-back"/);
  assert.match(shell, /id="markdown-history-forward"/);
  assert.match(shell, /id="markdown-reveal-current"/);
  assert.match(shell, /onOpenLink/);
  assert.match(shell, /filePanel\.openLinkedMarkdown/);
  assert.match(shell, /onRevealCurrentPath/);
  assert.match(shell, /onOpenHistoryPath/);
  assert.match(shell, /filePanel\.revealPath/);
});

test('preview controller delegates link clicks and reveal requests through callbacks', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'markdown', 'markdownPreviewController.js'), 'utf8');

  assert.match(source, /preview\.addEventListener\('click', handlePreviewClick\)/);
  assert.match(source, /closest\('\.markdown-link, \.markdown-wikilink'\)/);
  assert.match(source, /options\.onOpenLink/);
  assert.match(source, /options\.onRevealCurrentPath/);
  assert.match(source, /options\.onOpenHistoryPath/);
  assert.match(source, /moveHistory/);
  assert.match(source, /showLinkFeedback/);
});

test('file panel opens linked notes without auto-revealing the file tree', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'files', 'mountFilePanel.js'), 'utf8');

  assert.match(source, /async function openLinkedMarkdown/);
  assert.match(source, /resolver\.resolveMarkdownLink\(target, currentPath, api\)/);
  assert.match(source, /setPreviewSource\(read\.content, read\.path\)/);
  assert.match(source, /async function revealPath/);
  assert.match(source, /openLinkedMarkdown,/);
  assert.match(source, /openMarkdownPath,/);
  assert.match(source, /revealPath,/);
});
