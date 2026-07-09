'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createVaultProfile
} = require('../src/shared/vaultProfile/defaults');

const {
  PRESET_TYPES,
  listPresets,
  getPresetById,
  materializePreset
} = require('../src/shared/templates/presetRegistry');

test('template presets expose deterministic note and project presets', () => {
  const presets = listPresets();

  assert.ok(presets.some((preset) => preset.id === 'note.default' && preset.type === PRESET_TYPES.note));
  assert.ok(presets.some((preset) => preset.id === 'note.todo' && preset.type === PRESET_TYPES.note));
  assert.ok(presets.some((preset) => preset.id === 'note.article' && preset.type === PRESET_TYPES.note));
  assert.ok(presets.some((preset) => preset.id === 'project.default' && preset.type === PRESET_TYPES.project));
  assert.ok(presets.some((preset) => preset.id === 'project.wiki' && preset.type === PRESET_TYPES.project));
  assert.ok(presets.some((preset) => preset.id === 'project.dnd-campaign' && preset.type === PRESET_TYPES.project));
});

test('project presets target vault roles instead of hard-coded folder names', () => {
  const preset = getPresetById('project.default');

  assert.equal(preset.targetRole, 'projects');
  assert.equal(preset.targetPath, undefined);
  assert.doesNotMatch(JSON.stringify(preset), /02_Projects/);
});

test('materialize project preset resolves target role and renders files', () => {
  const profile = createVaultProfile({ folders: { projects: 'Custom Projects' } });
  const plan = materializePreset('project.default', { projectName: 'Star Lu!' }, profile);

  assert.equal(plan.type, PRESET_TYPES.project);
  assert.equal(plan.targetRole, 'projects');
  assert.equal(plan.rootPath, 'Custom Projects/Star Lu');
  assert.deepEqual(plan.folders, ['Custom Projects/Star Lu/Knowledge']);
  assert.deepEqual(plan.files.map((file) => file.path), [
    'Custom Projects/Star Lu/Star Lu.md',
    'Custom Projects/Star Lu/Instructions.md',
    'Custom Projects/Star Lu/References.md',
    'Custom Projects/Star Lu/Brainstorm.md',
    'Custom Projects/Star Lu/Tasks.md',
    'Custom Projects/Star Lu/Decisions.md',
    'Custom Projects/Star Lu/Log.md'
  ]);
  assert.match(plan.files[0].content, /# Star Lu/);
  assert.deepEqual(plan.files.map((file) => file.role), [
    'project-overview',
    'instructions',
    'references',
    'brainstorm',
    'tasks',
    'decisions',
    'log'
  ]);
  assert.equal(plan.files[2].metadata.type, 'references');
  assert.deepEqual(plan.files[2].metadata.tags, ['project', 'references']);
});

test('materialize note preset creates one Markdown file under the selected role', () => {
  const profile = createVaultProfile({ folders: { inbox: 'Inbox' } });
  const plan = materializePreset('note.todo', { title: 'Daily Plan' }, profile);

  assert.equal(plan.type, PRESET_TYPES.note);
  assert.equal(plan.targetRole, 'inbox');
  assert.deepEqual(plan.folders, []);
  assert.deepEqual(plan.files.map((file) => file.path), ['Inbox/Daily Plan.md']);
  assert.match(plan.files[0].content, /# Daily Plan/);
  assert.match(plan.files[0].content, /- \[ \]/);
  assert.equal(plan.files[0].role, 'todo');
  assert.equal(plan.files[0].metadata.type, 'task-list');
});

test('materialize preset sanitizes path segment input', () => {
  const plan = materializePreset('project.default', { projectName: '../Bad:name' });

  assert.equal(plan.rootPath, '02_Projects/Bad name');
  assert.ok(plan.files.every((file) => !file.path.includes('..')));
  assert.ok(plan.folders.every((folder) => !folder.includes('..')));
});
