(function() {
  'use strict';

  const DEFAULT_MAX_FILES = 30;
  const DEFAULT_MAX_CHARS_PER_FILE = 8000;

  function buildFolderMarkdownSummaryMessages(input) {
    const normalized = normalizeFolderMarkdownFiles(input || {});
    if (!normalized.ok) return normalized;

    return {
      ok: true,
      folderPath: normalized.folderPath,
      scope: normalized.scope,
      files: normalized.files,
      limitedByFileCount: normalized.limitedByFileCount,
      messages: [
        {
          role: 'system',
          content: [
            'You are vitruvios summarizing Markdown files in one selected folder scope.',
            'Use only the provided Markdown file contents.',
            'Be concise and concrete.',
            'Do not propose edits, moves, tags, links, or write actions unless the user asks for them.',
            'If the folder appears mixed or incomplete, say that this summary is limited to the explicitly included Markdown files.',
            getSummaryPresentation().buildFolderSummaryFormatInstruction()
          ].join('\n')
        },
        {
          role: 'user',
          content: buildUserPrompt(normalized)
        }
      ]
    };
  }

  function getSummaryPresentation() {
    if (typeof window !== 'undefined' && window.VitruviosSummaryResponsePresentation) return window.VitruviosSummaryResponsePresentation;
    if (typeof module !== 'undefined' && module.exports) return require('./summaryResponsePresentation');
    throw new Error('vitruvios summary response presentation is not available.');
  }

  function normalizeFolderMarkdownFiles(input) {
    const folderPath = String(input.folderPath || '').trim();
    const files = Array.isArray(input.files) ? input.files : [];
    const limits = normalizeLimits(input.limits || {});
    const scope = normalizeScope(input.scope);
    const markdownFiles = files
      .filter((file) => file && isMarkdownPath(file.path) && typeof file.content === 'string')
      .slice(0, limits.maxAnalysisFiles)
      .map((file) => normalizeFile(file, limits.maxCharsPerFile));

    if (!markdownFiles.length) {
      return { ok: false, code: 'no_markdown_files', message: 'No Markdown files are available in the selected folder scope.' };
    }

    const markdownCount = files.filter((file) => file && isMarkdownPath(file.path)).length;
    return {
      ok: true,
      folderPath,
      scope,
      files: markdownFiles,
      maxAnalysisFiles: limits.maxAnalysisFiles,
      maxCharsPerFile: limits.maxCharsPerFile,
      limitedByFileCount: markdownCount > markdownFiles.length
    };
  }

  function normalizeScope(scope) {
    scope = scope || {};
    return {
      scope: scope.scope === 'subfolders' ? 'subfolders' : 'current',
      maxDepth: positiveIntegerOrDefault(scope.maxDepth, 3),
      maxFiles: positiveIntegerOrDefault(scope.maxFiles, DEFAULT_MAX_FILES)
    };
  }

  function describeScope(scope) {
    return scope && scope.scope === 'subfolders'
      ? 'subfolders (maximum depth: ' + String(scope.maxDepth) + ')'
      : 'current folder only';
  }

  function normalizeLimits(limits) {
    return {
      maxAnalysisFiles: positiveIntegerOrDefault(limits.maxAnalysisFiles, DEFAULT_MAX_FILES),
      maxCharsPerFile: positiveIntegerOrDefault(limits.maxSelectedFileChars, DEFAULT_MAX_CHARS_PER_FILE)
    };
  }

  function normalizeFile(file, maxChars) {
    const raw = String(file.content || '');
    const truncated = raw.length > maxChars;
    return {
      path: String(file.path || ''),
      content: truncated ? raw.slice(0, maxChars) : raw,
      truncated
    };
  }

  function buildUserPrompt(normalized) {
    const parts = [
      'Summarize the Markdown files in this explicitly selected folder scope.',
      '',
      'Folder: ' + normalized.folderPath,
      'Scope: ' + describeScope(normalized.scope),
      'Files included: ' + normalized.files.length,
      normalized.limitedByFileCount ? 'Limit note: only the first ' + normalized.maxAnalysisFiles + ' Markdown files are included.' : 'Limit note: all selected Markdown files are included.',
      '',
      'For each file, identify its likely purpose in one short phrase, then provide an overall folder summary.'
    ];

    normalized.files.forEach((file) => {
      parts.push('', '---', 'Path: ' + file.path);
      if (file.truncated) parts.push('Content note: truncated to ' + normalized.maxCharsPerFile + ' characters.');
      parts.push('', '```md', file.content, '```');
    });

    return parts.join('\n');
  }

  function positiveIntegerOrDefault(value, fallback) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return Math.floor(number);
    return fallback;
  }

  function isMarkdownPath(value) {
    return /\.(md|markdown)$/i.test(String(value || ''));
  }

  const api = {
    buildFolderMarkdownSummaryMessages,
    normalizeFolderMarkdownFiles,
    DEFAULT_MAX_FILES,
    DEFAULT_MAX_CHARS_PER_FILE
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosFolderSummaryAction = Object.freeze(api);
})();