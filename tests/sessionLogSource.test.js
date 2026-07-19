'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('session log modules load after workspace state and before shell', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const workspaceIndex = html.indexOf('./src/renderer/workspace/workspaceState.js');
  const activityStateIndex = html.indexOf('./src/renderer/activity/activityState.js');
  const mountIndex = html.indexOf('./src/renderer/activity/mountSessionLog.js');
  const shellIndex = html.indexOf('./src/renderer/shell/mountShell.js');

  assert.equal(workspaceIndex > -1, true);
  assert.equal(activityStateIndex > workspaceIndex, true);
  assert.equal(mountIndex > activityStateIndex, true);
  assert.equal(shellIndex > mountIndex, true);
});

test('session log renderer owns display without vault or provider access', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'activity', 'mountSessionLog.js'), 'utf8');

  assert.match(source, /mountSessionLog/);
  assert.match(source, /session-log-entry/);
  assert.match(source, /session-log-empty/);
  assert.doesNotMatch(source, /api\.vault/);
  assert.doesNotMatch(source, /api\.chat/);
});

test('shell wires Session Log as a bottom-status controlled workspace panel', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');

  assert.doesNotMatch(source, /data-workspace-tab="sessionLog"/);
  assert.match(source, /data-workspace-panel="sessionLog"/);
  assert.match(source, /data-activity-drawer-toggle/);
  assert.match(source, /wireActivityDrawer/);
  assert.match(source, /createActivityState/);
  assert.match(source, /mountSessionLog/);
});

test('session log styles stay isolated in activity stylesheet', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'activity.css'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.match(html, /styles\/activity\.css/);
  assert.match(css, /\.session-log-workspace\s*\{/);
  assert.match(css, /\.session-log-entry-warning/);
});
test('activity reporter loads before the shell and is wired into file and chat flows', () => {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const bootstrap = fs.readFileSync(path.join(root, 'src', 'renderer', 'bootstrap.js'), 'utf8');
  const shell = fs.readFileSync(path.join(root, 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');
  const filePanel = fs.readFileSync(path.join(root, 'src', 'renderer', 'files', 'mountFilePanel.js'), 'utf8');
  const chat = fs.readFileSync(path.join(root, 'src', 'renderer', 'chat', 'mountChat.js'), 'utf8');
  const reporterIndex = html.indexOf('./src/renderer/activity/activityReporter.js');
  const shellIndex = html.indexOf('./src/renderer/shell/mountShell.js');

  assert.equal(reporterIndex > -1, true);
  assert.equal(reporterIndex < shellIndex, true);
  assert.match(bootstrap, /VitruviosActivityReporter/);
  assert.match(shell, /createActivityReporter\(\{ status: globalStatus, activityState \}\)/);
  assert.match(shell, /activityReporter/);
  assert.match(filePanel, /const activityReporter = options\.activityReporter \|\| null/);
  assert.match(chat, /const activityReporter = options\.activityReporter \|\| null/);
  assert.match(filePanel, /action: 'Renamed'/);
  assert.match(filePanel, /action: 'Listed folder'/);
  assert.match(filePanel, /action: 'Read file'/);
  assert.match(chat, /action: 'Provider response'/);
  assert.match(chat, /action: 'Provider error'/);
});
