'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { materializePreset } = require('../src/shared/templates/presetRegistry');
const { createNoteProposalsFromPlan } = require('../src/shared/templates/presetProposals');

test('note create plans convert to one create note proposal', () => {
  const plan = materializePreset('note.default', { title: 'Star Lu' });
  const proposals = createNoteProposalsFromPlan(plan);

  assert.equal(proposals.length, 1);
  assert.equal(proposals[0].type, 'create_note');
  assert.equal(proposals[0].targetFolder, '00_Inbox');
  assert.equal(proposals[0].title, 'Star Lu');
  assert.match(proposals[0].content, /# Star Lu/);
  assert.match(proposals[0].reason, /note.default/);
});

test('template proposal conversion rejects non-plan input clearly', () => {
  assert.throws(
    () => createNoteProposalsFromPlan(null),
    /Template create plan is required/
  );
});

test('project create plans convert to one template proposal', () => {
  const plan = materializePreset('project.default', { projectName: 'Alpha' });
  const proposals = createNoteProposalsFromPlan(plan);

  assert.equal(proposals.length, 1);
  assert.equal(proposals[0].type, 'create_from_template');
  assert.equal(proposals[0].title, 'Alpha');
  assert.equal(proposals[0].templatePresetId, 'project.default');
  assert.equal(proposals[0].folders.length > 0, true);
  assert.equal(proposals[0].files.length, 7);
});