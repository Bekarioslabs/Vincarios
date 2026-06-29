'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ACTION_CATEGORIES, getActionCategory } = require('../src/renderer/selectionActions/actionCategories');
const { getSelectionActions, getTargetKind } = require('../src/renderer/selectionActions/actionRegistry');

test('selection action categories expose stable tones by behavior', () => {
  assert.equal(ACTION_CATEGORIES.context.tone, 'context');
  assert.equal(ACTION_CATEGORIES.read.tone, 'read');
  assert.equal(ACTION_CATEGORIES.write.tone, 'write');
  assert.equal(getActionCategory('context').label, 'Context');
});

test('registry resolves selected target kinds without using prompt text', () => {
  assert.equal(getTargetKind({ kind: 'folder', path: '03_Knowledge' }), 'folder');
  assert.equal(getTargetKind({ kind: 'file', path: 'A.md' }), 'markdown');
  assert.equal(getTargetKind({ kind: 'file', path: 'image.png' }), 'file');
  assert.equal(getTargetKind({ kind: 'none' }), 'none');
});

test('registry returns three V1 actions for selected Markdown files', () => {
  const actions = getSelectionActions({ kind: 'file', path: 'A.md', content: '# A', readAllowed: true });

  assert.deepEqual(actions.map((action) => action.id), [
    'file.summarize',
    'file.useAsContext',
    'file.proposeUpdate'
  ]);
  assert.deepEqual(actions.map((action) => action.category), ['read', 'context', 'write']);
  assert.equal(actions.find((action) => action.id === 'file.useAsContext').enabled, true);
  assert.equal(actions.find((action) => action.id === 'file.summarize').enabled, true);
});

test('Markdown read actions require readable loaded Markdown content', () => {
  const withoutRead = getSelectionActions({ kind: 'file', path: 'A.md', content: '# A', readAllowed: false });
  const withoutContent = getSelectionActions({ kind: 'file', path: 'A.md', content: '', readAllowed: true });

  assert.equal(withoutRead.find((action) => action.id === 'file.useAsContext').enabled, false);
  assert.equal(withoutContent.find((action) => action.id === 'file.useAsContext').enabled, false);
  assert.equal(withoutRead.find((action) => action.id === 'file.summarize').enabled, false);
  assert.equal(withoutContent.find((action) => action.id === 'file.summarize').enabled, false);
});

test('registry returns three V1 actions for selected folders', () => {
  const actions = getSelectionActions({ kind: 'folder', path: '03_Knowledge', readAllowed: true });

  assert.deepEqual(actions.map((action) => action.id), [
    'folder.useAsContext',
    'folder.listCurrent',
    'folder.analyze'
  ]);
  assert.deepEqual(actions.map((action) => action.category), ['context', 'read', 'read']);
  assert.equal(actions.find((action) => action.id === 'folder.useAsContext').enabled, true);
});
test('folder read actions require read permission', () => {
  const withoutRead = getSelectionActions({ kind: 'folder', path: '03_Knowledge', readAllowed: false });
  const action = withoutRead.find((item) => item.id === 'folder.useAsContext');

  assert.equal(action.enabled, false);
  assert.equal(action.reason, 'Requires R on this folder.');
});
