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
  const openVault = source.indexOf('left-button ui-flat-row left-button-accent', vault);
  const settings = source.indexOf('left-nav-group-settings', vault);

  assert.equal(vault > -1, true);
  assert.equal(openVault > -1, true);
  assert.equal(settings > -1, true);
  assert.equal(openVault < settings, true);
});

test('Review Basket is a real workspace action and Session Log stays out of navigation', () => {
  const source = readShellSource();
  const workspace = source.indexOf('left-nav-group-workspace');
  const create = source.indexOf('left-nav-group-create');
  const workspaceBlock = source.slice(workspace, create);

  assert.match(workspaceBlock, /data-workspace-tab="review"/);
  assert.doesNotMatch(workspaceBlock, /data-workspace-tab="review"[^>]*disabled/);
  assert.doesNotMatch(workspaceBlock, /data-workspace-tab="sessionLog"/);
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
test('settings navigation uses the semantic settings icon', () => {
  const source = readShellSource();

  assert.match(source, /data-open-settings data-left-icon="settings"/);
  assert.match(source, /function renderLeftNavigationIcons/);
  assert.match(source, /renderer\.createIconElement\(iconName, 'left-button-icon'\)/);
});
test('left navigation has semantic icons and a persisted icon-rail toggle', () => {
  const source = readShellSource();

  assert.match(source, /data-left-nav-toggle/);
  assert.match(source, /data-left-icon="navigationChat"/);
  assert.match(source, /data-left-icon="navigationOpenVault"/);
  assert.match(source, /function wireLeftNavigationPanelLayout/);
  assert.match(source, /setPanelCollapsed\('leftNav', collapsed\)/);
  assert.match(source, /app\.classList\.toggle\('is-left-nav-collapsed', collapsed\)/);
  assert.match(source, /navigation\.querySelectorAll\('\[data-toggle\]'\)\.forEach/);
  assert.match(source, /if \(panelLayoutState\.snapshot\(\)\.leftNavCollapsed\) setCollapsed\(false\);/);
});

test('expanded navigation actions use the shared flat row primitive', () => {
  const source = readShellSource();

  assert.match(source, /class=\"left-button ui-flat-row left-button-current\"/);
  assert.match(source, /class=\"left-button ui-flat-row left-button-accent\"/);
});