(function() {
  'use strict';

  function buildInboxCleanupReport(options) {
    const input = options || {};
    const directEntries = Array.isArray(input.entries) ? input.entries.map(normalizeEntry).filter(Boolean) : [];
    const childEntries = collectChildEntries(input.childEntriesByFolder);
    const entries = directEntries.concat(childEntries);
    const inboxPath = normalizePath(input.inboxPath || '00_Inbox');
    const scannedFolders = [inboxPath].concat(Object.keys(input.childEntriesByFolder || {}).map(normalizePath).filter(Boolean));
    const files = entries.filter((entry) => entry.kind === 'file');
    const folders = entries.filter((entry) => entry.kind === 'folder');
    const markdown = files.filter(isMarkdownEntry);

    const groups = [
      buildGroup('subfolders', 'Subfolders', 'Folders directly inside the inbox.', folders),
      buildGroup('summary_notes', 'Summary Notes', 'Generated summaries that may belong in a project or knowledge folder.', markdown.filter(isSummaryEntry)),
      buildGroup('ai_response_notes', 'AI Response Notes', 'Markdown notes that look like saved assistant output.', markdown.filter((entry) => isAiResponseEntry(entry) && !isSummaryEntry(entry))),
      buildGroup('loose_markdown', 'Loose Markdown Notes', 'Markdown files not matched by a stronger cleanup hint.', markdown.filter((entry) => !isSummaryEntry(entry) && !isAiResponseEntry(entry))),
      buildGroup('other_files', 'Other Files', 'Non-Markdown files are reported only in V1 cleanup light.', files.filter((entry) => !isMarkdownEntry(entry)))
    ].filter((group) => group.count > 0);

    return Object.freeze({
      title: 'Inbox Cleanup Report',
      inboxPath,
      totals: Object.freeze({
        entries: entries.length,
        files: files.length,
        folders: folders.length,
        markdown: markdown.length
      }),
      scannedFolders: Object.freeze(scannedFolders),
      groups: Object.freeze(groups),
      actionsCreated: 0,
      mode: 'report-only'
    });
  }

  function formatInboxCleanupReportMarkdown(report) {
    const current = report || buildInboxCleanupReport({});
    const lines = [
      '## Inbox Cleanup Report',
      '',
      'Path: `' + current.inboxPath + '`',
      '',
      '- Entries: ' + current.totals.entries,
      '- Files: ' + current.totals.files,
      '- Folders: ' + current.totals.folders,
      '- Markdown notes: ' + current.totals.markdown,
      '',
      '**Mode:** Report only. No Review Basket actions were created.',
      ''
    ];

    if (!current.groups || current.groups.length === 0) {
      lines.push('No cleanup candidates found in the current inbox level.');
      return lines.join('\n');
    }

    current.groups.forEach((group) => {
      lines.push('### ' + group.title + ' (' + group.count + ')');
      lines.push(group.summary);
      lines.push('');
      group.candidates.slice(0, 12).forEach((entry) => {
        lines.push('- `' + entry.path + '`');
      });
      if (group.candidates.length > 12) {
        lines.push('- ... ' + (group.candidates.length - 12) + ' more');
      }
      lines.push('');
    });

    lines.push('Next step later: open a group to create reviewed cleanup suggestions.');
    return lines.join('\n');
  }

  function collectChildEntries(childEntriesByFolder) {
    const childMap = childEntriesByFolder && typeof childEntriesByFolder === 'object' ? childEntriesByFolder : {};
    return Object.keys(childMap).reduce((result, folderPath) => {
      const entries = Array.isArray(childMap[folderPath]) ? childMap[folderPath] : [];
      entries.forEach((entry) => {
        const normalized = normalizeEntry(entry);
        if (normalized) result.push(normalized);
      });
      return result;
    }, []);
  }

  function buildGroup(id, title, summary, candidates) {
    const normalized = (Array.isArray(candidates) ? candidates : []).map(normalizeEntry).filter(Boolean);
    return Object.freeze({
      id,
      title,
      summary,
      count: normalized.length,
      candidates: Object.freeze(normalized)
    });
  }

  function normalizeEntry(entry) {
    if (!entry || typeof entry !== 'object') return null;
    const name = String(entry.name || baseName(entry.path) || '').trim();
    const path = normalizePath(entry.path || name);
    const kind = normalizeKind(entry.kind || entry.type || (entry.isDirectory ? 'folder' : 'file'));
    if (!name && !path) return null;
    return Object.freeze({ name: name || baseName(path), path, kind });
  }

  function normalizeKind(value) {
    const kind = String(value || '').toLowerCase();
    if (kind === 'directory' || kind === 'dir' || kind === 'folder') return 'folder';
    return 'file';
  }

  function isMarkdownEntry(entry) {
    return entry && entry.kind === 'file' && /\.md$/i.test(entry.name || entry.path || '');
  }

  function isSummaryEntry(entry) {
    const value = String((entry && (entry.name || entry.path)) || '').toLowerCase();
    return value.includes('summary') || value.includes('zusammenfassung');
  }

  function isAiResponseEntry(entry) {
    const value = normalizePath((entry && entry.path) || '').toLowerCase();
    return value.includes('/ai responses/') || value.endsWith('/ai responses') || value.includes('/ai_response');
  }

  function normalizePath(value) {
    return String(value || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/').trim();
  }

  function baseName(value) {
    const normalized = normalizePath(value);
    return normalized.split('/').pop() || normalized;
  }

  const api = Object.freeze({
    buildInboxCleanupReport,
    formatInboxCleanupReportMarkdown
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosInboxCleanupReport = api;
})();
