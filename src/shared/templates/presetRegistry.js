(function() {
  'use strict';

  const vaultProfile = loadVaultProfile();

  const PRESET_TYPES = Object.freeze({
    note: 'note',
    project: 'project'
  });

  const DEFAULT_TEMPLATE_PRESETS = Object.freeze([
    freezePreset({
      id: 'note.default',
      type: PRESET_TYPES.note,
      label: 'Note',
      targetRole: 'inbox',
      fileName: '{{title}}.md',
      content: '# {{title}}\n\n'
    }),
    freezePreset({
      id: 'note.todo',
      type: PRESET_TYPES.note,
      label: 'Todo List',
      targetRole: 'inbox',
      fileName: '{{title}}.md',
      content: '# {{title}}\n\n- [ ] \n'
    }),
    freezePreset({
      id: 'note.article',
      type: PRESET_TYPES.note,
      label: 'Article',
      targetRole: 'inbox',
      fileName: '{{title}}.md',
      content: '# {{title}}\n\n## Summary\n\n## Draft\n\n'
    }),
    freezePreset({
      id: 'project.default',
      type: PRESET_TYPES.project,
      label: 'Default',
      targetRole: 'projects',
      rootFolder: '{{projectName}}',
      folders: ['Knowledge'],
      files: [
        { name: '{{projectName}}.md', content: '# {{projectName}}\n\n## Overview\n\n' },
        { name: 'Instructions.md', content: '# Instructions\n\n' },
        { name: 'References.md', content: '# References\n\n' },
        { name: 'Brainstorm.md', content: '# Brainstorm\n\n' },
        { name: 'Tasks.md', content: '# Tasks\n\n- [ ] \n' },
        { name: 'Decisions.md', content: '# Decisions\n\n' },
        { name: 'Log.md', content: '# Log\n\n' }
      ]
    }),
    freezePreset({
      id: 'project.wiki',
      type: PRESET_TYPES.project,
      label: 'Wiki',
      targetRole: 'projects',
      rootFolder: '{{projectName}}',
      folders: ['Wiki', 'Knowledge', 'Assets'],
      files: [
        { name: '{{projectName}}.md', content: '# {{projectName}}\n\n## Wiki\n\n' },
        { name: 'Instructions.md', content: '# Instructions\n\n' },
        { name: 'References.md', content: '# References\n\n' },
        { name: 'Tasks.md', content: '# Tasks\n\n- [ ] \n' },
        { name: 'Log.md', content: '# Log\n\n' }
      ]
    }),
    freezePreset({
      id: 'project.dnd-campaign',
      type: PRESET_TYPES.project,
      label: 'DnD Campaign',
      targetRole: 'projects',
      rootFolder: '{{projectName}}',
      folders: ['Sessions', 'Characters', 'Locations', 'Lore', 'Assets'],
      files: [
        { name: '{{projectName}}.md', content: '# {{projectName}}\n\n## Campaign Premise\n\n' },
        { name: 'Sessions.md', content: '# Sessions\n\n' },
        { name: 'Characters.md', content: '# Characters\n\n' },
        { name: 'Locations.md', content: '# Locations\n\n' },
        { name: 'Tasks.md', content: '# Tasks\n\n- [ ] \n' },
        { name: 'Log.md', content: '# Log\n\n' }
      ]
    })
  ]);

  function listPresets(type) {
    return DEFAULT_TEMPLATE_PRESETS
      .filter((preset) => !type || preset.type === type)
      .map(clonePreset);
  }

  function getPresetById(id) {
    const preset = DEFAULT_TEMPLATE_PRESETS.find((item) => item.id === id);
    if (!preset) throw new Error('Unknown template preset: ' + String(id || ''));
    return clonePreset(preset);
  }

  function materializePreset(id, input, profile) {
    const preset = getPresetById(id);
    const values = createTemplateValues(input || {}, preset);
    return preset.type === PRESET_TYPES.project
      ? materializeProjectPreset(preset, values, profile)
      : materializeNotePreset(preset, values, profile);
  }

  function materializeNotePreset(preset, values, profile) {
    const targetRoot = vaultProfile.getFolderRolePath(profile, preset.targetRole);
    const fileName = renderTemplate(preset.fileName, values);
    const filePath = joinPath(targetRoot, fileName);
    return Object.freeze({
      id: preset.id,
      type: preset.type,
      label: preset.label,
      targetRole: preset.targetRole,
      rootPath: targetRoot,
      folders: Object.freeze([]),
      files: Object.freeze([Object.freeze({
        path: filePath,
        content: renderTemplate(preset.content, values)
      })])
    });
  }

  function materializeProjectPreset(preset, values, profile) {
    const targetRoot = vaultProfile.getFolderRolePath(profile, preset.targetRole);
    const rootPath = joinPath(targetRoot, renderTemplate(preset.rootFolder, values));
    const folders = Object.freeze((preset.folders || []).map((folder) => joinPath(rootPath, sanitizePathSegment(folder))));
    const files = Object.freeze((preset.files || []).map((file) => Object.freeze({
      path: joinPath(rootPath, renderTemplate(file.name, values)),
      content: renderTemplate(file.content, values)
    })));

    return Object.freeze({
      id: preset.id,
      type: preset.type,
      label: preset.label,
      targetRole: preset.targetRole,
      rootPath,
      folders,
      files
    });
  }

  function createTemplateValues(input, preset) {
    const title = sanitizePathSegment(input.title || input.noteTitle || 'Untitled');
    const projectName = sanitizePathSegment(input.projectName || input.title || 'Untitled Project');
    return Object.freeze({
      title,
      noteTitle: title,
      projectName,
      presetLabel: preset.label
    });
  }

  function renderTemplate(template, values) {
    return String(template || '').replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, key) => (
      Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match
    ));
  }

  function sanitizePathSegment(value) {
    const normalized = String(value || '')
      .replace(/\\/g, '/')
      .split('/')
      .filter(Boolean)
      .pop() || 'Untitled';

    return normalized
      .replace(/[<>:"|?*\x00-\x1f]/g, ' ')
      .replace(/[!]+/g, '')
      .replace(/\s+/g, ' ')
      .replace(/[. ]+$/g, '')
      .trim() || 'Untitled';
  }

  function joinPath() {
    return Array.prototype.slice.call(arguments)
      .map((part) => String(part || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, ''))
      .filter(Boolean)
      .join('/');
  }

  function freezePreset(preset) {
    const clone = Object.assign({}, preset);
    if (clone.folders) clone.folders = Object.freeze(clone.folders.slice());
    if (clone.files) clone.files = Object.freeze(clone.files.map((file) => Object.freeze(Object.assign({}, file))));
    return Object.freeze(clone);
  }

  function clonePreset(preset) {
    const clone = Object.assign({}, preset);
    if (preset.folders) clone.folders = preset.folders.slice();
    if (preset.files) clone.files = preset.files.map((file) => Object.assign({}, file));
    return clone;
  }

  function loadVaultProfile() {
    if (typeof require === 'function') return require('../vaultProfile/defaults');
    return window.ZeusVaultProfile;
  }

  const api = {
    PRESET_TYPES,
    DEFAULT_TEMPLATE_PRESETS,
    listPresets,
    getPresetById,
    materializePreset
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusTemplatePresets = Object.freeze(api);
})();
