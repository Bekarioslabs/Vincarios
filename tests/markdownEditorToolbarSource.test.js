'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('editor toolbar is mounted only for source mode and uses the shared formatter module', () => {
  const shell = read('src/renderer/shell/mountShell.js');
  const controller = read('src/renderer/markdown/markdownPreviewController.js');
  const bootstrap = read('src/renderer/bootstrap.js');
  const index = read('index.html');

  assert.match(shell, /id="markdown-editor-toolbar"/);
  assert.match(shell, /data-editor-format="strikethrough"/);
  assert.match(shell, /data-editor-format="highlight"/);
  assert.match(shell, /data-editor-link-picker/);
  assert.match(shell, /id="markdown-link-picker"/);
  assert.match(controller, /handleEditorToolbarClick/);
  assert.match(controller, /openInternalLinkPicker/);
  assert.match(controller, /applyInternalLink/);
  assert.match(controller, /editorToolbar\.hidden = !sourceMode/);
  assert.match(controller, /captureEditorViewport\(\)/);
  assert.match(controller, /restoreEditorViewport\(viewport\)/);
  assert.match(controller, /editorToolbar\.addEventListener\('mousedown'/);
  assert.match(bootstrap, /VincariosEditorFormatting/);
  assert.match(bootstrap, /VincariosMarkdownLinkPicker/);
  assert.match(index, /editorFormatting\.js[\s\S]*markdownLinkPicker\.js[\s\S]*markdownPreviewController\.js/);
});