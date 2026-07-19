'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getWorkspaceShortcut, normalizeWorkspaceCommand } = require('../src/renderer/workspace/workspaceShortcuts');

test('workspace shortcuts map only explicit Ctrl/Cmd navigation commands', () => {
  assert.equal(getWorkspaceShortcut({ key: 'f', ctrlKey: true, metaKey: false, shiftKey: false, altKey: false }).workspace, 'search');
  assert.equal(getWorkspaceShortcut({ key: 'S', ctrlKey: true, metaKey: false, shiftKey: true, altKey: false }).workspace, 'suggestions');
  assert.equal(getWorkspaceShortcut({ key: 'h', ctrlKey: false, metaKey: true, shiftKey: true, altKey: false }).workspace, 'home');
  assert.equal(getWorkspaceShortcut({ key: ',', ctrlKey: true, metaKey: false, shiftKey: false, altKey: false }).action, 'settings');
  assert.equal(getWorkspaceShortcut({ key: 'r', ctrlKey: true, metaKey: false, shiftKey: true, altKey: false }), null);
  assert.equal(getWorkspaceShortcut({ key: 'f', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false }), null);
});
test('workspace menu commands accept only known destinations', () => {
  assert.equal(normalizeWorkspaceCommand('review'), 'review');
  assert.equal(normalizeWorkspaceCommand('SETTINGS'), 'settings');
  assert.equal(normalizeWorkspaceCommand('refresh-indexes'), '');
  assert.equal(normalizeWorkspaceCommand(''), '');
});