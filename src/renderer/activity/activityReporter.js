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

    function createStatusSink(defaults) {
      const input = defaults && typeof defaults === 'object' ? defaults : {};
      const sink = {};
      Object.defineProperty(sink, 'textContent', {
        enumerable: true,
        get() {
          return status ? String(status.textContent || '') : '';
        },
        set(value) {
          const message = String(value || '');
          if (status) status.textContent = message;
          if (!message || !activityState || typeof activityState.record !== 'function') return;
          activityState.record({
            type: String(input.type || 'info'),
            action: String(input.action || 'Status'),
            targetPath: String(input.targetPath || ''),
            detail: message
          });
        }
      });
      return Object.freeze(sink);
    }

    return Object.freeze({ report, createStatusSink });
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
  if (typeof window !== 'undefined') window.VincariosActivityReporter = Object.freeze(api);
})();