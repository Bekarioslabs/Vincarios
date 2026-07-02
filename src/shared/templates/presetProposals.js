(function() {
  'use strict';

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
      files: (plan.files || []).map((file) => ({
        path: String(file.path || ''),
        content: String(file.content || '')
      })),
      reason: 'Create files from template preset ' + String(plan.id || 'unknown') + '.',
      risk: 'low'
    };
  }

  function createNoteProposalFromFile(plan, file) {
    const pathParts = splitPath(file.path);
    const fileName = pathParts.pop() || 'Untitled.md';
    const targetFolder = pathParts.join('/');
    const title = stripMarkdownExtension(fileName);
    return {
      type: 'create_note',
      category: 'create',
      title,
      targetFolder,
      content: String(file.content || ''),
      reason: 'Create from template preset ' + String(plan.id || 'unknown') + '.',
      risk: 'low',
      templatePresetId: plan.id || '',
      templatePlanRootPath: plan.rootPath || ''
    };
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

  function stripMarkdownExtension(fileName) {
    return String(fileName || 'Untitled.md').replace(/\.md$/i, '');
  }

  const api = {
    createNoteProposalsFromPlan
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusTemplatePresetProposals = Object.freeze(api);
})();
