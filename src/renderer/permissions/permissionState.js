(function() {
  'use strict';

  function createPermissionState(options) {
    options = options || {};
    const onChange = typeof options.onChange === 'function' ? options.onChange : null;
    const entries = new Map();

    function get(path) {
      const normalized = normalizePermissionPath(path);
      return cloneEntry(entries.get(normalized) || createEntry(normalized));
    }

    function resolve(path) {
      const normalized = normalizePermissionPath(path);
      const read = resolveFlag(normalized, 'read');
      const write = resolveFlag(normalized, 'write');
      return {
        path: normalized,
        read: read.value,
        write: write.value,
        readState: read.state,
        writeState: write.state
      };
    }

    function toggleRead(path) {
      return setFlag(path, 'read', !resolve(path).read);
    }

    function toggleWrite(path) {
      return setFlag(path, 'write', !resolve(path).write);
    }

    function setReadForPaths(paths, value) {
      return setFlagForPaths(paths, 'read', value);
    }

    function setWriteForPaths(paths, value) {
      return setFlagForPaths(paths, 'write', value);
    }

    function clear(path) {
      const normalized = normalizePermissionPath(path);
      entries.delete(normalized);
      const state = createEntry(normalized);
      notify(state);
      return cloneEntry(state);
    }

    function setFlagForPaths(paths, flag, value) {
      const normalizedPaths = Array.from(new Set((Array.isArray(paths) ? paths : [])
        .map(normalizePermissionPath)
        .filter(Boolean)));

      normalizedPaths.forEach((path) => setFlag(path, flag, value, { silent: true }));

      const result = snapshot().filter((entry) => normalizedPaths.includes(entry.path));
      if (onChange && result.length) onChange(cloneEntry(result[0]), snapshot());
      return result;
    }

    function snapshot() {
      return Array.from(entries.values())
        .map(cloneEntry)
        .sort((a, b) => a.path.localeCompare(b.path));
    }

    function setFlag(path, flag, value, options) {
      const normalized = normalizePermissionPath(path);
      const current = entries.get(normalized) || createEntry(normalized);
      const next = Object.assign({}, current, {
        [flag]: !!value,
        [flag + 'Set']: true
      });
      entries.set(normalized, next);
      if (!options || options.silent !== true) notify(next);
      return cloneEntry(next);
    }

    function resolveFlag(path, flag) {
      const candidates = permissionCandidates(path);
      for (let index = 0; index < candidates.length; index += 1) {
        const entry = entries.get(candidates[index]);
        if (!entry || entry[flag + 'Set'] !== true) continue;
        if (entry[flag] === true) {
          return { value: true, state: index === 0 ? 'direct' : 'inherited' };
        }
        return { value: false, state: 'off' };
      }
      return { value: false, state: 'off' };
    }

    function notify(entry) {
      if (onChange) onChange(cloneEntry(entry), snapshot());
    }

    return Object.freeze({ get, resolve, toggleRead, toggleWrite, setReadForPaths, setWriteForPaths, clear, snapshot });
  }

  function permissionCandidates(path) {
    const normalized = normalizePermissionPath(path);
    if (!normalized) return [''];
    const parts = normalized.split('/').filter(Boolean);
    const candidates = [normalized];
    for (let count = parts.length - 1; count > 0; count -= 1) {
      candidates.push(parts.slice(0, count).join('/'));
    }
    candidates.push('');
    return candidates;
  }

  function createEntry(path) {
    return {
      path,
      read: false,
      write: false,
      readSet: false,
      writeSet: false
    };
  }

  function cloneEntry(entry) {
    return {
      path: entry.path,
      read: entry.read,
      write: entry.write
    };
  }

  function normalizePermissionPath(value) {
    return String(value || '')
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, '')
      .trim();
  }

  const api = { createPermissionState, normalizePermissionPath };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosPermissionState = Object.freeze(api);
})();