(function() {
  'use strict';

  function buildFolderInspectionReport(options) {
    options = options || {};
    const path = String(options.path || '').trim() || 'Unknown folder';
    const entries = Array.isArray(options.entries) ? options.entries : [];
    const folders = entries.filter((entry) => entry && entry.kind === 'folder');
    const markdown = entries.filter((entry) => entry && entry.kind === 'markdown');
    const lines = [
      '## Folder inspection',
      '',
      '_Folder: `' + path + '`_',
      '',
      '### Current level',
      '- **Folders:** ' + folders.length,
      '- **Markdown notes:** ' + markdown.length,
      '',
      '> Markdown contents were not read.'
    ];

    appendGroup(lines, 'Folders', folders, true);
    appendGroup(lines, 'Markdown notes', markdown, false);
    return lines.join('\n');
  }

  function buildFolderTreeInspectionReport(options) {
    options = options || {};
    const rootPath = String(options.rootPath || '').trim() || 'Unknown folder';
    const folders = Array.isArray(options.folders) ? options.folders : [];
    const lines = [
      '## Folder tree inspection',
      '',
      '_Folder: `' + rootPath + '`_',
      '',
      '> Markdown contents were not read.'
    ];

    folders.forEach((folder) => {
      lines.push('');
      if (!folder || folder.ok === false) {
        lines.push('### ' + String((folder && folder.path) || 'Unknown folder'));
        lines.push('- Inspection failed: ' + String((folder && folder.message) || 'Unknown error.'));
        return;
      }
      lines.push(buildFolderInspectionReport({ path: folder.path, entries: folder.entries }));
    });

    if (options.depthLimitReached === true) lines.push('', '[Inspection stopped because the depth limit was reached.]');
    if (options.fileLimitReached === true) lines.push('', '[Inspection stopped because the file limit was reached.]');
    if (options.folderLimitReached === true) lines.push('', '[Inspection stopped because the folder limit was reached.]');
    return lines.join('\n').trim();
  }

  function appendGroup(lines, title, entries, suffix) {
    if (!entries.length) return;
    lines.push('', '### ' + title);
    entries.forEach((entry) => {
      const name = String(entry.name || entry.path || 'Unnamed');
      lines.push('- ' + name + (suffix ? '/' : ''));
    });
  }

  const api = { buildFolderInspectionReport, buildFolderTreeInspectionReport };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosFolderInspectAction = Object.freeze(api);
})();
