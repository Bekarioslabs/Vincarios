'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('vault home is registered as a first-class workspace', () => {
  const shell = read('src/renderer/shell/mountShell.js');
  const bootstrap = read('src/renderer/bootstrap.js');
  const html = read('index.html');

  assert.match(shell, /data-workspace-tab="home"/);
  assert.match(shell, /data-workspace-panel="home"/);
  assert.match(shell, /mountVaultHome/);
  assert.match(bootstrap, /VincariosVaultHome/);
  assert.equal(html.indexOf('./src/renderer/home/mountVaultHome.js') > -1, true);
});

test('vault home uses the local recent-files API and provides open and reveal actions', () => {
  const source = read('src/renderer/home/mountVaultHome.js');

  assert.match(source, /api\.vault\.listRecentFiles/);
  assert.match(source, /onOpen/);
  assert.match(source, /onReveal/);
});

test('vault home refreshes its local recent list after a vault change event', () => {
  const source = read('src/renderer/home/mountVaultHome.js');

  assert.match(source, /api\.vault\.onChanged/);
  assert.match(source, /activeWorkspace === 'home'/);
  assert.match(source, /refresh\(\)/);
});
test('markdown preview waits for recent-file persistence before open succeeds', () => {
  const source = read('src/renderer/files/mountFilePanel.js');

  assert.match(source, /function recordRecentMarkdown/);
  assert.match(source, /onRecentFileRecorded/);
  assert.match(source, /result && result\.ok !== false && onRecentFileRecorded/);
  assert.match(source, /await recordRecentMarkdown\(read\.path\)/);
});
test('vault home presents local inventory, index health, and existing workspace shortcuts', () => {
  const source = read('src/renderer/home/mountVaultHome.js');

  assert.match(source, /api\.vault\.getInventory/);
  assert.match(source, /api\.vault\.listFolder\('\'\)/);
  assert.match(source, /api\.indexes\.getHealth/);
  assert.match(source, /Vault Health/);
  assert.match(source, /Unassigned root items/);
  assert.match(source, /entry\.kind === 'markdown' \|\| entry\.kind === 'image'/);
  assert.match(source, /Search Vault/);
  assert.match(source, /Open Review Basket/);
  assert.match(source, /Open Chat/);
});
test('vault home opens root items through the file panel entry boundary', () => {
  const shell = read('src/renderer/shell/mountShell.js');
  const panel = read('src/renderer/files/mountFilePanel.js');

  assert.match(shell, /filePanel\.openVaultEntry/);
  assert.match(panel, /async function openVaultEntry/);
  assert.match(panel, /isImagePath\(normalizedPath\)/);
});
test('vault home subscribes to live index health and exposes Review Basket navigation', () => {
  const source = read('src/renderer/home/mountVaultHome.js');

  assert.match(source, /api\.indexes\.onHealthChanged/);
  assert.match(source, /onOpenReviewBasket/);
  assert.match(source, /openReviewBasket/);
});
test('vault home receives successful recent-file updates through shell composition', () => {
  const shell = read('src/renderer/shell/mountShell.js');
  const home = read('src/renderer/home/mountVaultHome.js');

  assert.match(shell, /vaultUi\.vaultHomeController = mountOptional/);
  assert.match(shell, /onRecentFileRecorded/);
  assert.match(shell, /controller\.refreshRecentFiles\(\)/);
  assert.match(home, /async function refreshRecentFiles/);
  assert.match(home, /Object\.freeze\(\{ refresh, refreshRecentFiles \}\)/);
});
