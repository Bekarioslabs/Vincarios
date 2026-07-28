(function() {
  'use strict';

  function renderDiffLines(root, diffPreview) {
    if (!root) return;
    const hunks = diffPreview && Array.isArray(diffPreview.hunks) ? diffPreview.hunks : [];
    if (hunks.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'review-diff-line';
      empty.textContent = 'No changes';
      root.appendChild(empty);
      return;
    }
    hunks.forEach((hunk) => {
      const lines = Array.isArray(hunk && hunk.lines) ? hunk.lines : [];
      lines.forEach((line) => {
        const row = document.createElement('div');
        row.className = 'review-diff-line review-diff-line-' + line.type;
        row.textContent = diffPrefix(line.type) + ' ' + String(line.text || '');
        root.appendChild(row);
      });
    });
  }

  function diffPrefix(type) {
    if (type === 'add') return '+';
    if (type === 'remove') return '-';
    return ' ';
  }

  const api = { renderDiffLines, diffPrefix };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosDiffLineRenderer = Object.freeze(api);
})();