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
      fileRole: 'note',
      content: '# {{title}}\n\n',
      metadata: { tags: ['note'], type: 'note', source: 'preset:note.default' }
    }),
    freezePreset({
      id: 'note.todo',
      type: PRESET_TYPES.note,
      label: 'Todo List',
      targetRole: 'inbox',
      fileName: '{{title}}.md',
      fileRole: 'todo',
      content: '# {{title}}\n\n- [ ] \n',
      metadata: { tags: ['todo'], type: 'task-list', source: 'preset:note.todo' }
    }),
    freezePreset({
      id: 'note.article',
      type: PRESET_TYPES.note,
      label: 'Article',
      targetRole: 'inbox',
      fileName: '{{title}}.md',
      fileRole: 'article',
      content: '# {{title}}\n\n## Summary\n\n## Draft\n\n',
      metadata: { tags: ['article'], type: 'article', source: 'preset:note.article' }
    }),
    freezePreset({
      id: 'project.default',
      type: PRESET_TYPES.project,
      label: 'Default',
      targetRole: 'projects',
      rootFolder: '{{projectName}}',
      metadata: { tags: ['project'], type: 'project-note', source: 'preset:project.default' },
      folders: ['Knowledge'],
      files: [
        { name: '{{projectName}}.md', role: 'project-overview', metadata: { tags: ['overview'], type: 'project-overview' }, content: '# {{projectName}}\n\n## Overview\n\n' },
        { name: 'Instructions.md', role: 'instructions', metadata: { tags: ['instructions'], type: 'instructions' }, content: '# Instructions\n\n' },
        { name: 'References.md', role: 'references', metadata: { tags: ['references'], type: 'references' }, content: '# References\n\n' },
        { name: 'Brainstorm.md', role: 'brainstorm', metadata: { tags: ['brainstorm'], type: 'brainstorm' }, content: '# Brainstorm\n\n' },
        { name: 'Tasks.md', role: 'tasks', metadata: { tags: ['tasks'], type: 'task-list' }, content: '# Tasks\n\n- [ ] \n' },
        { name: 'Decisions.md', role: 'decisions', metadata: { tags: ['decisions'], type: 'decision-log' }, content: '# Decisions\n\n' },
        { name: 'Log.md', role: 'log', metadata: { tags: ['log'], type: 'project-log' }, content: '# Log\n\n' }
      ]
    }),
    freezePreset({
      id: 'project.wiki',
      type: PRESET_TYPES.project,
      label: 'Wiki',
      targetRole: 'projects',
      rootFolder: '{{projectName}}',
      metadata: { tags: ['project', 'wiki'], type: 'project-note', source: 'preset:project.wiki' },
      folders: ['Wiki', 'Knowledge', 'Assets'],
      files: [
        { name: '{{projectName}}.md', role: 'project-overview', metadata: { tags: ['overview'], type: 'project-overview' }, content: '# {{projectName}}\n\n## Wiki\n\n' },
        { name: 'Instructions.md', role: 'instructions', metadata: { tags: ['instructions'], type: 'instructions' }, content: '# Instructions\n\n' },
        { name: 'References.md', role: 'references', metadata: { tags: ['references'], type: 'references' }, content: '# References\n\n' },
        { name: 'Tasks.md', role: 'tasks', metadata: { tags: ['tasks'], type: 'task-list' }, content: '# Tasks\n\n- [ ] \n' },
        { name: 'Log.md', role: 'log', metadata: { tags: ['log'], type: 'project-log' }, content: '# Log\n\n' }
      ]
    }),
    freezePreset({
      id: 'project.dnd-campaign',
      type: PRESET_TYPES.project,
      label: 'DnD Campaign',
      targetRole: 'projects',
      rootFolder: '{{projectName}}',
      metadata: { tags: ['project', 'dnd-campaign'], type: 'campaign-note', source: 'preset:project.dnd-campaign' },
      folders: ['Sessions', 'Characters', 'Locations', 'Lore', 'Assets'],
      files: [
        { name: '{{projectName}}.md', role: 'project-overview', metadata: { tags: ['overview'], type: 'campaign-overview' }, content: '# {{projectName}}\n\n## Campaign Premise\n\n' },
        { name: 'Sessions.md', role: 'sessions', metadata: { tags: ['sessions'], type: 'session-index' }, content: '# Sessions\n\n' },
        { name: 'Characters.md', role: 'characters', metadata: { tags: ['characters'], type: 'character-index' }, content: '# Characters\n\n' },
        { name: 'Locations.md', role: 'locations', metadata: { tags: ['locations'], type: 'location-index' }, content: '# Locations\n\n' },
        { name: 'Tasks.md', role: 'tasks', metadata: { tags: ['tasks'], type: 'task-list' }, content: '# Tasks\n\n- [ ] \n' },
        { name: 'Log.md', role: 'log', metadata: { tags: ['log'], type: 'project-log' }, content: '# Log\n\n' }
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
        role: preset.fileRole || 'note',
        content: renderTemplate(preset.content, values),
        metadata: mergePresetMetadata(preset.metadata)
      })])
    });
  }

  function materializeProjectPreset(preset, values, profile) {
    const targetRoot = vaultProfile.getFolderRolePath(profile, preset.targetRole);
    const rootPath = joinPath(targetRoot, renderTemplate(preset.rootFolder, values));
    const folders = Object.freeze((preset.folders || []).map((folder) => joinPath(rootPath, sanitizePathSegment(folder))));
    const files = Object.freeze((preset.files || []).map((file) => Object.freeze({
      path: joinPath(rootPath, renderTemplate(file.name, values)),
      role: String(file.role || 'project-note'),
      content: renderTemplate(file.content, values),
      metadata: mergePresetMetadata(preset.metadata, file.metadata)
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

  function mergePresetMetadata(base, override) {
    const merged = Object.assign({}, cloneMetadata(base), cloneMetadata(override));
    const tags = [];
    [base, override].forEach((source) => {
      (Array.isArray(source && source.tags) ? source.tags : []).forEach((tag) => {
        const value = String(tag || '').trim();
        if (value && !tags.includes(value)) tags.push(value);
      });
    });
    if (tags.length) merged.tags = tags;
    return merged;
  }

  function cloneMetadata(metadata) {
    const clone = Object.assign({}, metadata || {});
    if (Array.isArray(clone.tags)) clone.tags = clone.tags.slice();
    return clone;
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
    if (clone.metadata) clone.metadata = Object.freeze(cloneMetadata(clone.metadata));
    if (clone.folders) clone.folders = Object.freeze(clone.folders.slice());
    if (clone.files) clone.files = Object.freeze(clone.files.map(freezePresetFile));
    return Object.freeze(clone);
  }

  function freezePresetFile(file) {
    const clone = clonePresetFile(file);
    if (clone.metadata) clone.metadata = Object.freeze(clone.metadata);
    return Object.freeze(clone);
  }

  function clonePresetFile(file) {
    const clone = Object.assign({}, file || {});
    if (clone.metadata) clone.metadata = cloneMetadata(clone.metadata);
    return clone;
  }

  function clonePreset(preset) {
    const clone = Object.assign({}, preset);
    if (preset.metadata) clone.metadata = cloneMetadata(preset.metadata);
    if (preset.folders) clone.folders = preset.folders.slice();
    if (preset.files) clone.files = preset.files.map(clonePresetFile);
    return clone;
  }

  function loadVaultProfile() {
    if (typeof require === 'function') return require('../vaultProfile/defaults');
    return window.VitruviosVaultProfile;
  }

  const api = {
    PRESET_TYPES,
    DEFAULT_TEMPLATE_PRESETS,
    listPresets,
    getPresetById,
    materializePreset
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosTemplatePresets = Object.freeze(api);
})();
