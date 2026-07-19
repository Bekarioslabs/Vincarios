(function() {
  'use strict';

  function createActivityReporter(options) {
    options = options || {};
    const status = options.status || null;
    const activityState = options.activityState || null;

    function report(input) {
      const event = normalizeReport(input);
      if (status) status.textContent = event.message;
      if (event.activity && activityState && typeof activityState.record === 'function') {
        activityState.record(event.activity);
      }
      return event;
    }

    return Object.freeze({ report });
  }

  function normalizeReport(input) {
    const value = input && typeof input === 'object' ? input : {};
    const activity = normalizeActivity(value.activity);
    return Object.freeze({
      message: String(value.message || ''),
      activity
    });
  }

  function normalizeActivity(input) {
    if (!input || typeof input !== 'object') return null;
    return Object.freeze({
      type: String(input.type || 'info'),
      action: String(input.action || 'Info'),
      targetPath: String(input.targetPath || ''),
      detail: String(input.detail || '')
    });
  }

  const api = { createActivityReporter, normalizeReport };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosActivityReporter = Object.freeze(api);
})();