(function() {
  'use strict';

  const ACTION_TYPES = Object.freeze({
    listFolder: 'list_folder',
    readNote: 'read_note',
    searchIndex: 'search_index',
    findSimilar: 'find_similar',
    createNote: 'create_note',
    createFromTemplate: 'create_from_template',
    updateNote: 'update_note',
    insertIntoNote: 'insert_into_note',
    moveNote: 'move_note',
    renameNote: 'rename_note',
    archiveNote: 'archive_note',
    suggestLinks: 'suggest_links',
    suggestTags: 'suggest_tags',
    suggestFolder: 'suggest_folder',
    proposalPlan: 'proposal_plan',
    manualReview: 'manual_review'
  });
  
  const READ_ACTION_TYPES = Object.freeze([
    ACTION_TYPES.listFolder,
    ACTION_TYPES.readNote,
    ACTION_TYPES.searchIndex,
    ACTION_TYPES.findSimilar
  ]);
  
  const WRITE_ACTION_TYPES = Object.freeze([
    ACTION_TYPES.createNote,
    ACTION_TYPES.createFromTemplate,
    ACTION_TYPES.updateNote,
    ACTION_TYPES.insertIntoNote,
    ACTION_TYPES.moveNote,
    ACTION_TYPES.renameNote,
    ACTION_TYPES.archiveNote
  ]);
  
  const SUGGESTION_ACTION_TYPES = Object.freeze([
    ACTION_TYPES.suggestLinks,
    ACTION_TYPES.suggestTags,
    ACTION_TYPES.suggestFolder,
    ACTION_TYPES.proposalPlan,
    ACTION_TYPES.manualReview
  ]);
  
  const EXECUTABLE_ACTION_TYPES = Object.freeze([
    ACTION_TYPES.createNote,
    ACTION_TYPES.createFromTemplate,
    ACTION_TYPES.updateNote
  ]);
  
  const ACTION_CATEGORY_BY_TYPE = Object.freeze({
    [ACTION_TYPES.listFolder]: 'read context',
    [ACTION_TYPES.readNote]: 'read context',
    [ACTION_TYPES.searchIndex]: 'search',
    [ACTION_TYPES.findSimilar]: 'search',
    [ACTION_TYPES.createNote]: 'create',
    [ACTION_TYPES.createFromTemplate]: 'create',
    [ACTION_TYPES.updateNote]: 'update',
    [ACTION_TYPES.insertIntoNote]: 'update',
    [ACTION_TYPES.moveNote]: 'move/rename',
    [ACTION_TYPES.renameNote]: 'move/rename',
    [ACTION_TYPES.archiveNote]: 'archive/trash',
    [ACTION_TYPES.suggestLinks]: 'links',
    [ACTION_TYPES.suggestTags]: 'tags/properties',
    [ACTION_TYPES.suggestFolder]: 'move/rename',
    [ACTION_TYPES.proposalPlan]: 'proposal plan',
    [ACTION_TYPES.manualReview]: 'manual review'
  });
  
  const DIFF_REQUIRED_TYPES = Object.freeze([
    ACTION_TYPES.updateNote,
    ACTION_TYPES.insertIntoNote,
    ACTION_TYPES.moveNote,
    ACTION_TYPES.renameNote,
    ACTION_TYPES.archiveNote
  ]);
  
  const BACKUP_REQUIRED_TYPES = Object.freeze(DIFF_REQUIRED_TYPES.slice());
  
  function normalizeActionProposal(proposal, options) {
    const item = Object.assign({}, proposal || {});
    const normalizedType = normalizeActionType(item.type);
    const known = isKnownActionType(normalizedType);
    const type = known ? normalizedType : ACTION_TYPES.manualReview;
  
    item.id = item.id || (options && options.id) || '';
    item.type = type;
    item.category = item.category || ACTION_CATEGORY_BY_TYPE[type] || 'manual review';
    item.status = item.status || 'open';
    item.title = String(item.title || item.label || defaultTitleForType(type));
    item.reason = String(item.reason || 'No reason provided.');
    item.risk = normalizeRisk(item.risk || defaultRiskForType(type));
    item.content = String(item.content || '');
    item.currentContent = String(item.currentContent || item.beforeContent || '');
    item.proposedContent = String(item.proposedContent || item.afterContent || '');
    item.sourcePath = normalizePathLike(item.sourcePath || item.path || '');
    item.targetPath = normalizePathLike(item.targetPath || '');
    item.targetFolder = normalizePathLike(item.targetFolder || '');
    item.requiresDiff = DIFF_REQUIRED_TYPES.includes(type);
    item.requiresBackup = BACKUP_REQUIRED_TYPES.includes(type);
    item.executable = isExecutableActionType(type);
    item.selected = item.selected !== undefined ? item.selected === true : (item.executable && !item.requiresDiff);
    if (!known) {
      item.validation = {
        ok: false,
        code: 'unknown_action_type',
        message: 'Unknown action type requires manual review.'
      };
      item.selected = false;
      item.executable = false;
    } else {
      item.validation = item.validation || { ok: true };
    }
    item.fingerprint = item.fingerprint || createActionFingerprint(item);
    return item;
  }
  
  function createActionFingerprint(item) {
    return [
      item.type || '',
      item.category || '',
      item.sourcePath || '',
      item.targetFolder || '',
      item.targetPath || '',
      item.title || '',
      item.content || '',
      item.reason || ''
    ].join('\u001f');
  }
  
  function isKnownActionType(type) {
    return Object.keys(ACTION_CATEGORY_BY_TYPE).some((key) => key === normalizeActionType(type));
  }
  
  function isWriteActionType(type) {
    return WRITE_ACTION_TYPES.includes(normalizeActionType(type));
  }
  
  function isExecutableActionType(type) {
    return EXECUTABLE_ACTION_TYPES.includes(normalizeActionType(type));
  }
  
  function normalizeActionType(type) {
    return String(type || '').trim().toLowerCase();
  }
  
  function normalizeRisk(risk) {
    const value = String(risk || '').trim().toLowerCase();
    return ['low', 'medium', 'high'].includes(value) ? value : 'medium';
  }
  
  function normalizePathLike(value) {
    return String(value || '')
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, '')
      .replace(/\/+/g, '/');
  }
  
  function defaultRiskForType(type) {
    if (type === ACTION_TYPES.createNote || type === ACTION_TYPES.createFromTemplate) return 'low';
    if (isWriteActionType(type)) return 'medium';
    return 'low';
  }
  
  function defaultTitleForType(type) {
    return (ACTION_CATEGORY_BY_TYPE[type] || 'Manual review') + ' proposal';
  }
  
  const api = {
    ACTION_TYPES,
    READ_ACTION_TYPES,
    WRITE_ACTION_TYPES,
    SUGGESTION_ACTION_TYPES,
    ACTION_CATEGORY_BY_TYPE,
    normalizeActionProposal,
    createActionFingerprint,
    isKnownActionType,
    isWriteActionType,
    isExecutableActionType
  };
  
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosActionSchema = Object.freeze(api);
})();
