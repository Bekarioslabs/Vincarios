'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('shared tool controls use one component layer across shell and Files', () => {
  const index = read('index.html');
  const components = read('src/renderer/styles/components.css');
  const shell = read('src/renderer/shell/mountShell.js');
  const files = read('src/renderer/files/mountFilePanel.js');

  assert.match(index, /styles\/tokens\.css[\s\S]*styles\/components\.css[\s\S]*styles\/layout\.css/);
  assert.match(components, /\.ui-tool-button\s*\{/);
  assert.match(components, /\.ui-tool-button:hover:not\(:disabled\)/);
  assert.match(components, /\.ui-tool-button:hover:not\(:disabled\) \.vincarios-icon,[\s\S]*\.ui-tool-button:focus-visible \.vincarios-icon/);
  assert.match(components, /\.ui-tool-button:focus-visible/);
  assert.match(components, /\.ui-tool-button:disabled/);
  assert.match(shell, /left-nav-collapse-toggle ui-tool-button/);
  assert.match(shell, /selection-actions-collapse-toggle ui-tool-button/);
  assert.match(shell, /markdown-history-button ui-tool-button/);
  assert.match(files, /file-refresh-button ui-tool-button/);
  assert.match(files, /file-collapse-button ui-tool-button/);
});

test('Markdown history controls inherit the shared tool-control base without local duplicates', () => {
  const markdownCss = read('src/renderer/styles/markdown.css');
  const occurrences = markdownCss.match(/\.markdown-history-button\s*\{/g) || [];

  assert.equal(occurrences.length, 0);
});

test('Preview command controls share the compact tool-control base', () => {
  const shell = read('src/renderer/shell/mountShell.js');
  const markdownCss = read('src/renderer/styles/markdown.css');

  assert.match(shell, /markdown-reveal-current ui-tool-button/);
  assert.match(shell, /markdown-edit-toggle ui-tool-button/);
  assert.match(shell, /markdown-propose-update ui-tool-button/);
  assert.doesNotMatch(markdownCss, /\.markdown-edit-toggle,\s*\n\.markdown-propose-update,\s*\n\.markdown-reveal-current\s*\{/);
});
test('Files and Selection Actions use the shared panel-header component', () => {
  const components = read('src/renderer/styles/components.css');
  const shell = read('src/renderer/shell/mountShell.js');
  const files = read('src/renderer/files/mountFilePanel.js');

  assert.match(components, /\.ui-panel-header\s*\{/);
  assert.match(components, /\.ui-panel-header\s*\{[\s\S]*min-height:\s*var\(--panel-toolbar-height\);/);
  assert.match(components, /\.ui-panel-header-label\s*\{/);
  assert.match(files, /class="file-toolbar ui-panel-header"/);
  assert.match(shell, /class="selection-actions-header ui-panel-header"/);
});
test('Selection Actions use the shared flat-row primitive without persistent card borders', () => {
  const components = read('src/renderer/styles/components.css');
  const selectionActions = read('src/renderer/selectionActions/mountSelectionActions.js');
  const layoutCss = read('src/renderer/styles/layout.css');

  assert.match(components, /\.ui-flat-row\s*\{/);
  assert.match(components, /\.ui-flat-row\s*\{[\s\S]*border:\s*0;/);
  assert.match(components, /\.ui-flat-row\s*\{[\s\S]*background:\s*transparent;/);
  assert.match(components, /\.ui-flat-row\s*\{[\s\S]*font-size:\s*var\(--font-size-ui-md\);/);
  assert.match(components, /\.ui-flat-row:hover:not\(:disabled\),[\s\S]*\.ui-flat-row:focus-visible/);
  assert.match(selectionActions, /selection-action-button ui-flat-row/);
  assert.doesNotMatch(layoutCss, /^\.selection-action-button\s*\{/m);
});
