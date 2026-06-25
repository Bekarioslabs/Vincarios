(function() {
  'use strict';

  async function runFolderContextFlow(options) {
    options = options || {};
    const selection = options.selection || null;
    const userText = String(options.userText || '');
    const pendingState = options.pendingState || createFallbackPendingState();
    const pending = typeof pendingState.snapshot === 'function' ? pendingState.snapshot() : null;
    const scopeChoice = normalizeScopeChoice(options.scopeChoice || userText);

    if (pending && pending.type === 'folder_scope') {
      const pendingTarget = targetFromPending(selection, pending);
      if (!pendingTarget) {
        if (typeof pendingState.clear === 'function') pendingState.clear();
        return { handled: false };
      }
      if (scopeChoice === 'cancel') {
        if (typeof pendingState.clear === 'function') pendingState.clear();
        return {
          handled: true,
          kind: 'message',
          message: 'Folder scope cancelled for current selection ' + pending.selectionId + ': ' + pending.targetPath,
          historyContent: 'Folder scope cancelled for current selection ' + pending.selectionId + ': ' + pending.targetPath
        };
      }
      if (scopeChoice === 'current' || scopeChoice === 'recursive') {
        if (typeof pendingState.clear === 'function') pendingState.clear();
        return listTarget(options.api, Object.assign({}, pendingTarget, { recursive: scopeChoice === 'recursive' }));
      }
      return { handled: false };
    }

    if (isStandaloneScopeReply(userText)) return { handled: false };

    const target = resolveFolderReadTarget(selection, userText);
    if (!target) return { handled: false };

    if (target.readAllowed !== true) {
      return {
        handled: true,
        kind: 'message',
        message: 'Please enable R for this folder before I list it: ' + target.path,
        historyContent: 'Read blocked for current selection ' + target.selectionId + ': ' + target.path
      };
    }

    if (target.ambiguous === true) {
      const pendingAction = pendingState.set({
        type: 'folder_scope',
        selectionId: target.selectionId,
        targetPath: target.path,
        targetKind: 'folder'
      });
      return createScopeRequest(pendingAction);
    }

    return listTarget(options.api, target);
  }

  function resolveFolderReadTarget(selection, userText) {
    const intent = getIntentApi();
    if (!selection || !selection.path || !intent) return null;
    const recursive = typeof intent.hasRecursiveFolderWorkSignal === 'function' && intent.hasRecursiveFolderWorkSignal(userText);
    const ambiguous = isAmbiguousFolderRequest(userText);

    if (selection.kind === 'folder' && (intent.hasFolderWorkSignal(userText) || ambiguous)) {
      const target = {
        kind: 'folder',
        path: normalizePath(selection.path),
        readAllowed: selection.readAllowed === true,
        selectionId: selection.selectionId || 0,
        recursive
      };
      if (ambiguous && !recursive) target.ambiguous = true;
      return target;
    }

    if (selection.kind === 'file' && intent.looksLikeFolderScopedRequest(userText)) {
      const parent = parentFolderOf(selection.path);
      if (!parent) return null;
      const target = {
        kind: 'folder',
        path: parent,
        readAllowed: selection.parentReadAllowed === true,
        selectionId: selection.selectionId || 0,
        recursive
      };
      if (ambiguous && !recursive) target.ambiguous = true;
      return target;
    }

    return null;
  }
  async function listTarget(api, target) {
    if (!api || !api.vault || typeof api.vault.listFolder !== 'function') {
      return {
        handled: true,
        kind: 'message',
        message: 'Folder listing failed: vault API unavailable.',
        historyContent: 'Folder listing failed for current selection ' + target.selectionId + ': vault API unavailable.'
      };
    }

    const result = target.recursive === true
      ? await listFolderTree(api.vault, target)
      : await api.vault.listFolder(target.path);
    const message = target.recursive === true
      ? formatRecursiveFolderListing(target, result)
      : formatFolderListing(target, result);

    return {
      handled: true,
      kind: 'message',
      message,
      historyContent: message
    };
  }

  function createScopeRequest(pendingAction) {
    const message = [
      'Choose folder scope for current selection ' + pendingAction.selectionId + ': ' + pendingAction.targetPath,
      '',
      'ZEUS can list the current level or include all subfolders. Markdown file contents will not be read.'
    ].join('\n');

    return {
      handled: true,
      kind: 'scope_request',
      message,
      historyContent: 'Folder scope requested for current selection ' + pendingAction.selectionId + ': ' + pendingAction.targetPath,
      scopeActions: [
        { label: 'Current level', scopeChoice: 'current' },
        { label: 'All subfolders', scopeChoice: 'recursive' },
        { label: 'Cancel', scopeChoice: 'cancel' }
      ]
    };
  }

  function targetFromPending(selection, pending) {
    if (!pending || !pending.targetPath) return null;
    if (selection && selection.selectionId && pending.selectionId && selection.selectionId !== pending.selectionId) return null;
    return {
      kind: 'folder',
      path: pending.targetPath,
      readAllowed: !selection || selection.readAllowed === true,
      selectionId: pending.selectionId || 0,
      recursive: false
    };
  }

  async function listFolderTree(vaultApi, target) {
    const maxFolders = Number.isFinite(target.maxFolders) ? target.maxFolders : 100;
    const queue = [target.path];
    const visited = new Set();
    const folders = [];

    while (queue.length > 0 && visited.size < maxFolders) {
      const folderPath = queue.shift();
      if (visited.has(folderPath)) continue;
      visited.add(folderPath);

      const result = await vaultApi.listFolder(folderPath);
      if (!result || !result.ok) {
        folders.push({ path: folderPath, ok: false, message: result && (result.message || result.code) || 'Unknown error.', entries: [] });
        continue;
      }

      const entries = Array.isArray(result.entries) ? result.entries : [];
      folders.push({ path: folderPath, ok: true, entries });
      entries.forEach((entry) => {
        if (entry && entry.kind === 'folder' && entry.path) queue.push(normalizePath(entry.path));
      });
    }

    return {
      ok: true,
      truncated: queue.length > 0,
      folders
    };
  }

  function formatRecursiveFolderListing(target, result) {
    if (!result || !result.ok) {
      return 'Recursive folder listing failed for current selection ' + target.selectionId + ': ' + ((result && (result.message || result.code)) || 'Unknown error.');
    }

    const lines = [
      'Recursive folder listing for current selection ' + target.selectionId + ': ' + target.path,
      '',
      'Only real folder-listing results are shown. Markdown file contents were not read.',
      ''
    ];

    result.folders.forEach((folder) => {
      lines.push('## ' + folder.path + '/');
      if (!folder.ok) {
        lines.push('- Listing failed: ' + folder.message);
        lines.push('');
        return;
      }

      if (!folder.entries.length) {
        lines.push('- No supported Markdown folders or files found.');
        lines.push('');
        return;
      }

      folder.entries.forEach((entry) => {
        const suffix = entry.kind === 'folder' ? '/' : '';
        lines.push('- ' + (entry.name || entry.path || 'Unnamed') + suffix);
      });
      lines.push('');
    });

    if (result.truncated) lines.push('[Listing stopped because the folder limit was reached.]');
    return lines.join('\n').trim();
  }

  function formatFolderListing(target, result) {
    if (!result || !result.ok) {
      return 'Folder listing failed for current selection ' + target.selectionId + ': ' + ((result && (result.message || result.code)) || 'Unknown error.');
    }

    const entries = Array.isArray(result.entries) ? result.entries : [];
    const header = 'Folder listed for current selection ' + target.selectionId + ': ' + target.path;
    if (entries.length === 0) return header + '\n\nNo supported Markdown folders or files found.';

    return header + '\n\n' + entries.map((entry) => {
      const suffix = entry.kind === 'folder' ? '/' : '';
      return '- ' + (entry.name || entry.path || 'Unnamed') + suffix;
    }).join('\n');
  }

  function normalizeScopeChoice(value) {
    const text = normalizeText(value);
    if (/^(cancel|abbrechen|stop|nein|no)$/.test(text)) return 'cancel';
    if (/^(current|current level|nur dieser ordner|diese ebene|aktuelle ebene|nur hier)$/.test(text)) return 'current';
    if (/^(all|alle|recursive|recursively|rekursiv|all subfolders|alle unterordner|mit unterordnern)$/.test(text)) return 'recursive';
    return '';
  }

  function isStandaloneScopeReply(value) {
    return normalizeScopeChoice(value) !== '';
  }

  function isAmbiguousFolderRequest(value) {
    const text = normalizeText(value);
    if (!/\b(check|schau|pruef|pruf|scan|analysier|analyse|look|inspect)\b/.test(text)) return false;
    return /\b(ordner|folder|hier|this)\b/.test(text)
      && !/\b(was|what|liegt|drin|inhalt|contents?|inside|liste|listen|auflisten|datei(en)?|files?)\b/.test(text);
  }

  function parentFolderOf(filePath) {
    const normalized = normalizePath(filePath);
    const index = normalized.lastIndexOf('/');
    return index > -1 ? normalized.slice(0, index) : '';
  }

  function normalizePath(value) {
    return String(value || '')
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, '')
      .replace(/\/+/g, '/');
  }

  function normalizeText(value) {
    return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  function createFallbackPendingState() {
    const api = getPendingActionStateApi();
    return api && typeof api.createPendingActionState === 'function'
      ? api.createPendingActionState()
      : { set: () => null, clear: () => null, snapshot: () => null, hasPending: () => false };
  }

  function getIntentApi() {
    if (typeof window !== 'undefined' && window.ZeusContextIntent) return window.ZeusContextIntent;
    if (typeof module !== 'undefined' && module.exports) return require('./contextIntent');
    return null;
  }

  function getPendingActionStateApi() {
    if (typeof window !== 'undefined' && window.ZeusPendingActionState) return window.ZeusPendingActionState;
    if (typeof module !== 'undefined' && module.exports) return require('./pendingActionState');
    return null;
  }

  const api = {
    runFolderContextFlow,
    resolveFolderReadTarget,
    listFolderTree,
    formatFolderListing,
    formatRecursiveFolderListing,
    normalizeScopeChoice,
    isStandaloneScopeReply
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusFolderContextController = Object.freeze(api);
})();
