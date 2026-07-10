'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createActivityState,
  normalizeActivityEntry
} = require('../src/renderer/activity/activityState');

test('activity state starts empty and records structured session entries', () => {
  const state = createActivityState();

  assert.deepEqual(state.snapshot().entries, []);

  const entry = state.record({
    type: 'success',
    action: 'Renamed',
    targetPath: '00_Inbox/Note.md',
    detail: 'Links were not updated in V1.',
    time: new Date(2026, 6, 10, 10, 30)
  });

  assert.equal(entry.type, 'success');
  assert.equal(entry.action, 'Renamed');
  assert.equal(entry.targetPath, '00_Inbox/Note.md');
  assert.equal(entry.detail, 'Links were not updated in V1.');
  assert.equal(entry.time, '10:30');
  assert.equal(state.snapshot().entries.length, 1);
});

test('activity state normalizes invalid entries and caps the session list', () => {
  const state = createActivityState({ maxEntries: 2 });

  state.record({ type: 'unknown', detail: 'First' });
  state.record({ type: 'warning', action: 'Second' });
  state.record({ type: 'error', action: 'Third' });

  const entries = state.snapshot().entries;
  assert.equal(entries.length, 2);
  assert.equal(entries[0].action, 'Second');
  assert.equal(entries[1].action, 'Third');
  assert.equal(normalizeActivityEntry({ type: 'unknown' }).type, 'info');
});

test('activity state notifies subscribers and clears session entries', () => {
  const state = createActivityState();
  const counts = [];
  const unsubscribe = state.subscribe((snapshot) => counts.push(snapshot.entries.length));

  state.record({ action: 'Opened vault' });
  state.clear();
  unsubscribe();
  state.record({ action: 'Ignored after unsubscribe' });

  assert.deepEqual(counts, [1, 0]);
});
