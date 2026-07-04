(function() {
  'use strict';

  const MARKDOWN_RE = /\.md$/i;
  const permissionText = getPermissionText();

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
    const isMarkdownFile = selection && selection.kind === 'file' && MARKDOWN_RE.test(String(selection.path || ''));
    const canUseAsContext = selection
      && selection.readAllowed === true
      && typeof selection.content === 'string'
      && selection.content.length > 0;
    const canSummarize = canUseAsContext;
    const canProposeUpdate = canUseAsContext && selection.writeAllowed === true;

    return [
      action({ id: 'file.summarize', label: 'Summarize file', category: 'read', targetKinds: ['markdown'], enabled: isMarkdownFile, softDisabled: isMarkdownFile && !canSummarize, requiredPermission: 'read', reason: canSummarize ? '' : permissionText.fileReadReason() }),
      action({ id: 'file.useAsContext', label: 'Use as context', category: 'context', targetKinds: ['markdown'], enabled: isMarkdownFile, softDisabled: isMarkdownFile && !canUseAsContext, requiredPermission: 'read', reason: canUseAsContext ? '' : permissionText.fileReadReason() }),
      action({ id: 'file.findSimilar', label: 'Find similar notes', category: 'read', targetKinds: ['markdown'], enabled: isMarkdownFile, softDisabled: isMarkdownFile && !canUseAsContext, requiredPermission: 'read', reason: canUseAsContext ? '' : permissionText.fileReadReason() }),
      action({ id: 'file.suggestTags', label: 'Suggest tags', category: 'write', targetKinds: ['markdown'], enabled: isMarkdownFile, softDisabled: isMarkdownFile && !canProposeUpdate, requiredPermission: 'write', reason: canProposeUpdate ? permissionText.fileUpdateReadyReason() : permissionText.fileWriteReason() }),
      action({ id: 'file.proposeUpdate', label: 'Propose content update', category: 'write', targetKinds: ['markdown'], enabled: isMarkdownFile, softDisabled: isMarkdownFile && !canProposeUpdate, requiredPermission: 'write', reason: canProposeUpdate ? permissionText.fileUpdateReadyReason() : permissionText.fileWriteReason() })
    ];
  }

  function folderActions(selection) {
    const canUseAsContext = selection && selection.readAllowed === true;
    return [
      action({ id: 'folder.useAsContext', label: 'Use as context', category: 'context', targetKinds: ['folder'], enabled: true, softDisabled: !canUseAsContext, requiredPermission: 'read', reason: canUseAsContext ? '' : permissionText.folderReadReason() }),
      action({ id: 'folder.listCurrent', label: 'List folder', category: 'read', targetKinds: ['folder'], enabled: true, softDisabled: !canUseAsContext, requiredPermission: 'read', reason: canUseAsContext ? '' : permissionText.folderReadReason() }),
      action({ id: 'folder.analyze', label: 'Analyze folder', category: 'read', targetKinds: ['folder'], enabled: true, softDisabled: !canUseAsContext, requiredPermission: 'read', reason: canUseAsContext ? '' : permissionText.folderReadReason() }),
      action({ id: 'folder.summarizeMarkdown', label: 'Summarize MD files', category: 'read', targetKinds: ['folder'], enabled: true, softDisabled: !canUseAsContext, requiredPermission: 'read', reason: canUseAsContext ? '' : permissionText.folderReadReason() })
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
      reason: config.reason || '',
      requiredPermission: config.requiredPermission || '',
      softDisabled: config.softDisabled === true
    });
  }


  function getPermissionText() {
    if (typeof window !== 'undefined' && window.ZeusSelectionActionPermissionText) return window.ZeusSelectionActionPermissionText;
    if (typeof require === 'function') return require('./permissionText');
    return {
      fileReadReason: () => 'Requires R and loaded Markdown content.',
      folderReadReason: () => 'Requires R on this folder.',
      fileWriteReason: () => 'Requires R, W, and loaded Markdown content.',
      fileUpdateReadyReason: () => ''
    };
  }
  const api = { getSelectionActions, getTargetKind };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusSelectionActionRegistry = Object.freeze(api);
})();
