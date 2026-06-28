(function() {
  'use strict';

  const ACTION_CATEGORIES = Object.freeze({
    context: Object.freeze({ id: 'context', label: 'Context', tone: 'context' }),
    read: Object.freeze({ id: 'read', label: 'Read', tone: 'read' }),
    write: Object.freeze({ id: 'write', label: 'Write', tone: 'write' }),
    organize: Object.freeze({ id: 'organize', label: 'Organize', tone: 'organize' })
  });

  function getActionCategory(id) {
    return ACTION_CATEGORIES[id] || ACTION_CATEGORIES.read;
  }

  const api = { ACTION_CATEGORIES, getActionCategory };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusSelectionActionCategories = Object.freeze(api);
})();