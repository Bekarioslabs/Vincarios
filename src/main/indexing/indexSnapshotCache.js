'use strict';

function createIndexSnapshotCache(options) {
  options = options || {};
  const fileSystem = options.fs;
  if (!fileSystem || typeof fileSystem.statSync !== 'function') {
    throw new Error('Index snapshot cache requires a filesystem stat API.');
  }
  const snapshots = new Map();

  function read(key, filePaths, loader) {
    const normalizedKey = String(key || '').trim();
    if (!normalizedKey) throw new Error('Index snapshot key is required.');
    if (typeof loader !== 'function') throw new Error('Index snapshot loader is required.');
    const signature = createSignature(filePaths);
    const existing = snapshots.get(normalizedKey);
    if (existing && existing.signature === signature) return existing.value;
    const value = loader();
    snapshots.set(normalizedKey, { signature, value });
    return value;
  }

  function store(key, filePaths, value) {
    const normalizedKey = String(key || '').trim();
    if (!normalizedKey) throw new Error('Index snapshot key is required.');
    snapshots.set(normalizedKey, {
      signature: createSignature(filePaths),
      value
    });
    return value;
  }

  function invalidate(key) {
    if (key === undefined || key === null || String(key).trim() === '') {
      snapshots.clear();
      return;
    }
    snapshots.delete(String(key).trim());
  }

  function createSignature(filePaths) {
    return (Array.isArray(filePaths) ? filePaths : []).map((filePath) => {
      try {
        const stat = fileSystem.statSync(filePath);
        return String(filePath) + ':' + String(stat.size) + ':' + String(stat.mtimeMs);
      } catch (_error) {
        return String(filePath) + ':missing';
      }
    }).join('|');
  }

  return Object.freeze({ read, store, invalidate });
}

module.exports = { createIndexSnapshotCache };
