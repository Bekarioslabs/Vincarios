(function() {
  'use strict';

  async function runFolderContextFlow(options) {
    options = options || {};
    const selection = options.selection || null;
    const userText = String(options.userText || '');
    const limits = getLimitsApi().normalizeContextLimits(options.limits || options);
    const blockedState = options.blockedState || null;
    const pendingState = options.pendingState || createFallbackPendingState();
    const pending = typeof pendingState.snapshot === 'function' ? pendingState.snapshot() : null;
    const scopeChoice = normalizeScopeChoice(options.scopeChoice || userText);

    if (pending && pending.type === 'folder_scope') {
      const pendingTarget = targetFromPending(selection, pending, limits);
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
        return listTarget(options.api, Object.assign({}, pendingTarget, { recursive: scopeChoice === 'recursive', limits }));
      }
      return { handled: false };
    }

    if (isStandaloneScopeReply(userText)) return createMissingScopeMessage(selection, scopeChoice);

    const target = resolveFolderReadTarget(selection, userText, limits);
    if (!target) return { handled: false };

    if (target.readAllowed !== true) {
      return createBlockedReadResult({
        blockedState,
        type: 'folder_list',
        target,
        userText,
        message: 'Please enable R for this folder before I list it: ' + target.path,
        historyContent: 'Read blocked for current selection ' + target.selectionId + ': ' + target.path
      });
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

  function resolveFolderReadTarget(selection, userText, limits) {
    limits = normalizeOptionalLimits(limits);
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
      if (limits) target.limits = limits;
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
      if (limits) target.limits = limits;
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
      : limitFolderListingResult(await api.vault.listFolder(target.path), target.limits);
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

  function createBlockedReadResult(options) {
    const target = options.target || {};
    const blockedAction = options.blockedState && typeof options.blockedState.set === 'function'
      ? options.blockedState.set({
          type: options.type,
          selectionId: target.selectionId || 0,
          targetPath: target.path || '',
          targetKind: target.kind || 'folder',
          requiredPermission: 'read',
          userText: options.userText || ''
        })
      : null;

    return {
      handled: true,
      kind: blockedAction ? 'blocked_action' : 'message',
      message: options.message,
      historyContent: options.historyContent || options.message,
      blockedActions: blockedAction ? [{ label: formatBlockedActionRetryLabel(blockedAction.requiredPermission), blockedActionId: blockedAction.id }] : []
    };
  }

  function createMissingScopeMessage(selection, scopeChoice) {
    const path = selection && selection.path ? normalizePath(selection.path) : '';
    const message = 'No open folder scope choice. Ask ZEUS to check or list a folder first, then choose current level or all subfolders.' + (path ? ' Current selection: ' + path : '');
    return {
      handled: true,
      kind: 'message',
      message,
      historyContent: 'Ignored standalone folder scope reply without pending action: ' + (scopeChoice || 'unknown')
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

  function targetFromPending(selection, pending, limits) {
    if (!pending || !pending.targetPath) return null;
    if (selection && selection.selectionId && pending.selectionId && selection.selectionId !== pending.selectionId) return null;
    return {
      kind: 'folder',
      path: pending.targetPath,
      readAllowed: !selection || selection.readAllowed === true,
      selectionId: pending.selectionId || 0,
      recursive: false,
      limits
    };
  }

  async function listFolderTree(vaultApi, target) {
    const limits = getLimitsApi().normalizeContextLimits(target.limits || target);
    const queue = [target.path];
    const visited = new Set();
    const folders = [];
    let listedFiles = 0;
    let fileLimitReached = false;

    while (queue.length > 0 && visited.size < limits.maxListedFolders) {
      const folderPath = queue.shift();
      if (visited.has(folderPath)) continue;
      visited.add(folderPath);

      const result = await vaultApi.listFolder(folderPath);
      if (!result || !result.ok) {
        folders.push({ path: folderPath, ok: false, message: result && (result.message || result.code) || 'Unknown error.', entries: [] });
        continue;
      }

      const limited = limitEntries(Array.isArray(result.entries) ? result.entries : [], limits, listedFiles);
      listedFiles = limited.listedFiles;
      fileLimitReached = fileLimitReached || limited.fileLimitReached;
      folders.push({ path: folderPath, ok: true, entries: limited.entries });
      limited.entries.forEach((entry) => {
        if (entry && entry.kind === 'folder' && entry.path) queue.push(normalizePath(entry.path));
      });
    }

    return {
      ok: true,
      truncated: queue.length > 0,
      fileLimitReached,
      folders
    };
  }

  function limitFolderListingResult(result, limits) {
    if (!result || !result.ok) return result;
    const normalizedLimits = getLimitsApi().normalizeContextLimits(limits);
    const limited = limitEntries(Array.isArray(result.entries) ? result.entries : [], normalizedLimits, 0);
    return Object.assign({}, result, {
      entries: limited.entries,
      fileLimitReached: limited.fileLimitReached
    });
  }

  function limitEntries(entries, limits, initialFileCount) {
    let listedFiles = Number.isFinite(initialFileCount) ? initialFileCount : 0;
    let fileLimitReached = false;
    const visibleEntries = [];

    entries.forEach((entry) => {
      if (!entry) return;
      if (entry.kind === 'markdown') {
        if (listedFiles >= limits.maxListedFiles) {
          fileLimitReached = true;
          return;
        }
        listedFiles += 1;
      }
      visibleEntries.push(entry);
    });

    return { entries: visibleEntries, listedFiles, fileLimitReached };
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
    if (result.fileLimitReached) lines.push('[Listing stopped because the file limit was reached.]');
    return lines.join('\n').trim();
  }

  function formatFolderListing(target, result) {
    if (!result || !result.ok) {
      return 'Folder listing failed for current selection ' + target.selectionId + ': ' + ((result && (result.message || result.code)) || 'Unknown error.');
    }

    const entries = Array.isArray(result.entries) ? result.entries : [];
    const header = 'Folder listed for current selection ' + target.selectionId + ': ' + target.path;
    const lines = [header, ''];
    if (entries.length === 0) {
      lines.push('No supported Markdown folders or files found.');
    } else {
      entries.forEach((entry) => {
        const suffix = entry.kind === 'folder' ? '/' : '';
        lines.push('- ' + (entry.name || entry.path || 'Unnamed') + suffix);
      });
    }
    if (result.fileLimitReached) {
      lines.push('');
      lines.push('[Listing stopped because the file limit was reached.]');
    }
    return lines.join('\n');
  }

  function normalizeOptionalLimits(value) {
    if (!value || !hasLimitOption(value)) return null;
    return getLimitsApi().normalizeContextLimits(value);
  }

  function hasLimitOption(value) {
    return Object.prototype.hasOwnProperty.call(value, 'maxSelectedFileChars')
      || Object.prototype.hasOwnProperty.call(value, 'maxListedFolders')
      || Object.prototype.hasOwnProperty.call(value, 'maxListedFiles');
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


  function formatBlockedActionRetryLabel(permission) {
    const api = getBlockedActionStateApi();
    return api && typeof api.formatBlockedActionRetryLabel === 'function'
      ? api.formatBlockedActionRetryLabel(permission)
      : 'Retry after enabling ' + (String(permission || 'read').toLowerCase() === 'write' ? 'W' : 'R');
  }
  function getIntentApi() {
    if (typeof window !== 'undefined' && window.ZeusContextIntent) return window.ZeusContextIntent;
    if (typeof module !== 'undefined' && module.exports) return require('./contextIntent');
    return null;
  }

  function getLimitsApi() {
    if (typeof window !== 'undefined' && window.ZeusContextLimits) return window.ZeusContextLimits;
    if (typeof module !== 'undefined' && module.exports) return require('./contextLimits');
    throw new Error('ZEUS context limits API is not available.');
  }


  function getBlockedActionStateApi() {
    if (typeof window !== 'undefined' && window.ZeusBlockedActionState) return window.ZeusBlockedActionState;
    if (typeof module !== 'undefined' && module.exports) return require('./blockedActionState');
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
