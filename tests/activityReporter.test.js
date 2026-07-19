'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createActivityState } = require('../src/renderer/activity/activityState');
const { createActivityReporter } = require('../src/renderer/activity/activityReporter');

test('activity reporter updates the global status and records one structured event', () => {
  const status = { textContent: '' };
  const activityState = createActivityState();
  const reporter = createActivityReporter({ status, activityState });

  reporter.report({
    message: 'Renamed: 00_Inbox/Note.md. Links were not updated in V1.',
    activity: {
      type: 'success',
      action: 'Renamed',
      targetPath: '00_Inbox/Note.md',
      detail: 'Links were not updated in V1.'
    }
  });

  assert.equal(status.textContent, 'Renamed: 00_Inbox/Note.md. Links were not updated in V1.');
  assert.deepEqual(activityState.snapshot().entries.map((entry) => ({
    type: entry.type,
    action: entry.action,
    targetPath: entry.targetPath,
    detail: entry.detail
  })), [{
    type: 'success',
    action: 'Renamed',
    targetPath: '00_Inbox/Note.md',
    detail: 'Links were not updated in V1.'
  }]);
});

test('activity reporter keeps transient status messages out of session activity', () => {
  const status = { textContent: '' };
  const activityState = createActivityState();
  const reporter = createActivityReporter({ status, activityState });

  reporter.report({ message: 'Reading 00_Inbox/Note.md...' });

  assert.equal(status.textContent, 'Reading 00_Inbox/Note.md...');
  assert.deepEqual(activityState.snapshot().entries, []);
});