(function() {
  'use strict';

  function buildMarkdownDiffPreview(input) {
    const currentLines = splitLines(input && input.currentContent);
    const proposedLines = splitLines(input && input.proposedContent);
    const diffLines = buildLineDiff(currentLines, proposedLines);
    const additions = diffLines.filter((line) => line.type === 'add').length;
    const deletions = diffLines.filter((line) => line.type === 'remove').length;
    const changed = additions > 0 || deletions > 0;
  
    return {
      ok: true,
      changed,
      additions,
      deletions,
      summary: changed ? '+' + additions + ' -' + deletions : 'No changes',
      hunks: changed ? [{ oldStart: 1, newStart: 1, lines: diffLines }] : []
    };
  }
  
  function buildLineDiff(before, after) {
    const table = buildLcsTable(before, after);
    const lines = [];
    let oldNumber = 1;
    let newNumber = 1;
    let i = 0;
    let j = 0;
  
    while (i < before.length || j < after.length) {
      if (i < before.length && j < after.length && before[i] === after[j]) {
        lines.push({ type: 'context', text: before[i], oldNumber, newNumber });
        i += 1;
        j += 1;
        oldNumber += 1;
        newNumber += 1;
      } else if (j < after.length && (i === before.length || table[i][j + 1] >= table[i + 1][j])) {
        lines.push({ type: 'add', text: after[j], oldNumber: null, newNumber });
        j += 1;
        newNumber += 1;
      } else if (i < before.length) {
        lines.push({ type: 'remove', text: before[i], oldNumber, newNumber: null });
        i += 1;
        oldNumber += 1;
      }
    }
  
    return lines;
  }
  
  function buildLcsTable(before, after) {
    const table = Array.from({ length: before.length + 1 }, () => Array(after.length + 1).fill(0));
    for (let i = before.length - 1; i >= 0; i -= 1) {
      for (let j = after.length - 1; j >= 0; j -= 1) {
        table[i][j] = before[i] === after[j]
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1]);
      }
    }
    return table;
  }
  
  function splitLines(value) {
    const normalized = String(value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    return normalized.length ? normalized.split('\n') : [];
  }
  
  const api = { buildMarkdownDiffPreview };
  
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosDiffPreview = Object.freeze(api);
})();
