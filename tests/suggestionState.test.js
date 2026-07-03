'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createSuggestionState } = require('../src/renderer/suggestions/suggestionState');

function sampleGroup() {
  return {
    id: 'similar-notes:test',
    title: 'Similar Notes',
    source: 'file.findSimilar',
    items: [
      { id: 'a', title: 'A.md', detail: 'Strong match', scoreLabel: 'strong', scoreText: '82%' },
      { id: 'b', title: 'B.md', detail: 'Weak match', scoreLabel: 'weak', scoreText: '52%' }
    ]
  };
}

test('suggestion state starts empty', () => {
  const state = createSuggestionState();
  const snapshot = state.snapshot();

  assert.deepEqual(snapshot.groups, []);
  assert.equal(snapshot.selectedItem, null);
});

test('suggestion state adds a group and exposes selected detail', () => {
  const state = createSuggestionState();

  state.addGroup(sampleGroup());
  const snapshot = state.snapshot();

  assert.equal(snapshot.groups.length, 1);
  assert.equal(snapshot.groups[0].items.length, 2);
  assert.equal(snapshot.selectedItem.id, 'a');
  assert.equal(snapshot.selectedItem.detail, 'Strong match');
});

test('suggestion state selects toggles and dismisses items without deleting files', () => {
  const state = createSuggestionState();
  state.addGroup(sampleGroup());

  state.selectItem('similar-notes:test', 'b');
  state.toggleItem('similar-notes:test', 'b');
  state.dismissItem('similar-notes:test', 'a');
  const snapshot = state.snapshot();

  assert.equal(snapshot.selectedItem.id, 'b');
  assert.equal(snapshot.groups[0].items.find((item) => item.id === 'b').checked, true);
  assert.equal(snapshot.groups[0].items.find((item) => item.id === 'a').dismissed, true);
});

test('suggestion state clears groups and notifies subscribers', () => {
  const state = createSuggestionState();
  const counts = [];
  state.subscribe((snapshot) => counts.push(snapshot.groups.length));

  state.addGroup(sampleGroup());
  state.clearGroup('similar-notes:test');

  assert.deepEqual(counts, [1, 0]);
  assert.deepEqual(state.snapshot().groups, []);
  assert.equal(state.snapshot().selectedItem, null);
});

const fs = require('node:fs');
const path = require('node:path');

test('suggestion state script loads before shell', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const suggestionIndex = html.indexOf('./src/renderer/suggestions/suggestionState.js');
  const shellIndex = html.indexOf('./src/renderer/shell/mountShell.js');

  assert.equal(suggestionIndex > -1, true);
  assert.equal(shellIndex > suggestionIndex, true);
});
