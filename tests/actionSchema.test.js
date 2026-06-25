'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ACTION_TYPES,
  normalizeActionProposal,
  createActionFingerprint,
  isKnownActionType,
  isWriteActionType,
  isExecutableActionType
} = require('../src/shared/actions/actionSchema');

test('action schema exposes stable V1 action type constants', () => {
  assert.equal(ACTION_TYPES.createNote, 'create_note');
  assert.equal(ACTION_TYPES.updateNote, 'update_note');
  assert.equal(ACTION_TYPES.insertIntoNote, 'insert_into_note');
  assert.equal(ACTION_TYPES.moveNote, 'move_note');
  assert.equal(ACTION_TYPES.renameNote, 'rename_note');
  assert.equal(ACTION_TYPES.archiveNote, 'archive_note');
  assert.equal(ACTION_TYPES.proposalPlan, 'proposal_plan');
});

test('action schema normalizes create note proposals for review', () => {
  const item = normalizeActionProposal({
    type: 'create_note',
    title: 'Saved Answer',
    targetFolder: '00_Inbox',
    content: '# Saved Answer',
    reason: 'User asked to save it.'
  }, { id: 'proposal-1' });

  assert.equal(item.id, 'proposal-1');
  assert.equal(item.type, 'create_note');
  assert.equal(item.category, 'create');
  assert.equal(item.status, 'open');
  assert.equal(item.selected, true);
  assert.equal(item.risk, 'low');
  assert.equal(item.requiresDiff, false);
  assert.equal(item.requiresBackup, false);
  assert.equal(item.executable, true);
  assert.equal(item.fingerprint, createActionFingerprint(item));
});

test('existing-file write actions require diff and backup before execution exists', () => {
  const item = normalizeActionProposal({
    type: 'update_note',
    title: 'Update project note',
    targetPath: '02_Projekte/StarLu/StarLu.md',
    reason: 'Add missing link.'
  }, { id: 'proposal-2' });

  assert.equal(item.category, 'update');
  assert.equal(item.selected, false);
  assert.equal(item.requiresDiff, true);
  assert.equal(item.requiresBackup, true);
  assert.equal(item.executable, true);
});

test('unknown action types become manual review items, not executable actions', () => {
  const item = normalizeActionProposal({
    type: 'delete_note',
    title: 'Delete note'
  }, { id: 'proposal-3' });

  assert.equal(item.type, 'manual_review');
  assert.equal(item.category, 'manual review');
  assert.equal(item.selected, false);
  assert.equal(item.executable, false);
  assert.equal(item.validation.code, 'unknown_action_type');
});

test('action type helpers distinguish known, write, and executable actions', () => {
  assert.equal(isKnownActionType('create_note'), true);
  assert.equal(isKnownActionType('delete_note'), false);
  assert.equal(isWriteActionType('rename_note'), true);
  assert.equal(isWriteActionType('read_note'), false);
  assert.equal(isExecutableActionType('create_note'), true);
  assert.equal(isExecutableActionType('update_note'), true);
});

test('future write workflow actions stay non-executable until their services exist', () => {
  const futureWorkflowTypes = [
    ACTION_TYPES.insertIntoNote,
    ACTION_TYPES.moveNote,
    ACTION_TYPES.renameNote,
    ACTION_TYPES.archiveNote
  ];

  for (const type of futureWorkflowTypes) {
    const item = normalizeActionProposal({
      type,
      title: 'Future workflow action',
      sourcePath: '00_Inbox/Example.md',
      targetPath: '03_Wissen/Example.md',
      reason: 'Guard against accidental execution.'
    });

    assert.equal(isKnownActionType(type), true);
    assert.equal(isWriteActionType(type), true);
    assert.equal(isExecutableActionType(type), false);
    assert.equal(item.requiresDiff, true);
    assert.equal(item.requiresBackup, true);
    assert.equal(item.executable, false);
    assert.equal(item.selected, false);
  }
});
