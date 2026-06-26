(function() {
  'use strict';

  function buildChatContextPackage(options) {
    options = options || {};
    const selection = options.selection || {};
    const userText = String(options.userText || '');
    const limits = getLimitsApi().normalizeContextLimits(options.limits || options);
    const maxChars = Number.isFinite(options.maxChars) ? options.maxChars : limits.maxSelectedFileChars;
    const kind = selection.kind || 'none';
    const path = normalizeContextPath(selection.path || '');
    const intent = getIntentApi();

    if (!path || kind === 'none') return emptyContext();

    const folderScopedRequest = intent.looksLikeFolderScopedRequest(userText);
    const selectedFolderWorkRequest = kind === 'folder' && intent.hasFolderWorkSignal(userText);
    if (!intent.looksLikeSelectedTargetRequest(userText) && !folderScopedRequest && !selectedFolderWorkRequest) return emptyContext();

    if (kind === 'folder') return buildFolderContext(path, selection);
    if (selection.autoContextEnabled === false) return buildDisabledAutoContext(path);
    if (selection.readAllowed === false) return buildReadPermissionContext(path);

    const rawContent = typeof selection.content === 'string' ? selection.content.replace(/\r\n?/g, '\n') : '';
    if (!rawContent) return buildMissingContentContext(path);

    return buildSelectedFileContext({
      path,
      selectionId: selection.selectionId || 0,
      rawContent,
      maxChars,
      folderScopedRequest
    });
  }

  function buildFolderContext(path, selection) {
    return context([
      '## Active Selection',
      '',
      'Context source: selected_folder',
      'Selected type: folder',
      'Selection id: ' + ((selection && selection.selectionId) || 0),
      'Path: ' + path,
      '',
      'This is the visible selected folder in the ZEUS UI. Previous folder listings in chat history are historical unless they match this exact path and selection id. Do not claim to know the folder contents before a folder listing. If Read is enabled, the app may list this folder through its read-context pipeline. Do not say that local filesystem access is unavailable.',
      ''
    ]);
  }

  function buildDisabledAutoContext(path) {
    return context([
      '## Active Selection',
      '',
      'Context source: selected_file',
      'Selected type: Markdown file',
      'Path: ' + path,
      'Status: Auto-context is disabled.',
      '',
      'Do not claim to know this file content. If the user asks about the file content, explain that the file is selected but must be read through an explicit reviewed app action/context step.',
      ''
    ]);
  }

  function buildReadPermissionContext(path) {
    return context([
      '## Active Selection',
      '',
      'Context source: selected_file',
      'Selected type: Markdown file',
      'Path: ' + path,
      'Status: Reading is not enabled for this selected file.',
      '',
      'Tell the user to enable R on this file or one of its parent folders. Do not guess from the file name. Use only the R permission instruction.',
      ''
    ]);
  }

  function buildMissingContentContext(path) {
    return context([
      '## Active Selection',
      '',
      'Context source: selected_file',
      'Selected type: Markdown file',
      'Path: ' + path,
      'Status: file selected, but no Markdown content is currently loaded into chat context.',
      '',
      'Do not claim to know this file content. Use only ZEUS UI instructions: ask the user to reselect or click the file again, or refresh the preview so ZEUS can provide the loaded Markdown content.',
      ''
    ]);
  }

  function buildSelectedFileContext(options) {
    const rawContent = options.rawContent;
    const path = options.path;
    const maxChars = options.maxChars;
    const selectionId = options.selectionId || 0;
    const folderScopedRequest = options.folderScopedRequest === true;
    const parentFolder = parentFolderOf(path);
    const truncated = rawContent.length > maxChars;
    const body = truncated
      ? rawContent.slice(0, maxChars) + '\n\n[...truncated: selected file is longer than ' + maxChars + ' characters...]'
      : rawContent;

    return context([
      '## Active Selection',
      '',
      'Context source: selected_file',
      'Selected type: Markdown file',
      'Selection id: ' + selectionId,
      'Path: ' + path,
      truncated ? 'Status: content truncated.' : 'Status: full currently loaded content.',
      '',
      'Use this content only for the current user request. General questions should not be forced into this file context. If a change is needed, create a structured `update_note` proposal for exactly this path.',
      folderScopedRequest && parentFolder ? 'Parent folder: ' + parentFolder : null,
      folderScopedRequest && parentFolder ? 'The user is asking about files in the selected file parent folder. To inspect sibling files, rely on the ZEUS read-context pipeline for the parent folder. Do not invent tool-call syntax, do not say local filesystem access is unavailable, and do not ask for an external upload.' : null,
      '',
      '```md',
      body,
      '```',
      ''
    ]);
  }

  function parentFolderOf(path) {
    const normalized = normalizeContextPath(path);
    const index = normalized.lastIndexOf('/');
    return index > 0 ? normalized.slice(0, index) : '';
  }

  function normalizeContextPath(value) {
    const stateApi = getStateApi();
    if (stateApi && typeof stateApi.normalizeContextPath === 'function') return stateApi.normalizeContextPath(value);
    return String(value || '')
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, '')
      .trim();
  }

  function emptyContext() {
    return { shouldAttach: false, content: '' };
  }

  function context(lines) {
    return { shouldAttach: true, content: lines.filter((line) => line !== null && line !== undefined).join('\n') };
  }

  function getIntentApi() {
    if (typeof window !== 'undefined' && window.ZeusContextIntent) return window.ZeusContextIntent;
    if (typeof module !== 'undefined' && module.exports) return require('./contextIntent');
    throw new Error('ZEUS context intent API is not available.');
  }

  function getLimitsApi() {
    if (typeof window !== 'undefined' && window.ZeusContextLimits) return window.ZeusContextLimits;
    if (typeof module !== 'undefined' && module.exports) return require('./contextLimits');
    throw new Error('ZEUS context limits API is not available.');
  }

  function getStateApi() {
    if (typeof window !== 'undefined' && window.ZeusContextState) return window.ZeusContextState;
    if (typeof module !== 'undefined' && module.exports) return require('./contextState');
    return null;
  }

  const api = {
    buildChatContextPackage,
    parentFolderOf
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusContextPackageBuilder = Object.freeze(api);
})();
