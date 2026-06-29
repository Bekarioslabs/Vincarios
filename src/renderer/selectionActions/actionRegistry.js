(function() {
  'use strict';

  const MARKDOWN_RE = /\.md$/i;

  function getTargetKind(selection) {
    if (!selection || selection.kind === 'none') return 'none';
    if (selection.kind === 'folder') return 'folder';
    if (selection.kind === 'file' && MARKDOWN_RE.test(String(selection.path || ''))) return 'markdown';
    if (selection.kind === 'file') return 'file';
    return 'none';
  }

  function getSelectionActions(selection) {
    const kind = getTargetKind(selection);
    if (kind === 'folder') return folderActions(selection);
    if (kind === 'markdown') return markdownActions(selection);
    return [];
  }

  function markdownActions(selection) {
    const canUseAsContext = selection
      && selection.readAllowed === true
      && typeof selection.content === 'string'
      && selection.content.length > 0;
    const canSummarize = canUseAsContext;

    return [
      action({ id: 'file.summarize', label: 'Summarize file', category: 'read', targetKinds: ['markdown'], enabled: canSummarize, reason: canSummarize ? '' : 'Requires R and loaded Markdown content.' }),
      action({ id: 'file.useAsContext', label: 'Use as context', category: 'context', targetKinds: ['markdown'], enabled: canUseAsContext, reason: canUseAsContext ? '' : 'Requires R and loaded Markdown content.' }),
      action({ id: 'file.proposeUpdate', label: 'Propose update', category: 'write', targetKinds: ['markdown'], enabled: false, future: true })
    ];
  }

  function folderActions(selection) {
    const canUseAsContext = selection && selection.readAllowed === true;
    return [
      action({ id: 'folder.useAsContext', label: 'Use as context', category: 'context', targetKinds: ['folder'], enabled: canUseAsContext, reason: canUseAsContext ? '' : 'Requires R on this folder.' }),
      action({ id: 'folder.listCurrent', label: 'List folder', category: 'read', targetKinds: ['folder'], enabled: canUseAsContext, reason: canUseAsContext ? '' : 'Requires R on this folder.' }),
      action({ id: 'folder.analyze', label: 'Analyze folder', category: 'read', targetKinds: ['folder'], enabled: false, future: true })
    ];
  }

  function action(config) {
    return Object.freeze({
      id: config.id,
      label: config.label,
      category: config.category,
      targetKinds: Object.freeze((config.targetKinds || []).slice()),
      enabled: config.enabled === true,
      future: config.future === true,
      reason: config.reason || ''
    });
  }

  const api = { getSelectionActions, getTargetKind };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusSelectionActionRegistry = Object.freeze(api);
})();
