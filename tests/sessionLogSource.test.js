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

test('shell wires session log as a workspace panel', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shell', 'mountShell.js'), 'utf8');

  assert.match(source, /data-workspace-tab="sessionLog"/);
  assert.match(source, /data-workspace-panel="sessionLog"/);
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
