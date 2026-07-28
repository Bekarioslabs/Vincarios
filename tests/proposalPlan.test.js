'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseProposalPlan } = require('../src/shared/actions/proposalPlan');

test('proposal plan parser accepts a structured plan object', () => {
  const result = parseProposalPlan({
    title: 'Inbox cleanup suggestions',
    items: [
      {
        type: 'create_note',
        title: 'Summary',
        targetFolder: '00_Inbox',
        content: '# Summary',
        reason: 'Create a summary note.'
      },
      {
        type: 'update_note',
        title: 'Add link',
        targetPath: '03_Wissen/Topic.md',
        reason: 'Related note found.'
      }
    ]
  });

  assert.equal(result.ok, true);
  assert.equal(result.title, 'Inbox cleanup suggestions');
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].type, 'create_note');
  assert.equal(result.items[0].selected, true);
  assert.equal(result.items[1].type, 'update_note');
  assert.equal(result.items[1].selected, false);
  assert.equal(result.items[1].requiresDiff, true);
});

test('proposal plan parser accepts JSON strings from model output', () => {
  const result = parseProposalPlan(JSON.stringify({
    type: 'proposal_plan',
    actions: [
      { type: 'suggest_links', title: 'Suggest links', targetPath: 'A.md' }
    ]
  }));

  assert.equal(result.ok, true);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].category, 'links');
});

test('proposal plan parser rejects malformed JSON safely', () => {
  const result = parseProposalPlan('{ bad json');

  assert.equal(result.ok, false);
  assert.equal(result.code, 'invalid_json');
  assert.deepEqual(result.items, []);
});

test('proposal plan parser rejects empty plans', () => {
  const result = parseProposalPlan({ items: [] });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'empty_proposal_plan');
});
test('proposal plan parser exposes browser globals through shared action schema', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'shared', 'actions', 'proposalPlan.js'), 'utf8');

  assert.match(source, /window\.VincariosActionSchema/);
  assert.match(source, /window\.VincariosProposalPlan/);
  assert.doesNotMatch(source, /const \{ normalizeActionProposal \} = require/);
});

