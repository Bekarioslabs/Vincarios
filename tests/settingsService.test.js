'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createSettingsService } = require('../src/main/settings/settingsService');

test('settings service delegates action default updates', () => {
  const calls = [];
  const service = createSettingsService({
    settingsStore: {
      getSettings() { return { version: 1 }; },
      setActionDefaults(payload) { calls.push(payload); return { ok: true, actionDefaults: payload }; }
    }
  });
  const payload = { folderContext: { maxFiles: 25 } };
  assert.deepEqual(service.setActionDefaults(payload), { ok: true, actionDefaults: payload });
  assert.deepEqual(calls, [payload]);
});

test('settings service exposes app-local layout preference updates', () => {
  const calls = [];
  const service = createSettingsService({
    settingsStore: {
      getSettings() { return { version: 1 }; },
      setLayoutPreferences(payload) {
        calls.push(payload);
        return { ok: true, layout: payload };
      }
    }
  });

  const result = service.setLayoutPreferences({ panels: { selectionActionsCollapsed: true } });

  assert.deepEqual(calls, [{ panels: { selectionActionsCollapsed: true } }]);
  assert.deepEqual(result, { ok: true, layout: { panels: { selectionActionsCollapsed: true } } });
});
test('settings service delegates app theme updates', () => {
  const calls = [];
  const service = createSettingsService({
    settingsStore: {
      getSettings() { return { version: 1 }; },
      setTheme(payload) { calls.push(payload); return { ok: true, theme: payload }; }
    }
  });

  const result = service.setTheme({ mode: 'light' });

  assert.deepEqual(calls, [{ mode: 'light' }]);
  assert.deepEqual(result, { ok: true, theme: { mode: 'light' } });
});
