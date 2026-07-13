'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('shell exposes live regions and accessible control relationships', () => {
  const source = read('src/renderer/shell/mountShell.js');

  assert.match(source, /id="chat-log"[^>]*aria-live="polite"/);
  assert.match(source, /aria-controls="note-presets"/);
  assert.match(source, /aria-controls="project-presets"/);
  assert.match(source, /aria-controls="review-basket-items"/);
  assert.match(source, /aria-controls="context-basket-items"/);
  assert.match(source, /id="chat-input"[^>]*aria-label="Chat message"/);
  assert.match(source, /id="chat-send"[^>]*aria-label="Send message"/);
  assert.match(source, /id="status-bar-global"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(source, /id="provider-refresh"[^>]*aria-label="Refresh provider status"/);
  assert.match(source, /data-selection-actions-toggle[^>]*aria-label="Collapse Selection Actions"[^>]*aria-expanded="true"/);
});

test('custom resizers expose vertical separator semantics', () => {
  const source = read('src/renderer/shell/mountShell.js');

  assert.match(source, /data-resize="vault"[^>]*role="separator"[^>]*aria-orientation="vertical"/);
  assert.match(source, /data-resize="files"[^>]*role="separator"[^>]*aria-orientation="vertical"/);
  assert.match(source, /data-resize="actions"[^>]*role="separator"[^>]*aria-orientation="vertical"/);
  assert.doesNotMatch(source, /data-resize="preview"/);
});
test('Markdown preview controls expose accessible labels and status regions', () => {
  const source = read('src/renderer/shell/mountShell.js');

  assert.match(source, /markdown-history-back[^>]*aria-label="Back in preview history"/);
  assert.match(source, /markdown-history-forward[^>]*aria-label="Forward in preview history"/);
  assert.match(source, /markdown-reveal-current[^>]*aria-label="Reveal current note in Files"/);
  assert.match(source, /markdown-source-editor[^>]*aria-label="Markdown source editor"/);
  assert.match(source, /markdown-preview-status[^>]*aria-live="polite"/);
});

test('Files collapse control exposes an accessible state', () => {
  const source = read('src/renderer/files/mountFilePanel.js');

  assert.match(source, /data-files-collapse-toggle[^>]*aria-label="Collapse Files"[^>]*aria-expanded="true"/);
  assert.match(source, /collapseButton\.setAttribute\('aria-expanded', next \? 'false' : 'true'\)/);
});
test('file tree rows and permission buttons expose accessible names', () => {
  const source = read('src/renderer/files/mountFilePanel.js');

  assert.match(source, /row\.setAttribute\('aria-label', formatRowAriaLabel\(entry\)\)/);
  assert.match(source, /row\.setAttribute\('aria-current', 'true'\)/);
  assert.match(source, /button\.setAttribute\('aria-label', title \+ ': ' \+ path\)/);
  assert.match(source, /function formatRowAriaLabel/);
});

test('review basket dynamic controls and dialogs are labelled', () => {
  const source = read('src/renderer/review/mountReviewBasket.js');

  assert.match(source, /check\.setAttribute\('aria-label', 'Select review item: ' \+ getItemSummary\(item\)\)/);
  assert.match(source, /button\.setAttribute\('aria-label', 'Review diff for: ' \+ getItemSummary\(item\)\)/);
  assert.match(source, /dialog\.setAttribute\('aria-labelledby', title\.id\)/);
  assert.match(source, /function createDialogTitleId/);
});

test('context basket item actions are labelled', () => {
  const source = read('src/renderer/context/mountContextBasket.js');

  assert.match(source, /button\.setAttribute\('aria-label', 'Reveal context item: ' \+ formatItemTitle\(item\)\)/);
  assert.match(source, /remove\.setAttribute\('aria-label', 'Remove context item: ' \+ formatItemTitle\(item\)\)/);
});