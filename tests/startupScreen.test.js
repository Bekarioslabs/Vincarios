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

test('startup logo keeps the final square mark fully visible', () => {
  const root = path.join(__dirname, '..');
  const layout = fs.readFileSync(path.join(root, 'src', 'renderer', 'styles', 'startup.css'), 'utf8');

  assert.match(layout, /\.start-logo-slot\s*\{[\s\S]*width:\s*164px;[\s\S]*height:\s*164px;[\s\S]*overflow:\s*visible;/);
  assert.match(layout, /\.start-logo-slot img\s*\{[\s\S]*width:\s*100%;[\s\S]*height:\s*100%;[\s\S]*object-fit:\s*contain;/);
});
test('startup module is loaded before the shell and registered during bootstrap', () => {
  const root = path.join(__dirname, '..');
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const bootstrap = fs.readFileSync(path.join(root, 'src', 'renderer', 'bootstrap.js'), 'utf8');
  const shell = fs.readFileSync(path.join(root, 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');

  assert.match(index, /startup\/mountStartupScreen\.js/);
  assert.match(bootstrap, /VincariosStartup/);
  assert.match(shell, /assets\/brand\/vincarios-logo-dark\.svg/);
  assert.match(shell, /assets\/brand\/vincarios-logo-light\.svg/);
  assert.equal(fs.existsSync(path.join(root, 'src', 'renderer', 'assets', 'brand', 'vincarios-icon.png')), true);
  assert.equal(fs.existsSync(path.join(root, 'src', 'renderer', 'assets', 'brand', 'vincarios-logo-dark.svg')), true);
  assert.equal(fs.existsSync(path.join(root, 'src', 'renderer', 'assets', 'brand', 'vincarios-logo-light.svg')), true);
  assert.match(shell, /<span>vinca<\/span><span>rios<\/span>/);
  assert.match(shell, /mountStartupScreen\(\{ app, api, onOpenRecent: openRecentVault \}\)/);
  assert.match(shell, /api\.vault\.setRoot\(root\)/);
});
