(function() {
  'use strict';

  const INLINE_FORMATS = Object.freeze({
    bold: Object.freeze({ open: '**', close: '**' }),
    italic: Object.freeze({ open: '*', close: '*' }),
    highlight: Object.freeze({ open: '<mark style="background:#d3f8b6">', close: '</mark>' })
  });

  const LIST_ACTIONS = Object.freeze({
    bulletList: Object.freeze({ prefix: '- ', matches: /^\s*[-+*]\s+(?!\[[ xX]\]\s+)/ }),
    orderedList: Object.freeze({ prefix: 'ordered', matches: /^\s*\d+\.\s+/ }),
    taskList: Object.freeze({ prefix: '- [ ] ', matches: /^\s*[-+*]\s+\[[ xX]\]\s+/ })
  });

  function applyEditorFormat(options) {
    const input = options || {};
    const source = String(input.source || '');
    const selection = normalizeSelection(source, input.selectionStart, input.selectionEnd);
    const action = String(input.action || '');
    if (INLINE_FORMATS[action]) return toggleInline(source, selection, INLINE_FORMATS[action]);
    if (action === 'link') return insertLink(source, selection);
    if (action === 'heading2') return toggleLinePrefix(source, selection, {
      applies: /^\s{0,3}#{1,6}\s+/, remove: /^\s{0,3}#{1,6}\s+/, prefix: '## ', heading: true
    });
    if (LIST_ACTIONS[action]) return toggleList(source, selection, LIST_ACTIONS[action]);
    return unchanged(source, selection);
  }

  function toggleInline(source, selection, format) {
    const selected = source.slice(selection.start, selection.end);
    const wrapped = selected.startsWith(format.open) && selected.endsWith(format.close) && selected.length >= format.open.length + format.close.length;
    if (wrapped) {
      const value = selected.slice(format.open.length, selected.length - format.close.length);
      return replaceRange(source, selection, value, selection.start, selection.start + value.length);
    }
    const value = format.open + selected + format.close;
    return replaceRange(source, selection, value, selection.start + format.open.length, selection.start + format.open.length + selected.length);
  }

  function insertInternalWikilink(options) {
    const input = options || {};
    const source = String(input.source || '');
    const selection = normalizeSelection(source, input.selectionStart, input.selectionEnd);
    const target = normalizeWikilinkTarget(input.targetPath);
    if (!target) return unchanged(source, selection);
    const label = source.slice(selection.start, selection.end);
    const value = label ? '[[' + target + '|' + label + ']]' : '[[' + target + ']]';
    const cursor = selection.start + value.length;
    return replaceRange(source, selection, value, cursor, cursor);
  }

  function normalizeWikilinkTarget(value) {
    return String(value || '')
      .trim()
      .replace(/\\/g, '/')
      .replace(/\.md$/i, '')
      .replace(/[\[\]]/g, '');
  }
  function insertLink(source, selection) {
    const selected = source.slice(selection.start, selection.end) || 'text';
    const value = '[' + selected + '](url)';
    const urlStart = selection.start + selected.length + 3;
    return replaceRange(source, selection, value, urlStart, urlStart + 3);
  }

  function toggleLinePrefix(source, selection, rule) {
    const range = getLineRange(source, selection);
    const selectedLines = source.slice(range.start, range.end).split('\n');
    const relevantLines = selectedLines.filter((line) => line.trim().length > 0);
    if (!relevantLines.length) return unchanged(source, selection);
    const removePrefix = relevantLines.every((line) => rule.applies.test(line));
    const transformed = selectedLines.map((line) => {
      if (!line.trim()) return line;
      if (removePrefix) return line.replace(rule.remove, '');
      const indent = (line.match(/^\s*/) || [''])[0];
      if (rule.heading === true) {
        const content = line.replace(rule.remove, '').slice(indent.length);
        return indent + rule.prefix + content;
      }
      return indent + rule.prefix + line.slice(indent.length);
    }).join('\n');
    return replaceRange(source, range, transformed, range.start, range.start + transformed.length);
  }

  function toggleList(source, selection, action) {
    const range = getLineRange(source, selection);
    const selectedLines = source.slice(range.start, range.end).split('\n');
    const relevantLines = selectedLines.filter((line) => line.trim().length > 0);
    if (!relevantLines.length) return unchanged(source, selection);
    const removeTarget = relevantLines.every((line) => action.matches.test(line));
    let orderedNumber = 1;
    const transformed = selectedLines.map((line) => {
      if (!line.trim()) return line;
      const normalized = stripLeadingListMarkers(line);
      if (removeTarget) return normalized.indent + normalized.content;
      const prefix = action.prefix === 'ordered' ? String(orderedNumber++) + '. ' : action.prefix;
      return normalized.indent + prefix + normalized.content;
    }).join('\n');
    return replaceRange(source, range, transformed, range.start, range.start + transformed.length);
  }

  function stripLeadingListMarkers(line) {
    const indent = (line.match(/^\s*/) || [''])[0];
    let content = line.slice(indent.length);
    const marker = /^(?:(?:[-+*])\s+\[[ xX]\]\s+|(?:[-+*])\s+|(?:\d+\.)\s+)/;
    while (marker.test(content)) content = content.replace(marker, '');
    return { indent, content };
  }
  function getLineRange(source, selection) {
    const start = source.lastIndexOf('\n', Math.max(0, selection.start - 1)) + 1;
    const endAt = source.indexOf('\n', selection.end);
    return { start, end: endAt === -1 ? source.length : endAt };
  }

  function normalizeSelection(source, start, end) {
    const size = source.length;
    const normalizedStart = clamp(start, 0, size);
    const normalizedEnd = clamp(end, normalizedStart, size);
    return { start: normalizedStart, end: normalizedEnd };
  }

  function replaceRange(source, range, value, selectionStart, selectionEnd) {
    const nextSource = source.slice(0, range.start) + value + source.slice(range.end);
    return Object.freeze({
      source: nextSource,
      selectionStart: clamp(selectionStart, 0, nextSource.length),
      selectionEnd: clamp(selectionEnd, 0, nextSource.length)
    });
  }

  function unchanged(source, selection) {
    return Object.freeze({ source, selectionStart: selection.start, selectionEnd: selection.end });
  }

  function clamp(value, min, max) {
    const number = Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : min;
    return Math.max(min, Math.min(max, number));
  }

  const api = Object.freeze({ applyEditorFormat, insertInternalWikilink });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosEditorFormatting = api;
})();