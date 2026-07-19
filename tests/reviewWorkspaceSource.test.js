'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('Review Basket is a first-class workspace while Context Basket remains in Chat', () => {
  const shell = read('src/renderer/shell/mountShell.js');

  assert.match(shell, /data-workspace-tab="review"/);
  assert.match(shell, /data-workspace-panel="review"/);
  assert.match(shell, /id="context-basket"/);
  assert.doesNotMatch(shell, /data-future-slot="review-basket-nav"/);
});

test('Session Log is opened from the bottom status surface rather than left navigation', () => {
  const shell = read('src/renderer/shell/mountShell.js');

  assert.doesNotMatch(shell, /data-workspace-tab="sessionLog"/);
  assert.match(shell, /data-activity-drawer-toggle/);
  assert.match(shell, /wireActivityDrawer/);
});

test('Inbox Review always activates Chat before writing its report', () => {
  const shell = read('src/renderer/shell/mountShell.js');
  const cleanup = read('src/renderer/cleanup/mountInboxCleanup.js');

  assert.match(shell, /mountInboxCleanup\(\{ api, app, status: globalStatus, reviewBasket, onOpenChat:/);
  assert.match(cleanup, /onOpenChat/);
  assert.match(cleanup, /onOpenChat\(\)/);
});

test('Suggestions use the distinct list-todo Lucide icon', () => {
  const registry = read('src/renderer/icons/iconRegistry.js');

  assert.match(registry, /navigationSuggestions:\s*'list-todo\.svg'/);
  assert.equal(fs.existsSync(path.join(root, 'src', 'renderer', 'assets', 'icons', 'lucide', 'list-todo.svg')), true);
});