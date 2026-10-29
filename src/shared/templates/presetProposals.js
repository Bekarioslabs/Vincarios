(function() {
  'use strict';

  const generatedMetadataApi = loadGeneratedMetadataApi();

  function createNoteProposalsFromPlan(plan) {
    if (!plan || !Array.isArray(plan.files)) {
      throw new Error('Template create plan is required.');
    }

    if (plan.type === 'project') {
      return [createTemplateProposal(plan)];
    }

    return plan.files.map((file) => createNoteProposalFromFile(plan, file));
  }

  function createTemplateProposal(plan) {
    return {
      type: 'create_from_template',
      category: 'create',
      title: basename(plan.rootPath || plan.label || 'Template'),
      targetPath: plan.rootPath || '',
      templatePresetId: plan.id || '',
      templatePlanRootPath: plan.rootPath || '',
      folders: (plan.folders || []).slice(),
      files: (plan.files || []).map((file) => enrichPresetFile(file)),
      originAction: generatedMetadataApi.ORIGIN_ACTIONS.createFromPreset,
      reason: 'Create files from template preset ' + String(plan.id || 'unknown') + '.',
      risk: 'low'
    };
  }

  function createNoteProposalFromFile(plan, file) {
    const pathParts = splitPath(file.path);
    const fileName = pathParts.pop() || 'Untitled.md';
    const targetFolder = pathParts.join('/');
    const enriched = enrichPresetFile(file);
    return {
      type: 'create_note',
      category: 'create',
      title: fileName,
      targetFolder,
      content: enriched.content,
      metadata: enriched.metadata,
      fileRole: enriched.role,
      originAction: generatedMetadataApi.ORIGIN_ACTIONS.createFromPreset,
      reason: 'Create from template preset ' + String(plan.id || 'unknown') + '.',
      risk: 'low',
      templatePresetId: plan.id || '',
      templatePlanRootPath: plan.rootPath || ''
    };
  }

  function enrichPresetFile(file) {
    const generated = generatedMetadataApi.applyGeneratedNoteMetadata(String((file && file.content) || ''), {
      originAction: generatedMetadataApi.ORIGIN_ACTIONS.createFromPreset,
      metadata: file && file.metadata
    });
    return {
      path: String((file && file.path) || ''),
      role: String((file && file.role) || 'note'),
      content: generated.content,
      metadata: generated.metadata
    };
  }

  function loadGeneratedMetadataApi() {
    if (typeof require === 'function') return require('../metadata/generatedNoteMetadata');
    if (typeof window !== 'undefined' && window.VincariosGeneratedNoteMetadata) return window.VincariosGeneratedNoteMetadata;
    throw new Error('Generated note metadata API unavailable.');
  }
  function splitPath(value) {
    return String(value || '')
      .replace(/\\/g, '/')
      .split('/')
      .map((part) => part.trim())
      .filter(Boolean);
  }

  function basename(value) {
    const parts = splitPath(value);
    return parts.pop() || 'Template';
  }

  const api = {
    createNoteProposalsFromPlan
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosTemplatePresetProposals = Object.freeze(api);
})();
