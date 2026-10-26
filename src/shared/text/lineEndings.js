(function() {
  'use strict';

  function normalizeLineEndings(value) {
    return String(value || '').replace(/\r\n?/g, '\n');
  }

  function preserveLineEndings(value, reference) {
    const source = normalizeLineEndings(value);
    const original = String(reference || '');
    if (source === normalizeLineEndings(original)) return original;
    const counts = new Map();
    for (const match of original.matchAll(/\r\n|\r|\n/g)) {
      counts.set(match[0], (counts.get(match[0]) || 0) + 1);
    }
    let ending = '\n';
    let maximum = 0;
    for (const [candidate, count] of counts) {
      if (count > maximum) {
        ending = candidate;
        maximum = count;
      }
    }
    return source.replace(/\n/g, ending);
  }

  const api = Object.freeze({ normalizeLineEndings, preserveLineEndings });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosLineEndings = api;
})();
