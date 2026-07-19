'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('global status activity control keeps the themed status-bar surface', () => {
  const css = read('src/renderer/styles/layout.css');

  assert.match(css, /\.status-bar-global-button\s*\{[\s\S]*background:\s*transparent;/);
  assert.match(css, /\.status-bar-global-button\s*\{[\s\S]*color:\s*var\(--text-muted\);/);
});

test('Inbox Review reports retain the shared Save as Note review flow', () => {
  const shell = read('src/renderer/shell/mountShell.js');
  const cleanup = read('src/renderer/cleanup/mountInboxCleanup.js');

  assert.match(shell, /mountInboxCleanup\(\{ api, app, status: globalStatus, reviewBasket, onOpenChat:/);
  assert.match(cleanup, /const reviewBasket = options\.reviewBasket \|\| null;/);
  assert.match(cleanup, /appendReportMessage\(chatLog, markdown, \{ reviewBasket, status,/);
});

test('Review workspace keeps rows compact instead of stretching them across available height', () => {
  const css = read('src/renderer/styles/review.css');

  assert.match(css, /\.review-basket-items\s*\{[\s\S]*align-content:\s*start;/);
  assert.match(css, /\.review-basket-items\s*\{[\s\S]*grid-auto-rows:\s*min-content;/);
});