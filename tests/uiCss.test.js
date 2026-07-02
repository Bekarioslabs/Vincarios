'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('collapsible left subactions preserve hidden state despite flex layout', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');

  assert.match(css, /\.left-subactions\s*\{[\s\S]*display:\s*flex;/);
  assert.match(css, /\.left-subactions\[hidden\]\s*\{\s*display:\s*none;\s*\}/);
});
test('permission buttons have explicit inactive and active styling', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'files.css'), 'utf8');

  assert.match(css, /\.file-permission-controls\s*\{/);
  assert.match(css, /\.file-permission-button\s*\{/);
  assert.match(css, /\.file-permission-button\.is-active\s*\{/);
  assert.match(css, /\.file-permission-button\.is-inherited\s*\{/);
});

test('permission controls sit before file icons in the tree grid', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'files.css'), 'utf8');

  assert.match(css, /grid-template-columns:\s*auto\s+30px\s+minmax\(0, 1fr\);/);
  assert.match(css, /\.file-permission-controls\s*\{[\s\S]*margin-left:\s*0;/);
});
test('review basket styles stay in the review stylesheet', () => {
  const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const layoutCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');
  const reviewCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'review.css'), 'utf8');

  assert.match(index, /src\/renderer\/styles\/review\.css/);
  assert.doesNotMatch(layoutCss, /\.review-basket-item/);
  assert.match(reviewCss, /\.review-basket-item/);
  assert.match(reviewCss, /\.chat-save-note-button/);
});

test('create note preview title input is styled in review stylesheet', () => {
  const reviewCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'review.css'), 'utf8');

  assert.match(reviewCss, /\.review-modal-field\s*\{/);
  assert.match(reviewCss, /\.review-modal-title-input\s*\{/);
});
test('folder scope action buttons use chat message styles', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');

  assert.match(css, /\.chat-message-actions\s*\{/);
  assert.match(css, /\.chat-message-action-button\s*\{/);
});
test('assistant chat markdown has compact scoped styles', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');

  assert.match(css, /\.chat-message-markdown\s*\{/);
  assert.match(css, /\.chat-message-markdown h1/);
  assert.match(css, /\.chat-message-markdown pre code/);
});
test('Markdown history controls are styled in the Markdown stylesheet', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'markdown.css'), 'utf8');

  assert.match(css, /\.markdown-history-button/);
  assert.match(css, /\.markdown-history-button:hover:not\(:disabled\)/);
  assert.match(css, /\.markdown-history-button:disabled/);
});
test('diff review modal styles stay in the review stylesheet', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'review.css'), 'utf8');

  assert.match(source, /review-diff-button/);
  assert.match(source, /review-diff-body/);
  assert.match(source, /review-diff-line-add/);
  assert.match(source, /review-diff-line-remove/);
});
test('review basket polish stays isolated in review stylesheet', () => {
  const reviewCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'review.css'), 'utf8');

  assert.match(reviewCss, /\.review-clear-button\s*\{[\s\S]*background:\s*transparent;[\s\S]*color:\s*var\(--text-muted\);/);
  assert.match(reviewCss, /\.review-execute-button\s*\{[\s\S]*background:\s*rgba\(var\(--interactive-accent-rgb\), \.1\);[\s\S]*color:\s*var\(--text-accent\);/);
  assert.match(reviewCss, /\.review-execute-button:disabled,[\s\S]*\.review-clear-button:disabled\s*\{[\s\S]*opacity:\s*\.45;/);
  assert.match(reviewCss, /\.review-basket-item-status\s*\{[\s\S]*display:\s*inline-grid;[\s\S]*border-radius:\s*999px;/);
  assert.match(reviewCss, /\.review-basket-item\[data-status="failed"\] \.review-basket-item-status/);
  assert.match(reviewCss, /\.review-status-icon/);
  assert.match(reviewCss, /\.review-status-dot/);
});
test('vault panel layout places files and actions above full-width preview', () => {
  const shell = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');
  const layoutCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');

  assert.match(shell, /class="selection-actions-pane"/);
  assert.match(shell, /data-future-slot="selection-actions"/);
  assert.match(layoutCss, /\.vault-panel\s*\{[\s\S]*display:\s*grid;/);
  assert.match(layoutCss, /grid-template-columns:\s*minmax\(var\(--min-file-tree-width\), var\(--file-tree-width\)\)\s+7px\s+minmax\(220px, 1fr\);/);
  assert.match(layoutCss, /grid-template-rows:\s*minmax\(180px, var\(--vault-top-height, 38%\)\)\s+7px\s+minmax\(var\(--min-preview-width\), 1fr\);/);
  assert.match(layoutCss, /\.files-pane > #file-panel\s*\{[\s\S]*height:\s*100%;[\s\S]*overflow:\s*hidden;/);
  assert.match(layoutCss, /\.preview-pane\s*\{[\s\S]*grid-column:\s*1 \/ -1;/);
});
test('vault panel exposes horizontal and vertical resize handles', () => {
  const shell = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');
  const resizeSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'layout', 'paneResize.js'), 'utf8');
  const tokensCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'tokens.css'), 'utf8');

  assert.match(shell, /data-resize="files"/);
  assert.match(shell, /data-resize="preview"/);
  assert.match(resizeSource, /const previewHandle = app\.querySelector\('\[data-resize="preview"\]'\)/);
  assert.match(resizeSource, /function resizePreview\(app, clientY\)/);
  assert.match(resizeSource, /--vault-top-height/);
  assert.match(tokensCss, /--vault-top-height:\s*38%;/);
});

test('chat pending messages expose a lightweight spinner animation', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');

  assert.match(css, /\.chat-message-pending \.chat-message-body::before/);
  assert.match(css, /@keyframes zeus-pending-spin/);
});
test('chat message metadata appears on hover with copy affordance', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');

  assert.match(css, /\.chat-message-meta/);
  assert.match(css, /\.chat-message:hover \.chat-message-meta/);
  assert.match(css, /\.chat-message-copy/);
});
test('file tree uses local SVG icon sizing instead of unicode pseudo icons', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'files.css'), 'utf8');

  assert.match(css, /\.zeus-icon/);
  assert.match(css, /\.file-row-chevron-icon/);
  assert.match(css, /grid-template-columns:\s*auto 30px minmax\(0, 1fr\)/);
  assert.doesNotMatch(css, /file-row-icon::before/);
});
test('Markdown history icons are filtered for dark UI visibility', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'markdown.css'), 'utf8');

  assert.match(css, /\.markdown-history-icon\s*\{[\s\S]*filter:\s*brightness\(0\) invert\(1\)/);
});

