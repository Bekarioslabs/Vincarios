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

  assert.match(css, /grid-template-columns:\s*auto\s+14px\s+minmax\(0, 1fr\);/);
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
  assert.match(reviewCss, /\.review-basket-item-status\s*\{[\s\S]*border-radius:\s*999px;[\s\S]*letter-spacing:\s*\.06em;/);
  assert.match(reviewCss, /\.review-basket-item\[data-status="failed"\] \.review-basket-item-status/);
  assert.match(reviewCss, /\.review-basket-item\[data-type="create_note"\] \.review-basket-item-status/);
});
