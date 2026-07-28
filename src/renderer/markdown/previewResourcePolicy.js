(function() {
  'use strict';

  const PREVIEW_RESOURCE_LIMITS = Object.freeze({
    maxHistoryEntries: 30,
    maxHistoryBytes: 8 * 1024 * 1024,
    maxConcurrentImages: 4
  });

  function createBoundedPreviewHistory(options) {
    options = options || {};
    const maxEntries = positiveInteger(options.maxEntries, PREVIEW_RESOURCE_LIMITS.maxHistoryEntries);
    const maxBytes = positiveInteger(options.maxBytes, PREVIEW_RESOURCE_LIMITS.maxHistoryBytes);
    let items = [];
    let currentIndex = -1;

    function push(entry) {
      const normalized = normalizeEntry(entry);
      if (!normalized.path) return null;
      const current = items[currentIndex];
      if (current && current.path === normalized.path && current.source === normalized.source) return current;

      items = items.slice(0, currentIndex + 1);
      items.push(normalized);
      currentIndex = items.length - 1;
      trim();
      return items[currentIndex] || null;
    }

    function move(offset) {
      const nextIndex = currentIndex + Number(offset || 0);
      if (nextIndex < 0 || nextIndex >= items.length) return null;
      currentIndex = nextIndex;
      return items[currentIndex];
    }

    function replaceCurrent(source) {
      if (currentIndex < 0 || !items[currentIndex]) return null;
      items[currentIndex] = normalizeEntry({
        path: items[currentIndex].path,
        source
      });
      trim();
      return items[currentIndex] || null;
    }

    function reset() {
      items = [];
      currentIndex = -1;
    }

    function trim() {
      while (items.length > maxEntries) {
        items.shift();
        currentIndex -= 1;
      }
      while (items.length > 1 && totalBytes(items) > maxBytes) {
        if (currentIndex > 0) {
          items.shift();
          currentIndex -= 1;
        } else {
          items.pop();
        }
      }
      if (!items.length) currentIndex = -1;
      else currentIndex = Math.max(0, Math.min(currentIndex, items.length - 1));
    }

    return {
      push,
      move,
      replaceCurrent,
      reset,
      current: () => items[currentIndex] || null,
      entries: () => items.slice(),
      index: () => currentIndex,
      canMove: (offset) => {
        const nextIndex = currentIndex + Number(offset || 0);
        return nextIndex >= 0 && nextIndex < items.length;
      }
    };
  }

  function createPreviewTaskPool(options) {
    options = options || {};
    const concurrency = positiveInteger(options.concurrency, PREVIEW_RESOURCE_LIMITS.maxConcurrentImages);
    let generation = 0;
    let active = 0;
    let queue = [];

    function run(task) {
      const taskGeneration = generation;
      let resolvePromise;
      let rejectPromise;
      const promise = new Promise((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
      });
      queue.push({ task, generation: taskGeneration, resolve: resolvePromise, reject: rejectPromise });
      drain();
      return { generation: taskGeneration, promise };
    }

    function invalidate() {
      generation += 1;
      const stale = queue;
      queue = [];
      stale.forEach((entry) => entry.resolve({ stale: true }));
      return generation;
    }

    function drain() {
      while (active < concurrency && queue.length) {
        const entry = queue.shift();
        if (entry.generation !== generation) {
          entry.resolve({ stale: true });
          continue;
        }
        active += 1;
        Promise.resolve()
          .then(entry.task)
          .then(entry.resolve, entry.reject)
          .finally(() => {
            active -= 1;
            drain();
          });
      }
    }

    return {
      run,
      invalidate,
      isCurrent: (candidate) => candidate === generation,
      generation: () => generation
    };
  }

  function normalizeEntry(entry) {
    return {
      path: String((entry && entry.path) || ''),
      source: String((entry && entry.source) || '')
    };
  }

  function totalBytes(entries) {
    return entries.reduce((sum, entry) => sum + utf8Bytes(entry.source), 0);
  }

  function utf8Bytes(value) {
    const text = String(value || '');
    if (typeof Buffer !== 'undefined') return Buffer.byteLength(text, 'utf8');
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text).length;
    return unescape(encodeURIComponent(text)).length;
  }

  function positiveInteger(value, fallback) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : fallback;
  }

  const api = {
    PREVIEW_RESOURCE_LIMITS,
    createBoundedPreviewHistory,
    createPreviewTaskPool
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosPreviewResourcePolicy = Object.freeze(api);
})();