test('Markdown properties use dedicated metadata styling tokens', () => {
  const tokensCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'tokens.css'), 'utf8');
  const markdownCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'markdown.css'), 'utf8');

  assert.match(tokensCss, /--metadata-accent:/);
  assert.match(tokensCss, /--metadata-background:/);
  assert.match(tokensCss, /--metadata-border:/);
  assert.match(markdownCss, /\.markdown-properties\s*\{[\s\S]*border:\s*1px solid var\(--metadata-border\);/);
  assert.match(markdownCss, /\.markdown-properties\s*\{[\s\S]*background:\s*var\(--metadata-background\);/);
  assert.match(markdownCss, /\.markdown-properties dt\s*\{[\s\S]*color:\s*var\(--text-muted\);/);
  assert.match(markdownCss, /\.markdown-properties dd\s*\{[\s\S]*color:\s*var\(--metadata-accent\);/);
});
test('review basket failed item errors use review stylesheet', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'review.css'), 'utf8');

  assert.match(css, /review-basket-error-summary/);
  assert.match(css, /--status-danger/);
});
test('readability tokens activate bundled Inter and avoid ultra-heavy UI weights', () => {
  const tokensCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'tokens.css'), 'utf8');
  const filesCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'files.css'), 'utf8');
  const layoutCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');

  assert.match(tokensCss, /--font-interface:\s*'Inter', 'Segoe UI'/);
  assert.match(tokensCss, /--text-muted:\s*#8a8a8a;/);
  assert.match(tokensCss, /--font-weight-ui-strong:\s*700;/);
  assert.doesNotMatch(filesCss, /font-weight:\s*900;/);
  assert.doesNotMatch(layoutCss, /font-size:\s*9px;/);
});
test('chat input uses auto-grow styling instead of manual resize', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');

  assert.match(css, /\.chat-input-shell\s*\{[\s\S]*resize:\s*none;[\s\S]*overflow-y:\s*hidden;/);
  assert.match(css, /\.selection-action-form textarea\s*\{[\s\S]*resize:\s*vertical;/);
});

test('left navigation keeps settings in a separate bottom group', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'layout.css'), 'utf8');

  assert.match(css, /\.left-nav-actions\s*\{[\s\S]*flex:\s*1 1 auto;/);
  assert.match(css, /\.left-nav-group-settings\s*\{[\s\S]*margin-top:\s*auto;/);
  assert.match(css, /\.left-nav-group-settings\s*\{[\s\S]*border-top:\s*1px solid var\(--background-modifier-border\);/);
});