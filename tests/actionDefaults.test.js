'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { normalizeActionDefaults, getFolderActionDefault } = require('../src/shared/settings/actionDefaults');
const { createSettingsStore } = require('../src/main/settings/settingsStore');

test('folder action defaults normalize independently for Context and Summary', () => {
  const defaults = normalizeActionDefaults({
    folderContext: { scope: 'subfolders', maxDepth: 5, maxFiles: 80 },
    folderSummary: { scope: 'current', maxDepth: 2, maxFiles: 12 }
  });

  assert.deepEqual(defaults.folderContext, { scope: 'subfolders', maxDepth: 5, maxFiles: 80, fileType: 'markdown' });
  assert.deepEqual(defaults.folderSummary, { scope: 'current', maxDepth: 2, maxFiles: 12, fileType: 'markdown' });
  assert.equal(getFolderActionDefault(defaults, 'folderSummary').maxFiles, 12);
  assert.equal(defaults.fileSummaryMaxChars, 12000);
});

test('folder action defaults persist through the portable settings store', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vitruvios-action-defaults-'));
  const filePath = path.join(dir, 'settings.json');
  const store = createSettingsStore({ filePath });
  const result = store.setActionDefaults({ folderContext: { scope: 'subfolders', maxDepth: 4, maxFiles: 25 } });

  assert.equal(result.ok, true);
  assert.deepEqual(createSettingsStore({ filePath }).getSettings().actionDefaults.folderContext, {
    scope: 'subfolders', maxDepth: 4, maxFiles: 25, fileType: 'markdown'
  });
  assert.equal(createSettingsStore({ filePath }).getSettings().actionDefaults.folderSummary.maxFiles, 30);
});
test('file summary source limit is normalized and persisted with action defaults', () => {
  const defaults = normalizeActionDefaults({ fileSummaryMaxChars: 24000 });
  assert.equal(defaults.fileSummaryMaxChars, 24000);
  assert.equal(normalizeActionDefaults({ fileSummaryMaxChars: 999 }).fileSummaryMaxChars, 12000);
  assert.equal(normalizeActionDefaults({ fileSummaryMaxChars: 999999 }).fileSummaryMaxChars, 60000);
});