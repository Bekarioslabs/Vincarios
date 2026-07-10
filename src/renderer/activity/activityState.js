(function() {
  'use strict';

  const ACTIVITY_TYPES = Object.freeze(['info', 'success', 'warning', 'error']);
  const DEFAULT_MAX_ENTRIES = 200;

  function createActivityState(options) {
    const maxEntries = normalizeMaxEntries(options && options.maxEntries);
    let entries = [];
    const subscribers = new Set();

    function snapshot() {
      return Object.freeze({
        entries: Object.freeze(entries.slice())
      });
    }

    function record(input) {
      const entry = normalizeActivityEntry(input);
      entries = entries.concat(entry).slice(-maxEntries);
      notify();
      return entry;
    }

    function clear() {
      if (!entries.length) return snapshot();
      entries = [];
      notify();
      return snapshot();
    }

    function subscribe(listener) {
      if (typeof listener !== 'function') return function noop() {};
      subscribers.add(listener);
      return function unsubscribe() {
        subscribers.delete(listener);
      };
    }

    function notify() {
      const nextSnapshot = snapshot();
      subscribers.forEach((listener) => listener(nextSnapshot));
    }

    return Object.freeze({
      clear,
      record,
      snapshot,
      subscribe
    });
  }

  function normalizeActivityEntry(input) {
    const value = input && typeof input === 'object' ? input : {};
    const type = ACTIVITY_TYPES.includes(value.type) ? value.type : 'info';
    return Object.freeze({
      id: createActivityId(),
      time: formatActivityTime(value.time),
      type,
      action: String(value.action || activityTypeLabel(type)),
      targetPath: String(value.targetPath || ''),
      detail: String(value.detail || '')
    });
  }

  function formatActivityTime(value) {
    const date = value instanceof Date ? value : new Date();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return hours + ':' + minutes;
  }

  function activityTypeLabel(type) {
    if (type === 'success') return 'Done';
    if (type === 'warning') return 'Warning';
    if (type === 'error') return 'Error';
    return 'Info';
  }

  function normalizeMaxEntries(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : DEFAULT_MAX_ENTRIES;
  }

  function createActivityId() {
    return 'activity-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  const api = {
    ACTIVITY_TYPES,
    createActivityState,
    normalizeActivityEntry
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusActivityState = Object.freeze(api);
})();
