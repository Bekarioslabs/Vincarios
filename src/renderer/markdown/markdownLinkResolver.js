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
    createMarkdownLinkCandidates
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosMarkdownLinkResolver = Object.freeze(api);
})();
