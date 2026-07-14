'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  FOLDER_VISUAL_ICON_KEYS,
  FOLDER_VISUAL_COLOR_KEYS,
  DEFAULT_FOLDER_ROLE_VISUALS,
  getRoleVisual,
  normalizeRoleVisuals,
  normalizeTopLevelFolderVisuals,
  resolveTopLevelFolderVisual
} = require('../src/shared/vaultProfile/folderVisuals');

test('folder visuals expose fixed Lucide icon ids and a fixed palette', () => {
  assert.deepEqual(FOLDER_VISUAL_ICON_KEYS, [
    'folder', 'inbox', 'calendar', 'briefcase', 'book',
    'brain', 'archive', 'star', 'compass', 'layers'
  ]);
  assert.equal(FOLDER_VISUAL_COLOR_KEYS.includes('blue-400'), true);
  assert.equal(FOLDER_VISUAL_COLOR_KEYS.includes('violet-600'), true);
  assert.equal(FOLDER_VISUAL_COLOR_KEYS.length, 30);
});

test('folder visuals preserve only top-level records with fixed palette colors', () => {
  const visuals = normalizeTopLevelFolderVisuals({
    '00_Inbox': { icon: { kind: 'builtin', id: 'inbox' }, color: { kind: 'token', id: 'amber-400' } },
    '02_Projects/Vitruvios': { icon: { kind: 'builtin', id: 'briefcase' }, color: { kind: 'token', id: 'violet-400' } },
    '99_Archive': { icon: { kind: 'custom', path: '.vitruvios/icons/archive.svg' }, color: { kind: 'token', id: 'red-400' } }
  });

  assert.deepEqual(visuals, {
    '00_Inbox': { icon: { kind: 'builtin', id: 'inbox' }, color: { kind: 'token', id: 'amber-400' } },
    '99_Archive': { icon: { kind: 'custom', path: '.vitruvios/icons/archive.svg' }, color: { kind: 'token', id: 'red-400' } }
  });
});

test('folder visual identities never resolve for nested paths', () => {
  const visuals = normalizeTopLevelFolderVisuals({
    '02_Projects': { icon: { kind: 'builtin', id: 'briefcase' }, color: { kind: 'token', id: 'violet-400' } }
  });

  assert.deepEqual(resolveTopLevelFolderVisual('02_Projects', visuals), { icon: { kind: 'builtin', id: 'briefcase' }, color: { kind: 'token', id: 'violet-400' } });
  assert.equal(resolveTopLevelFolderVisual('02_Projects/Vitruvios/Notes.md', visuals), null);
});

test('role visuals use fixed palette ids and migrate the previous color ids', () => {
  assert.deepEqual(DEFAULT_FOLDER_ROLE_VISUALS.projects, { icon: { kind: 'builtin', id: 'briefcase' }, color: { kind: 'token', id: 'violet-400' } });
  assert.deepEqual(normalizeRoleVisuals({
    projects: { icon: { kind: 'builtin', id: 'star' }, color: { kind: 'token', id: 'orange' } },
    knowledge: { icon: { kind: 'builtin', id: 'book' }, color: { kind: 'token', id: 'green-500' } }
  }), {
    projects: { icon: { kind: 'builtin', id: 'star' }, color: { kind: 'token', id: 'orange-400' } },
    knowledge: { icon: { kind: 'builtin', id: 'book' }, color: { kind: 'token', id: 'green-500' } }
  });
  assert.deepEqual(getRoleVisual('knowledge'), { icon: { kind: 'builtin', id: 'book' }, color: { kind: 'token', id: 'green-400' } });
});

test('legacy custom hex colors migrate to a fixed palette color', () => {
  assert.deepEqual(normalizeRoleVisuals({
    projects: {
      icon: { kind: 'custom', path: '.vitruvios/icons/work.svg' },
      color: { kind: 'custom', value: '#7c3aed' }
    }
  }), {
    projects: {
      icon: { kind: 'custom', path: '.vitruvios/icons/work.svg' },
      color: { kind: 'token', id: 'violet-600' }
    }
  });
});