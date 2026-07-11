const assert = require('node:assert/strict');
const test = require('node:test');

const { createUpdateFlashState, normalizeTargets } = require('../src/renderer/feedback/updateFlashState');

test('update flash state normalizes and de-duplicates targets', () => {
  const targets = normalizeTargets([
    { path: '\\Inbox\\Note.md', kind: 'file', reason: 'created' },
    { path: 'Inbox/Note.md', kind: 'file', reason: 'updated' },
    { path: '', kind: 'file' }
  ], (value) => String(value || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, ''));

  assert.deepEqual(targets, [
    { path: 'Inbox/Note.md', kind: 'file', reason: 'created' }
  ]);
});

test('update flash state tracks multiple active targets and notifies subscribers', () => {
  const state = createUpdateFlashState({ durationMs: 1000 });
  const snapshots = [];
  state.subscribe((snapshot) => snapshots.push(snapshot));

  state.flashTargets([
    { path: 'A.md', kind: 'file', reason: 'created' },
    { path: 'Folder', kind: 'folder', reason: 'template_created' }
  ]);

  assert.equal(state.isFlashing('A.md'), true);
  assert.equal(state.isFlashing('Folder'), true);
  assert.equal(state.snapshot().activeTargets.length, 2);
  assert.equal(snapshots.length, 2);

  state.clearTarget('A.md');
  assert.equal(state.isFlashing('A.md'), false);
  assert.equal(state.isFlashing('Folder'), true);
});

test('update flash state clears targets after the configured duration', async () => {
  const state = createUpdateFlashState({ durationMs: 120 });
  state.flashTargets({ path: 'A.md', kind: 'file', reason: 'updated' });
  assert.equal(state.isFlashing('A.md'), true);

  await new Promise((resolve) => setTimeout(resolve, 160));

  assert.equal(state.isFlashing('A.md'), false);
});
