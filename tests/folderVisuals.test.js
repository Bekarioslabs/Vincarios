'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  FOLDER_VISUAL_ICON_KEYS,
  FOLDER_VISUAL_COLOR_KEYS,
  DEFAULT_TOP_LEVEL_FOLDER_VISUALS,
  getDefaultTopLevelFolderVisual,
  normalizeTopLevelFolderVisuals,
  resolveTopLevelFolderVisual
} = require('../src/shared/vaultProfile/folderVisuals');

test('folder visual identities accept only the fixed V1 icon and color choices', () => {
  assert.deepEqual(FOLDER_VISUAL_ICON_KEYS, [
    'folder', 'inbox', 'calendar', 'briefcase', 'book',
    'brain', 'archive', 'star', 'compass', 'layers'
  ]);
  assert.deepEqual(FOLDER_VISUAL_COLOR_KEYS, ['amber', 'green', 'sky', 'violet', 'orange', 'red']);
});

test('folder visual identities keep only valid top-level folder records', () => {
  const visuals = normalizeTopLevelFolderVisuals({
    '00_Inbox': { icon: 'inbox', color: 'amber' },
    '02_Projects/ZEUS': { icon: 'briefcase', color: 'violet' },
    '03_Knowledge': { icon: 'unknown', color: 'sky' },
    '99_Archive': { icon: 'archive', color: 'red' }
  });

  assert.deepEqual(visuals, {
    '00_Inbox': { icon: 'inbox', color: 'amber' },
    '99_Archive': { icon: 'archive', color: 'red' }
  });
});

test('folder visual identities never resolve for nested paths', () => {
  const visuals = normalizeTopLevelFolderVisuals({
    '02_Projects': { icon: 'briefcase', color: 'violet' }
  });

  assert.deepEqual(resolveTopLevelFolderVisual('02_Projects', visuals), { icon: 'briefcase', color: 'violet' });
  assert.equal(resolveTopLevelFolderVisual('02_Projects/ZEUS/Notes.md', visuals), null);
});

test('default folder visuals apply only to known English vault roots', () => {
  assert.deepEqual(DEFAULT_TOP_LEVEL_FOLDER_VISUALS['00_Inbox'], { icon: 'inbox', color: 'amber' });
  assert.deepEqual(getDefaultTopLevelFolderVisual('03_Knowledge'), { icon: 'book', color: 'green' });
  assert.equal(getDefaultTopLevelFolderVisual('03_Knowledge/Reference.md'), null);
  assert.equal(getDefaultTopLevelFolderVisual('Custom Folder'), null);
});