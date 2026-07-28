(function() {
  'use strict';

  function buildFileSummaryFormatInstruction() {
    return [
      'Return Markdown body only. Do not repeat the file name or add a top-level title.',
      'Use `### Key points` with 3 to 6 concise bullets.',
      'Use `### Structure` only when it clarifies the note.',
      'Use `### Limits` only when the supplied content is incomplete or truncated.',
      'Use bold only for important terms. Do not use tables, callouts, or decorative emoji.'
    ].join(' ');
  }

  function buildFolderSummaryFormatInstruction() {
    return [
      'Return Markdown body only. Do not repeat the folder path or add a top-level title.',
      'Start with `### Included notes`. For each note, use a bullet with a bold code-styled file name, then a blank line and an indented italic one-sentence purpose description as a separate paragraph.',
      'Then use `### Overall summary` with concise bullets or short paragraphs.',
      'Use `### Limits` only when the selected scope or file limits affect confidence.',
      'Use bold only for important terms. Do not use tables, callouts, or decorative emoji.'
    ].join(' ');
  }

  function formatFileSummaryResponse(options) {
    options = options || {};
    const scope = options.truncated === true ? 'Source content was truncated for this read-only summary.' : 'Full loaded note content was used.';
    return [
      '## File summary',
      '',
      '_File: `' + normalizePath(options.path) + '`_',
      '_Source: ' + scope + '_',
      '',
      normalizeBody(options.content)
    ].join('\n').trim();
  }

  function formatFolderSummaryResponse(options) {
    options = options || {};
    const scope = normalizeScope(options.scope);
    const count = positiveInteger(options.includedFileCount, 0);
    const scopeLabel = scope.scope === 'subfolders'
      ? 'Subfolders · depth ' + String(scope.maxDepth)
      : 'Current folder only';
    const limitNote = options.limitedByFileCount === true ? ' · file limit reached' : '';
    return [
      '## Folder summary',
      '',
      '_Folder: `' + normalizePath(options.folderPath) + '`_',
      '_Scope: ' + scopeLabel + ' · ' + String(count) + ' Markdown notes' + limitNote + '_',
      '',
      normalizeBody(options.content)
    ].join('\n').trim();
  }

  function normalizeBody(value) {
    return String(value || '').trim() || '_No summary text was returned._';
  }

  function normalizePath(value) {
    return String(value || '').trim() || 'Unknown target';
  }

  function normalizeScope(value) {
    const input = value || {};
    return {
      scope: input.scope === 'subfolders' ? 'subfolders' : 'current',
      maxDepth: positiveInteger(input.maxDepth, 3)
    };
  }

  function positiveInteger(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
  }

  const api = {
    buildFileSummaryFormatInstruction,
    buildFolderSummaryFormatInstruction,
    formatFileSummaryResponse,
    formatFolderSummaryResponse
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosSummaryResponsePresentation = Object.freeze(api);
})();