(function() {
  'use strict';

  const DEFAULT_MAX_CHARS = 12000;

  function buildFileSummaryMessages(selection, options) {
    options = options || {};
    const normalized = normalizeSummarySelection(selection, options);
    if (!normalized.ok) return normalized;

    return {
      ok: true,
      messages: [
        {
          role: 'system',
          content: [
            'You are Vitruvios summarizing one selected Markdown file.',
            'Be concise and concrete.',
            'Do not propose edits, moves, tags, links, or write actions unless the user asks for them.',
            'If the file is mostly structure, summarize its purpose and main sections.'
          ].join('\n')
        },
        {
          role: 'user',
          content: [
            'Summarize this Markdown file for the user.',
            '',
            'Path: ' + normalized.path,
            normalized.truncated ? 'Content note: truncated to ' + normalized.maxChars + ' characters for this read-only summary.' : 'Content note: full loaded content included.',
            '',
            '```md',
            normalized.content,
            '```'
          ].join('\n')
        }
      ],
      path: normalized.path,
      truncated: normalized.truncated
    };
  }

  function normalizeSummarySelection(selection, options) {
    if (!selection || selection.kind !== 'file') {
      return { ok: false, code: 'not_file', message: 'Select a Markdown file first.' };
    }
    const path = String(selection.path || '');
    if (!/\.md$/i.test(path)) {
      return { ok: false, code: 'not_markdown', message: 'Summarize file supports Markdown files only.' };
    }
    if (selection.readAllowed !== true) {
      return { ok: false, code: 'read_required', message: 'Requires R on this file.' };
    }
    if (typeof selection.content !== 'string' || selection.content.length === 0) {
      return { ok: false, code: 'content_required', message: 'Requires loaded Markdown content.' };
    }

    const maxChars = normalizeMaxChars(options.maxChars);
    const truncated = selection.content.length > maxChars;
    const content = truncated ? selection.content.slice(0, maxChars) : selection.content;

    return { ok: true, path, content, maxChars, truncated };
  }

  function normalizeMaxChars(value) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 1000) return Math.floor(parsed);
    return DEFAULT_MAX_CHARS;
  }

  const api = { buildFileSummaryMessages, normalizeSummarySelection, DEFAULT_MAX_CHARS };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosFileSummaryAction = Object.freeze(api);
})();