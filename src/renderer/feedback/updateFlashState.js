(function() {
  'use strict';

  const DEFAULT_DURATION_MS = 850;

  function createUpdateFlashState(options) {
    options = options || {};
    const normalizePath = typeof options.normalizePath === 'function' ? options.normalizePath : defaultNormalizePath;
    const durationMs = normalizeDuration(options.durationMs);
    const timers = new Map();
    const active = new Map();
    const subscribers = new Set();

    function snapshot() {
      return {
        activeTargets: Array.from(active.values()).map((target) => Object.assign({}, target))
      };
    }

    function subscribe(listener) {
      if (typeof listener !== 'function') return function noop() {};
      subscribers.add(listener);
      listener(snapshot());
      return function unsubscribe() {
        subscribers.delete(listener);
      };
    }

    function notify() {
      const next = snapshot();
      subscribers.forEach((listener) => listener(next));
    }

    function flashTargets(targets) {
      const normalizedTargets = normalizeTargets(targets, normalizePath);
      if (!normalizedTargets.length) return snapshot();

      normalizedTargets.forEach((target) => {
        clearTargetTimer(target.path);
        active.set(target.path, target);
        timers.set(target.path, setTimeout(() => clearTarget(target.path), durationMs));
      });
      notify();
      return snapshot();
    }

    function clearTarget(path) {
      const normalizedPath = normalizePath(path || '');
      clearTargetTimer(normalizedPath);
      if (!active.delete(normalizedPath)) return snapshot();
      notify();
      return snapshot();
    }

    function clear() {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      if (!active.size) return snapshot();
      active.clear();
      notify();
      return snapshot();
    }

    function isFlashing(path) {
      return active.has(normalizePath(path || ''));
    }

    function clearTargetTimer(path) {
      const timer = timers.get(path);
      if (timer) clearTimeout(timer);
      timers.delete(path);
    }

    return {
      flashTargets,
      clearTarget,
      clear,
      isFlashing,
      subscribe,
      snapshot
    };
  }

  function normalizeTargets(targets, normalizePath) {
    const input = Array.isArray(targets) ? targets : [targets];
    const seen = new Set();
    const normalized = [];

    input.forEach((target) => {
      const rawPath = target && typeof target === 'object' ? target.path : target;
      const path = normalizePath(rawPath || '');
      if (!path || seen.has(path)) return;
      seen.add(path);
      normalized.push({
        path,
        kind: String((target && target.kind) || 'file'),
        reason: String((target && target.reason) || 'updated')
      });
    });

    return normalized;
  }

  function normalizeDuration(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 100) return DEFAULT_DURATION_MS;
    return Math.round(number);
  }

  function defaultNormalizePath(value) {
    return String(value || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/').trim();
  }

  const api = { createUpdateFlashState, normalizeTargets };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusUpdateFlashState = Object.freeze(api);
})();
