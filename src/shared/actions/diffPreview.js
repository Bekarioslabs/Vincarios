(function() {
  'use strict';

  const DIFF_LIMITS = Object.freeze({
    maxCharsPerSide: 350000,
    maxLinesPerSide: 50000,
    maxEditDistance: 1000,
    contextLines: 3
  });

  const UPDATE_RISK_LIMITS = Object.freeze({
    minimumRemovedLines: 10,
    removedLineRatio: 0.3,
    minimumRetainedLengthRatio: 0.6
  });

  function getFrontmatterApi() {
    if (typeof window !== 'undefined' && window.VincariosFrontmatterContract) return window.VincariosFrontmatterContract;
    if (typeof require === 'function') return require('../metadata/frontmatterContract');
    throw new Error('Frontmatter contract API unavailable.');
  }

  function assessUpdateRisk(input) {
    const current = input && input.currentContent;
    const proposed = input && input.proposedContent;
    if (typeof current !== 'string' || typeof proposed !== 'string' || !proposed.trim()) {
      return { level: 'blocked', reasons: ['A complete, non-empty update is required.'] };
    }
    const diff = input.diffPreview || buildMarkdownDiffPreview(input);
    if (!diff.ok || !Number.isFinite(diff.deletions) || diff.deletions < 0) {
      return { level: 'blocked', reasons: [diff.message || 'Safe diff preview unavailable.'] };
    }
    const reasons = [];
    const currentLines = splitLines(current);
    const lineCount = currentLines.length - (currentLines.at(-1) === '' ? 1 : 0);
    const removesFinalTerminator = currentLines.at(-1) === '' && Array.isArray(diff.hunks)
      && diff.hunks.some((hunk) => hunk.lines.some((line) => line.type === 'remove'
        && line.oldNumber === currentLines.length && line.text === ''));
    const removedLines = diff.deletions - (removesFinalTerminator ? 1 : 0);
    if (removedLines >= UPDATE_RISK_LIMITS.minimumRemovedLines
      && removedLines >= lineCount * UPDATE_RISK_LIMITS.removedLineRatio) {
      reasons.push('Removes or replaces at least ' + UPDATE_RISK_LIMITS.minimumRemovedLines
        + ' lines and ' + Math.round(UPDATE_RISK_LIMITS.removedLineRatio * 100) + '% of the original lines.');
    }
    if (proposed.length < current.length * UPDATE_RISK_LIMITS.minimumRetainedLengthRatio) {
      reasons.push('The replacement is shorter than ' + Math.round(UPDATE_RISK_LIMITS.minimumRetainedLengthRatio * 100) + '% of the original text.');
    }
    if (findFrontmatterRange(currentLines) && !findFrontmatterRange(splitLines(proposed))) {
      reasons.push('Removes the YAML frontmatter block.');
    }
    return { level: reasons.length ? 'high' : 'normal', reasons };
  }

  function buildMarkdownDiffPreview(input) {
    const currentContent = String(input && input.currentContent || '');
    const proposedContent = String(input && input.proposedContent || '');
    if (currentContent === proposedContent) return unchangedPreview();
    if (currentContent.length > DIFF_LIMITS.maxCharsPerSide || proposedContent.length > DIFF_LIMITS.maxCharsPerSide) {
      return fail('diff_too_large', 'Diff preview input exceeds the safe character limit.');
    }

    const currentLines = splitLines(currentContent);
    const proposedLines = splitLines(proposedContent);
    if (currentLines.length > DIFF_LIMITS.maxLinesPerSide || proposedLines.length > DIFF_LIMITS.maxLinesPerSide) {
      return fail('diff_too_large', 'Diff preview input exceeds the safe line limit.');
    }

    const lineDiff = buildLineDiff(currentLines, proposedLines);
    if (!lineDiff.ok) return lineDiff;

    const additions = lineDiff.lines.filter((line) => line.type === 'add').length;
    const deletions = lineDiff.lines.filter((line) => line.type === 'remove').length;
    return {
      ok: true,
      changed: true,
      additions,
      deletions,
      summary: '+' + additions + ' -' + deletions,
      hunks: buildContextHunks(lineDiff.lines, DIFF_LIMITS.contextLines, {
        current: findFrontmatterRange(currentLines),
        proposed: findFrontmatterRange(proposedLines)
      })
    };
  }

  function buildLineDiff(before, after) {
    const maximumDistance = Math.min(
      before.length + after.length,
      DIFF_LIMITS.maxEditDistance
    );
    const frontier = new Map([[1, 0]]);
    const trace = [];

    for (let distance = 0; distance <= maximumDistance; distance += 1) {
      trace.push(new Map(frontier));
      for (let diagonal = -distance; diagonal <= distance; diagonal += 2) {
        let x;
        if (
          diagonal === -distance
          || (
            diagonal !== distance
            && getFrontier(frontier, diagonal - 1) < getFrontier(frontier, diagonal + 1)
          )
        ) {
          x = getFrontier(frontier, diagonal + 1);
        } else {
          x = getFrontier(frontier, diagonal - 1) + 1;
        }

        let y = x - diagonal;
        while (x < before.length && y < after.length && before[x] === after[y]) {
          x += 1;
          y += 1;
        }
        frontier.set(diagonal, x);

        if (x >= before.length && y >= after.length) {
          return {
            ok: true,
            lines: annotateLineNumbers(backtrack(trace, before, after))
          };
        }
      }
    }

    return fail(
      'diff_too_complex',
      'Diff preview exceeds the safe edit-distance limit.'
    );
  }

  function backtrack(trace, before, after) {
    const reversed = [];
    let x = before.length;
    let y = after.length;

    for (let distance = trace.length - 1; distance >= 0; distance -= 1) {
      const frontier = trace[distance];
      const diagonal = x - y;
      const previousDiagonal = (
        diagonal === -distance
        || (
          diagonal !== distance
          && getFrontier(frontier, diagonal - 1) < getFrontier(frontier, diagonal + 1)
        )
      )
        ? diagonal + 1
        : diagonal - 1;
      const previousX = getFrontier(frontier, previousDiagonal);
      const previousY = previousX - previousDiagonal;

      while (x > previousX && y > previousY) {
        reversed.push({ type: 'context', text: before[x - 1] });
        x -= 1;
        y -= 1;
      }
      if (distance === 0) break;

      if (x === previousX) {
        reversed.push({ type: 'add', text: after[y - 1] });
        y -= 1;
      } else {
        reversed.push({ type: 'remove', text: before[x - 1] });
        x -= 1;
      }
    }

    return reversed.reverse();
  }

  function annotateLineNumbers(operations) {
    let oldNumber = 1;
    let newNumber = 1;
    return operations.map((operation) => {
      if (operation.type === 'context') {
        const line = Object.assign({}, operation, { oldNumber, newNumber });
        oldNumber += 1;
        newNumber += 1;
        return line;
      }
      if (operation.type === 'add') {
        const line = Object.assign({}, operation, { oldNumber: null, newNumber });
        newNumber += 1;
        return line;
      }
      const line = Object.assign({}, operation, { oldNumber, newNumber: null });
      oldNumber += 1;
      return line;
    });
  }

  function buildContextHunks(lines, contextLines, frontmatter) {
    const changedIndexes = [];
    lines.forEach((line, index) => {
      if (line.type !== 'context') changedIndexes.push(index);
    });
    if (!changedIndexes.length) return [];

    const frontmatterRange = findFrontmatterOperationRange(lines, frontmatter);
    const ranges = [];
    for (const index of changedIndexes) {
      let start = Math.max(0, index - contextLines);
      let end = Math.min(lines.length, index + contextLines + 1);
      if (frontmatterRange && index >= frontmatterRange.start && index <= frontmatterRange.end) {
        start = frontmatterRange.start;
        end = frontmatterRange.end + 1;
      } else if (frontmatterRange && start < frontmatterRange.end + 1 && end > frontmatterRange.start) {
        // Keep the closing delimiter as body-change context, never a partial property tail.
        start = Math.max(start, frontmatterRange.end);
      }
      const previous = ranges[ranges.length - 1];
      if (previous && start <= previous.end) {
        previous.end = Math.max(previous.end, end);
      } else {
        ranges.push({ start, end });
      }
    }

    return ranges.map((range) => {
      const hunkLines = lines.slice(range.start, range.end);
      return {
        oldStart: firstLineNumber(hunkLines, 'oldNumber'),
        newStart: firstLineNumber(hunkLines, 'newNumber'),
        lines: hunkLines
      };
    });
  }

  function findFrontmatterRange(lines) {
    if (!Array.isArray(lines)) return null;
    const source = lines.join('\n');
    const block = getFrontmatterApi().extractFrontmatterBlock(source);
    if (!block) return null;
    const header = source.slice(0, source.length - block.body.length).replace(/\n$/, '');
    return { start: 1, end: header.split('\n').length };
  }

  function findFrontmatterOperationRange(lines, frontmatter) {
    const current = frontmatter && frontmatter.current;
    const proposed = frontmatter && frontmatter.proposed;
    if (!current && !proposed) return null;

    let start = null;
    let end = null;
    lines.forEach((line, index) => {
      if (!isFrontmatterOperation(line, current, proposed)) return;
      if (start === null) start = index;
      end = index;
    });
    return start === null ? null : { start, end };
  }

  function isFrontmatterOperation(line, current, proposed) {
    return isLineNumberInRange(line && line.oldNumber, current)
      || isLineNumberInRange(line && line.newNumber, proposed);
  }

  function isLineNumberInRange(value, range) {
    return Number.isInteger(value)
      && range
      && value >= range.start
      && value <= range.end;
  }

  function firstLineNumber(lines, property) {
    const line = lines.find((entry) => Number.isInteger(entry[property]));
    return line ? line[property] : 1;
  }

  function unchangedPreview() {
    return {
      ok: true,
      changed: false,
      additions: 0,
      deletions: 0,
      summary: 'No changes',
      hunks: []
    };
  }

  function getFrontier(frontier, diagonal) {
    return frontier.has(diagonal) ? frontier.get(diagonal) : Number.NEGATIVE_INFINITY;
  }

  function splitLines(value) {
    const normalized = String(value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    return normalized.length ? normalized.split('\n') : [];
  }

  function fail(code, message) {
    return {
      ok: false,
      code,
      message,
      limits: DIFF_LIMITS
    };
  }

  const api = {
    DIFF_LIMITS,
    UPDATE_RISK_LIMITS,
    buildMarkdownDiffPreview,
    assessUpdateRisk
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosDiffPreview = Object.freeze(api);
})();
