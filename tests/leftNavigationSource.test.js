'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readShellSource() {
  return fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');
}

test('left navigation is grouped into workspace create vault and settings areas', () => {
  const source = readShellSource();

  const workspace = source.indexOf('left-nav-group-workspace');
  const create = source.indexOf('left-nav-group-create');
  const vault = source.indexOf('left-nav-group-vault');
  const settings = source.indexOf('left-nav-group-settings');

  assert.equal(workspace > -1, true);
  assert.equal(create > -1, true);
  assert.equal(vault > -1, true);
  assert.equal(settings > -1, true);
  assert.equal(workspace < create, true);
  assert.equal(create < vault, true);
  assert.equal(vault < settings, true);
});

test('open vault is the primary action inside the vault group', () => {
  const source = readShellSource();
  const vault = source.indexOf('left-nav-group-vault');
  const openVault = source.indexOf('left-button left-button-accent', vault);
  const settings = source.indexOf('left-nav-group-settings', vault);

  assert.equal(vault > -1, true);
  assert.equal(openVault > -1, true);
  assert.equal(settings > -1, true);
  assert.equal(openVault < settings, true);
});

test('session log is a real workspace action, not a disabled placeholder', () => {
  const source = readShellSource();
  const workspace = source.indexOf('left-nav-group-workspace');
  const create = source.indexOf('left-nav-group-create');
  const workspaceBlock = source.slice(workspace, create);

  assert.match(workspaceBlock, /data-workspace-tab="sessionLog"/);
  assert.doesNotMatch(workspaceBlock, /data-future-slot="session-log"/);
  assert.doesNotMatch(workspaceBlock, /data-workspace-tab="sessionLog"[^>]*disabled/);
});
test('create section has separate note and project preset toggles', () => {
  const source = readShellSource();
  const create = source.indexOf('left-nav-group-create');
  const vault = source.indexOf('left-nav-group-vault');
  const createBlock = source.slice(create, vault);

  assert.equal(create > -1, true);
  assert.match(createBlock, /data-toggle="note-presets"/);
  assert.match(createBlock, /id="note-presets"/);
  assert.match(createBlock, /data-toggle="project-presets"/);
  assert.match(createBlock, /id="project-presets"/);
  assert.match(createBlock, /data-preset-list="note"/);
  assert.match(createBlock, /data-preset-list="project"/);
  assert.doesNotMatch(createBlock, />Project Presets</);
});