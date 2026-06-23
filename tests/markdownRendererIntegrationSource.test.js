'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('renderer shell uses an article node for Markdown preview', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');

  assert.match(source, /<article id="markdown-preview"/);
  assert.doesNotMatch(source, /<pre id="markdown-preview"/);
});

test('file panel renders Markdown content through the Markdown renderer', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'files', 'mountFilePanel.js'), 'utf8');

  assert.match(source, /renderMarkdownPreview\(read\.content\)/);
  assert.match(source, /ZeusMarkdownRenderer\.renderMarkdown/);
  assert.match(source, /preview\.textContent = String\(content \|\| ''\)/);
});

test('index loads Markdown renderer before the file panel', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const rendererIndex = source.indexOf('./src/renderer/markdown/markdownRenderer.js');
  const filePanelIndex = source.indexOf('./src/renderer/files/mountFilePanel.js');

  assert.equal(rendererIndex > -1, true);
  assert.equal(filePanelIndex > rendererIndex, true);
});