'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createReviewBasketState,
  createSaveAssistantResponseProposal
} = require('../src/renderer/review/reviewBasketState');

test('review basket stores save-as-note proposals without executing vault writes', () => {
  const changes = [];
  const basket = createReviewBasketState({
    onChange(snapshot) {
      changes.push(snapshot);
    }
  });

  const proposal = createSaveAssistantResponseProposal('# Good Answer\n\nUseful Markdown body.');
  const added = basket.addProposal(proposal);

  assert.equal(added.type, 'create_note');
  assert.equal(added.category, 'create');
  assert.equal(added.status, 'open');
  assert.equal(added.selected, true);
  assert.equal(added.targetFolder, '00_Inbox/AI Responses');
  assert.equal(added.title, 'Good Answer');
  assert.match(added.content, /tags:\n  - ai-response/);
  assert.match(added.content, /origin_action: save_assistant_response/);
  assert.match(added.content, /# Good Answer\n\nUseful Markdown body\.$/);
  assert.equal(basket.getSnapshot().items.length, 1);
  assert.equal(changes.length, 1);
});

test('save-as-note proposal creates a safe fallback title from plain text', () => {
  const proposal = createSaveAssistantResponseProposal('This is a useful but headingless answer about Markdown vaults.');

  assert.equal(proposal.title, 'This is a useful but headingless answer');
  assert.equal(proposal.targetFolder, '00_Inbox/AI Responses');
});

test('save-as-note proposal uses an explicit suggested title when provided', () => {
  const proposal = createSaveAssistantResponseProposal('Generated summary body.', {
    suggestedTitle: 'Summary - Core - 2026-06-29',
    originAction: 'summarize_file'
  });

  assert.equal(proposal.title, 'Summary - Core - 2026-06-29');
  assert.equal(proposal.metadata.type, 'summary');
  assert.equal(proposal.metadata.origin_action, 'summarize_file');
});
test('save-as-note proposal can target a response subfolder under AI Responses', () => {
  const proposal = createSaveAssistantResponseProposal('Generated summary body.', {
    responseSubfolder: 'Summaries'
  });

  assert.equal(proposal.targetFolder, '00_Inbox/AI Responses/Summaries');
});
test('save-as-note proposal uses the configured inbox folder role', () => {
  const proposal = createSaveAssistantResponseProposal('Profiled answer.', {
    profile: { folders: { inbox: 'Incoming' } }
  });

  assert.equal(proposal.targetFolder, 'Incoming/AI Responses');
});
test('review basket reuses identical open proposals instead of adding duplicates', () => {
  const basket = createReviewBasketState();
  const proposal = createSaveAssistantResponseProposal('# Same Answer\n\nSame body.');

  const first = basket.addProposal(proposal);
  const second = basket.addProposal(proposal);

  assert.equal(first.id, second.id);
  assert.equal(second.duplicate, true);
  assert.equal(basket.getSnapshot().items.length, 1);
});

test('review basket replaces one open manual source update with its latest local draft', () => {
  const basket = createReviewBasketState();
  const first = basket.upsertOpenManualUpdateProposal({
    type: 'update_note',
    title: 'Manual source edit',
    targetPath: '03_Knowledge/Note.md',
    currentContent: '# Original',
    proposedContent: '# Original\n\nFirst local link.',
    reason: 'Manual Markdown source edit from preview editor.',
    risk: 'medium',
    updateMode: 'whole_note'
  });
  const second = basket.upsertOpenManualUpdateProposal({
    type: 'update_note',
    title: 'Manual source edit',
    targetPath: '03_Knowledge/Note.md',
    currentContent: '# Original',
    proposedContent: '# Original\n\nFirst local link.\n\nSecond local link.',
    reason: 'Manual Markdown source edit from preview editor.',
    risk: 'medium',
    updateMode: 'whole_note'
  });

  assert.equal(second.id, first.id);
  assert.equal(second.replaced, true);
  assert.equal(basket.getSnapshot().items.length, 1);
  assert.equal(basket.getSnapshot().items[0].proposedContent, '# Original\n\nFirst local link.\n\nSecond local link.');
});
test('review basket allows proposals with different content or target folders', () => {
  const basket = createReviewBasketState();

  basket.addProposal(createSaveAssistantResponseProposal('First answer.'));
  basket.addProposal(createSaveAssistantResponseProposal('Second answer.'));
  basket.addProposal(createSaveAssistantResponseProposal('First answer.', { targetFolder: '03_Wissen' }));

  assert.equal(basket.getSnapshot().items.length, 3);
});
test('review basket toggles selection and returns selected open proposals', () => {
  const basket = createReviewBasketState();
  const first = basket.addProposal(createSaveAssistantResponseProposal('First answer.'));
  const second = basket.addProposal(createSaveAssistantResponseProposal('Second answer.'));

  basket.setSelected(first.id, false);

  const selected = basket.getSelectedOpenItems();
  assert.equal(selected.length, 1);
  assert.equal(selected[0].id, second.id);
});

test('review basket updates proposal status without mutating other items', () => {
  const basket = createReviewBasketState();
  const first = basket.addProposal(createSaveAssistantResponseProposal('First answer.'));
  const second = basket.addProposal(createSaveAssistantResponseProposal('Second answer.'));

  basket.updateStatus(first.id, 'done', { path: '00_Inbox/First.md' });

  const snapshot = basket.getSnapshot();
  assert.equal(snapshot.items[0].status, 'done');
  assert.equal(snapshot.items[0].path, '00_Inbox/First.md');
  assert.equal(snapshot.items[1].id, second.id);
  assert.equal(snapshot.items[1].status, 'open');
});

test('review basket removes individual open proposals', () => {
  const basket = createReviewBasketState();
  const first = basket.addProposal(createSaveAssistantResponseProposal('First answer.'));
  basket.addProposal(createSaveAssistantResponseProposal('Second answer.'));

  const removed = basket.remove(first.id);

  assert.equal(removed.id, first.id);
  const snapshot = basket.getSnapshot();
  assert.equal(snapshot.items.length, 1);
  assert.equal(snapshot.items[0].title, 'Second answer.');
});

test('review basket clears open proposals while keeping completed history', () => {
  const basket = createReviewBasketState();
  const done = basket.addProposal(createSaveAssistantResponseProposal('Done answer.'));
  basket.addProposal(createSaveAssistantResponseProposal('Open answer.'));
  basket.updateStatus(done.id, 'done', { path: '00_Inbox/Done.md' });

  const cleared = basket.clearOpen();

  assert.equal(cleared.length, 1);
  const snapshot = basket.getSnapshot();
  assert.equal(snapshot.items.length, 1);
  assert.equal(snapshot.items[0].status, 'done');
});


test('review basket removes completed proposals from the visible list', () => {
  const basket = createReviewBasketState();
  const item = basket.addProposal(createSaveAssistantResponseProposal('Done answer.'));
  basket.updateStatus(item.id, 'done', { path: '00_Inbox/Done.md' });

  const removed = basket.remove(item.id);

  assert.equal(removed.id, item.id);
  assert.equal(basket.getSnapshot().items.length, 0);
});
test('review basket can add normalized proposal plan items', () => {
  const basket = createReviewBasketState();
  const result = basket.addProposalPlan({
    title: 'Folder cleanup',
    items: [
      { type: 'create_note', title: 'New Summary', targetFolder: '00_Inbox', content: '# Summary' },
      { type: 'update_note', title: 'Add backlink', targetPath: '03_Wissen/Topic.md', reason: 'Related note.' }
    ]
  });

  const snapshot = basket.getSnapshot();
  assert.equal(result.ok, true);
  assert.equal(result.added.length, 2);
  assert.equal(snapshot.items.length, 2);
  assert.equal(snapshot.items[0].type, 'create_note');
  assert.equal(snapshot.items[0].selected, true);
  assert.equal(snapshot.items[1].type, 'update_note');
  assert.equal(snapshot.items[1].requiresDiff, true);
  assert.equal(snapshot.items[1].selected, false);
});

test('review basket rejects invalid proposal plans without changing state', () => {
  const basket = createReviewBasketState();
  const result = basket.addProposalPlan('{ bad json');

  assert.equal(result.ok, false);
  assert.equal(result.code, 'invalid_json');
  assert.equal(basket.getSnapshot().items.length, 0);
});
test('review basket attaches diff preview data for existing-file update proposals', () => {
  const basket = createReviewBasketState();
  const item = basket.addProposal({
    type: 'update_note',
    title: 'Update topic',
    targetPath: '03_Wissen/Topic.md',
    currentContent: '# Topic\n\nOld line',
    proposedContent: '# Topic\n\nOld line\nNew line',
    reason: 'Add missing detail.'
  });

  assert.equal(item.type, 'update_note');
  assert.equal(item.executable, true);
  assert.equal(item.selected, false);
  assert.equal(item.requiresDiff, true);
  assert.equal(item.diffPreview.ok, true);
  assert.equal(item.diffPreview.summary, '+1 -0');
  assert.equal(basket.getSnapshot().items[0].diffPreview.additions, 1);
});
test('review basket keeps diff proposals unselected until explicit approval', () => {
  const basket = createReviewBasketState();
  const item = basket.addProposal({
    type: 'update_note',
    title: 'Update topic',
    targetPath: '03_Wissen/Topic.md',
    currentContent: 'Old',
    proposedContent: 'New'
  });

  assert.equal(item.executable, true);
  assert.equal(basket.getSelectedOpenItems().length, 0);

  basket.setSelected(item.id, true);

  const selected = basket.getSelectedOpenItems();
  assert.equal(selected.length, 1);
  assert.equal(selected[0].type, 'update_note');
});

test('review basket clears completed proposals while keeping open and failed items', () => {
  const basket = createReviewBasketState();
  const done = basket.addProposal(createSaveAssistantResponseProposal('Done answer.'));
  const failed = basket.addProposal(createSaveAssistantResponseProposal('Failed answer.'));
  basket.addProposal(createSaveAssistantResponseProposal('Open answer.'));
  basket.updateStatus(done.id, 'done', { path: '00_Inbox/Done.md' });
  basket.updateStatus(failed.id, 'failed', { error: 'Nope.' });

  const cleared = basket.clearDone();

  assert.equal(cleared.length, 1);
  assert.equal(cleared[0].id, done.id);
  assert.deepEqual(basket.getSnapshot().items.map((item) => item.status), ['failed', 'open']);
});

test('review basket makes no-change update proposals non-executable', () => {
  const basket = createReviewBasketState();
  const item = basket.addProposal({
    type: 'update_note',
    title: 'Rename request',
    targetPath: '03_Knowledge/Topic.md',
    currentContent: '# Topic\n\nSame body.',
    proposedContent: '# Topic\n\nSame body.',
    reason: 'Rename is not part of content update.'
  });

  assert.equal(item.diffPreview.changed, false);
  assert.equal(item.noChange, true);
  assert.equal(item.executable, false);
  assert.equal(item.selected, false);
  assert.equal(basket.getSelectedOpenItems().length, 0);
});

test('review basket updates open create proposals before execution', () => {
  const basket = createReviewBasketState();
  const item = basket.addProposal(createSaveAssistantResponseProposal('# Old Title\n\nBody.'));

  const updated = basket.updateProposal(item.id, { title: 'New Title', content: '# New Title\n\nBody.' });

  assert.equal(updated.title, 'New Title');
  assert.equal(updated.content, '# New Title\n\nBody.');
  assert.equal(basket.getSelectedOpenItems()[0].title, 'New Title');
});