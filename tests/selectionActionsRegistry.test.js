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

test('registry returns V1 actions for selected Markdown files', () => {
  const actions = getSelectionActions({ kind: 'file', path: 'A.md', content: '# A', readAllowed: true });

  assert.deepEqual(actions.map((action) => action.id), [
    'file.summarize',
    'file.useAsContext',
    'file.findSimilar',
    'file.suggestTags',
    'file.proposeUpdate'
  ]);
  assert.deepEqual(actions.map((action) => action.category), ['read', 'context', 'read', 'write', 'write']);
  assert.equal(actions.find((action) => action.id === 'file.useAsContext').enabled, true);
  assert.equal(actions.find((action) => action.id === 'file.summarize').enabled, true);
  assert.equal(actions.find((action) => action.id === 'file.findSimilar').enabled, true);
  assert.equal(actions.find((action) => action.id === 'file.suggestTags').enabled, true);
});

test('Markdown read actions stay clickable and soft-disabled without readable loaded content', () => {
  const withoutRead = getSelectionActions({ kind: 'file', path: 'A.md', content: '# A', readAllowed: false });
  const withoutContent = getSelectionActions({ kind: 'file', path: 'A.md', content: '', readAllowed: true });

  assert.equal(withoutRead.find((action) => action.id === 'file.useAsContext').enabled, true);
  assert.equal(withoutContent.find((action) => action.id === 'file.useAsContext').enabled, true);
  assert.equal(withoutRead.find((action) => action.id === 'file.summarize').enabled, true);
  assert.equal(withoutContent.find((action) => action.id === 'file.summarize').enabled, true);
  assert.equal(withoutRead.find((action) => action.id === 'file.useAsContext').softDisabled, true);
  assert.equal(withoutContent.find((action) => action.id === 'file.summarize').softDisabled, true);
});

test('registry returns V1 read actions for selected folders', () => {
  const actions = getSelectionActions({ kind: 'folder', path: '03_Knowledge', readAllowed: true });

  assert.deepEqual(actions.map((action) => action.id), [
    'folder.useAsContext',
    'folder.listCurrent',
    'folder.analyze',
    'folder.summarizeMarkdown'
  ]);
  assert.deepEqual(actions.map((action) => action.category), ['context', 'read', 'read', 'read']);
  assert.equal(actions.find((action) => action.id === 'folder.useAsContext').enabled, true);
  assert.equal(actions.find((action) => action.id === 'folder.listCurrent').enabled, true);
  assert.equal(actions.find((action) => action.id === 'folder.analyze').enabled, true);
  assert.equal(actions.find((action) => action.id === 'folder.summarizeMarkdown').enabled, true);
});
test('folder read actions stay clickable and soft-disabled without read permission', () => {
  const withoutRead = getSelectionActions({ kind: 'folder', path: '03_Knowledge', readAllowed: false });
  const action = withoutRead.find((item) => item.id === 'folder.useAsContext');

  assert.equal(action.enabled, true);
  assert.equal(action.softDisabled, true);
  assert.equal(action.reason, 'Requires R on this folder.');
});
test('Markdown update action stays clickable while permission gate lives in the runner', () => {
  const ready = getSelectionActions({ kind: 'file', path: 'A.md', content: '# A', readAllowed: true, writeAllowed: true });
  const withoutWrite = getSelectionActions({ kind: 'file', path: 'A.md', content: '# A', readAllowed: true, writeAllowed: false });
  const withoutRead = getSelectionActions({ kind: 'file', path: 'A.md', content: '# A', readAllowed: false, writeAllowed: true });

  const propose = ready.find((action) => action.id === 'file.proposeUpdate');
  assert.equal(propose.enabled, true);
  assert.equal(propose.label, 'Propose content update');
  assert.equal(propose.requiredPermission, 'write');
  assert.equal(propose.reason, '');
  assert.equal(withoutWrite.find((action) => action.id === 'file.proposeUpdate').enabled, true);
  assert.equal(withoutRead.find((action) => action.id === 'file.proposeUpdate').enabled, true);
  assert.match(withoutWrite.find((action) => action.id === 'file.proposeUpdate').reason, /Requires R, W/);
  assert.equal(propose.softDisabled, false);
  assert.equal(withoutWrite.find((action) => action.id === 'file.proposeUpdate').softDisabled, true);
  assert.equal(withoutRead.find((action) => action.id === 'file.proposeUpdate').softDisabled, true);
});

test('permission text helper keeps read and write guidance centralized', () => {
  const text = require('../src/renderer/selectionActions/permissionText');

  assert.equal(text.fileReadReason(), 'Requires R and loaded Markdown content.');
  assert.equal(text.folderReadReason(), 'Requires R on this folder.');
  assert.equal(text.fileWriteReason(), 'Requires R, W, and loaded Markdown content.');
  assert.equal(
    text.missingPermissionMessage({ actionId: 'file.proposeUpdate', requiredPermission: 'write', targetKind: 'file', path: 'A.md' }),
    'Please enable R and W for this file before proposing a content update: A.md'
  );
  assert.equal(
    text.missingPermissionMessage({ actionId: 'file.suggestTags', requiredPermission: 'write', targetKind: 'file', path: 'A.md' }),
    'Please enable R and W for this file before suggesting tag updates: A.md'
  );
});

test('registry exposes compact semantic presentation for file and folder actions', () => {
  const fileActions = getSelectionActions({ kind: 'file', path: 'A.md', content: '# A', readAllowed: true, writeAllowed: true });
  const folderActions = getSelectionActions({ kind: 'folder', path: '03_Knowledge', readAllowed: true });

  assert.deepEqual(fileActions.map((action) => [action.id, action.shortLabel, action.icon, action.executionKind]), [
    ['file.summarize', 'Summary', 'actionSummary', 'provider'],
    ['file.useAsContext', 'Context', 'actionContextFile', 'app'],
    ['file.findSimilar', 'Similar', 'actionSimilar', 'embedding'],
    ['file.suggestTags', 'Tags', 'actionTags', 'app'],
    ['file.proposeUpdate', 'Update', 'actionUpdate', 'provider']
  ]);
  assert.deepEqual(folderActions.map((action) => [action.id, action.shortLabel, action.icon, action.executionKind]), [
    ['folder.useAsContext', 'Context', 'actionContextFile', 'app'],
    ['folder.listCurrent', 'List', 'actionListFolder', 'app'],
    ['folder.analyze', 'Analyze', 'actionAnalyzeFolder', 'app'],
    ['folder.summarizeMarkdown', 'Summary', 'actionSummaryFolder', 'provider']
  ]);
  assert.match(fileActions.find((action) => action.id === 'file.summarize').description, /local provider/i);
  assert.match(folderActions.find((action) => action.id === 'folder.analyze').description, /without model/i);
});