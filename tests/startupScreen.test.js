'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { normalizeRecentVaults, createRecentVault } = require('../src/renderer/startup/mountStartupScreen');

test('startup recent vaults normalize paths, de-duplicate, and retain two entries', () => {
  const recent = normalizeRecentVaults([
    { path: 'D:\\Vaults\\One', name: 'One' },
    { path: 'D:/Vaults/One/', name: 'Duplicate' },
    { path: 'D:/Vaults/Two', name: '' },
    { path: 'D:/Vaults/Three', name: 'Three' }
  ]);

  assert.deepEqual(recent.map((entry) => entry.path), ['D:/Vaults/One', 'D:/Vaults/Two']);
  assert.equal(recent[1].name, 'Two');
});

test('startup recent vault entry derives a stable visible vault name', () => {
  const entry = createRecentVault('D:\\Vaults\\Research\\');
  assert.equal(entry.path, 'D:/Vaults/Research');
  assert.equal(entry.name, 'Research');
  assert.match(entry.lastOpenedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test('startup module is loaded before the shell and registered during bootstrap', () => {
  const root = path.join(__dirname, '..');
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const bootstrap = fs.readFileSync(path.join(root, 'src', 'renderer', 'bootstrap.js'), 'utf8');
  const shell = fs.readFileSync(path.join(root, 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');

  assert.match(index, /startup\/mountStartupScreen\.js/);
  assert.match(bootstrap, /VitruviosStartup/);
  assert.match(shell, /assets\/brand\/vitruvios-logo-placeholder_white\.svg/);
  assert.match(shell, /<span>vitru<\/span><span>vios<\/span>/);
  assert.match(shell, /mountStartupScreen\(\{ app, api, onOpenRecent: openRecentVault \}\)/);
  assert.match(shell, /api\.vault\.setRoot\(root\)/);
});
