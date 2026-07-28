'use strict';

function createIndexRefreshCoordinator() {
  const inFlight = new Map();

  function run(key, operation) {
    const normalizedKey = String(key || '').trim();
    if (!normalizedKey) return Promise.reject(new Error('Index refresh key is required.'));
    if (typeof operation !== 'function') return Promise.reject(new Error('Index refresh operation is required.'));
    if (inFlight.has(normalizedKey)) return inFlight.get(normalizedKey);

    let result;
    try {
      result = operation();
    } catch (error) {
      return Promise.reject(error);
    }
    const promise = Promise.resolve(result)
      .finally(() => {
        if (inFlight.get(normalizedKey) === promise) inFlight.delete(normalizedKey);
      });
    inFlight.set(normalizedKey, promise);
    return promise;
  }

  return Object.freeze({
    run,
    isRunning: (key) => inFlight.has(String(key || '').trim()),
    activeKeys: () => Array.from(inFlight.keys())
  });
}

module.exports = { createIndexRefreshCoordinator };
