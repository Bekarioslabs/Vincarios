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

    function toggleRead(path) {
      return update(path, (entry) => ({ ...entry, read: !entry.read }));
    }

    function toggleWrite(path) {
      return update(path, (entry) => ({ ...entry, write: !entry.write }));
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

      normalizedPaths.forEach((path) => {
        const current = entries.get(path) || createEntry(path);
        const next = { ...current, [flag]: !!value };
        if (next.read || next.write) entries.set(path, next);
        else entries.delete(path);
      });

      const result = snapshot().filter((entry) => normalizedPaths.includes(entry.path));
      if (onChange && result.length) onChange(cloneEntry(result[0]), snapshot());
      return result;
    }

    function snapshot() {
      return Array.from(entries.values())
        .map(cloneEntry)
        .sort((a, b) => a.path.localeCompare(b.path));
    }

    function update(path, updater) {
      const normalized = normalizePermissionPath(path);
      const current = entries.get(normalized) || createEntry(normalized);
      const next = updater(current);

      if (next.read || next.write) entries.set(normalized, next);
      else entries.delete(normalized);

      notify(next);
      return cloneEntry(next);
    }

    function notify(entry) {
      if (onChange) onChange(cloneEntry(entry), snapshot());
    }

    return Object.freeze({ get, toggleRead, toggleWrite, setReadForPaths, setWriteForPaths, clear, snapshot });
  }

  function createEntry(path) {
    return {
      path,
      read: false,
      write: false
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
  if (typeof window !== 'undefined') window.ZeusPermissionState = Object.freeze(api);
})();