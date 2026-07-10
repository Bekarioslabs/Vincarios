'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createWorkspaceState, WORKSPACES } = require('../src/renderer/workspace/workspaceState');

test('workspace state defaults to chat and exposes known workspace ids', () => {
  const state = createWorkspaceState();

  assert.deepEqual(WORKSPACES, ['chat', 'suggestions', 'sessionLog']);
  assert.equal(state.snapshot().activeWorkspace, 'chat');
});

test('workspace state switches to suggestions and notifies subscribers', () => {
  const state = createWorkspaceState();
  const snapshots = [];
  const unsubscribe = state.subscribe((snapshot) => snapshots.push(snapshot.activeWorkspace));

  state.setActiveWorkspace('suggestions');

  assert.equal(state.snapshot().activeWorkspace, 'suggestions');
  assert.deepEqual(snapshots, ['suggestions']);
  unsubscribe();
  state.setActiveWorkspace('chat');
  assert.deepEqual(snapshots, ['suggestions']);
});

test('workspace state falls back to chat for unknown workspace ids', () => {
  const state = createWorkspaceState({ activeWorkspace: 'suggestions' });

  state.setActiveWorkspace('unknown');

  assert.equal(state.snapshot().activeWorkspace, 'chat');
});

const fs = require('node:fs');
const path = require('node:path');

test('workspace state script loads before shell', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const workspaceIndex = html.indexOf('./src/renderer/workspace/workspaceState.js');
  const shellIndex = html.indexOf('./src/renderer/shell/mountShell.js');

  assert.equal(workspaceIndex > -1, true);
  assert.equal(shellIndex > workspaceIndex, true);
});
