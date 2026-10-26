(function() {
  'use strict';

  function isInternalMarkdownTarget(target) {
    const clean = cleanTarget(target);
    if (!clean) return false;
    if (/^[a-z][a-z0-9+.-]*:/i.test(clean)) return false;
    if (clean.startsWith('#')) return false;
    if (/\.(png|jpe?g|gif|webp|svg|pdf|mp3|mp4|mov|zip)$/i.test(clean)) return false;
    return true;
  }

  function createMarkdownLinkCandidates(target, currentPath) {
    const clean = cleanTarget(target);
    if (!isInternalMarkdownTarget(clean)) return [];

    const currentFolder = parentFolder(currentPath);
    const rawCandidates = [];
    const hasSlash = clean.includes('/');
    const isDotRelative = clean === '.' || clean === '..' || clean.startsWith('./') || clean.startsWith('../');
    const hasMarkdownExtension = /\.m(?:d|arkdown)$/i.test(clean);

    if (currentFolder) rawCandidates.push(joinPath(currentFolder, clean));
    if (!isDotRelative) rawCandidates.push(clean);

    const candidates = [];
    rawCandidates.forEach((candidate) => {
      if (hasMarkdownExtension) addUnique(candidates, normalizePath(candidate));
      else addUnique(candidates, normalizePath(candidate + '.md'));
      if (!hasMarkdownExtension && hasSlash && !isDotRelative) addUnique(candidates, normalizePath(candidate));
    });

    return candidates;
  }

  async function resolveMarkdownLink(target, currentPath, api) {
    const candidates = createMarkdownLinkCandidates(target, currentPath);
    if (!candidates.length) return linkedNoteNotFound(target);
    for (const candidate of candidates) {
      const read = await api.vault.readMarkdown(candidate);
      if (read.ok || read.code !== 'file_not_found') return read;
    }

    const clean = cleanTarget(target);
    if (clean.includes('/')) return linkedNoteNotFound(target);
    if (!api.search || typeof api.search.query !== 'function') {
      return { ok: false, code: 'metadata_index_unavailable', message: 'Refresh vault indexes in Settings before resolving note names across folders.' };
    }

    const hasExtension = /\.m(?:d|arkdown)$/i.test(clean);
    const lookup = await api.search.query({ query: clean.replace(/\.m(?:d|arkdown)$/i, ''), scope: 'files' });
    if (!lookup.ok) return lookup;
    const indexed = (lookup.results || []).filter((entry) => {
      const path = String(entry.path || '').replace(/\\/g, '/');
      return /\.m(?:d|arkdown)$/i.test(path)
        && !path.split('/').some((segment) => !segment || segment.startsWith('.'));
    });
    const name = normalizeLinkName(clean);
    const fileMatches = indexed.filter((entry) => {
      const filename = String(entry.path).replace(/\\/g, '/').split('/').pop();
      return normalizeLinkName(hasExtension ? filename : filename.replace(/\.m(?:d|arkdown)$/i, '')) === name;
    });
    const matches = fileMatches.length || hasExtension
      ? fileMatches
      : indexed.filter((entry) => normalizeLinkName(entry.title) === name);
    const paths = Array.from(new Set(matches.map((entry) => entry.path)));
    if (lookup.truncated || paths.length > 1) {
      return { ok: false, code: 'ambiguous_link', message: 'Linked note is ambiguous. Use its full vault-relative path in the link.' };
    }
    if (!paths.length) return linkedNoteNotFound(target);
    return api.vault.readMarkdown(paths[0]);
  }

  function normalizeLinkName(value) {
    return String(value || '').normalize('NFKC').trim().toLocaleLowerCase();
  }

  function linkedNoteNotFound(target) {
    return { ok: false, code: 'linked_note_not_found', message: 'Linked note could not be resolved: ' + target + '. Check the link path or refresh vault indexes in Settings.' };
  }

  function cleanTarget(target) {
    return decodeURIComponentSafe(String(target || ''))
      .replace(/\\/g, '/')
      .split('#')[0]
      .split('?')[0]
      .trim()
      .replace(/^\/+|\/+$/g, '');
  }

  function parentFolder(value) {
    const clean = cleanTarget(value);
    const index = clean.lastIndexOf('/');
    return index === -1 ? '' : clean.slice(0, index);
  }

  function joinPath(folder, target) {
    const normalizedFolder = cleanTarget(folder);
    const normalizedTarget = cleanTarget(target);
    const stack = normalizedFolder ? normalizedFolder.split('/') : [];
    normalizedTarget.split('/').forEach((part) => {
      if (!part || part === '.') return;
      if (part === '..') stack.pop();
      else stack.push(part);
    });
    return stack.join('/');
  }

  function normalizePath(value) {
    return String(value || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  }

  function decodeURIComponentSafe(value) {
    try {
      return decodeURIComponent(value);
    } catch (error) {
      return value;
    }
  }

  function addUnique(list, value) {
    if (value && !list.includes(value)) list.push(value);
  }

  const api = {
    isInternalMarkdownTarget,
    createMarkdownLinkCandidates,
    resolveMarkdownLink
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosMarkdownLinkResolver = Object.freeze(api);
})();
