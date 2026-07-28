(function() {
  'use strict';

  const defaultPendingState = createDefaultPendingState();
  const defaultBlockedState = createDefaultBlockedState();

  async function runReadContextPreflight(options) {
    options = options || {};
    const selection = options.selection || null;
    const blockedState = options.blockedState || defaultBlockedState;
    const pendingState = options.pendingState || defaultPendingState;

    if (options.blockedActionId) {
      return retryBlockedAction({
        api: options.api,
        selection,
        blockedState,
        blockedActionId: options.blockedActionId,
        pendingState
      });
    }

    const retryResult = await retryMatchingBlockedActionFromText({
      api: options.api,
      selection,
      blockedState,
      userText: options.userText,
      pendingState
    });
    if (retryResult) return retryResult;

    const scopeResult = await runPendingScopeReply({
      api: options.api,
      userText: options.userText,
      scopeChoice: options.scopeChoice,
      selection,
      pendingState,
      blockedState
    });
    if (scopeResult && scopeResult.handled) return scopeResult;

    const guidance = createSelectionActionGuidance({ userText: options.userText, selection });
    if (guidance) return guidance;

    return { handled: false };
  }

  async function runPendingScopeReply(options) {
    const controller = getFolderContextControllerApi();
    if (!controller || typeof controller.runFolderContextFlow !== 'function') return { handled: false };
    const pending = options.pendingState && typeof options.pendingState.snapshot === 'function'
      ? options.pendingState.snapshot()
      : null;
    const hasScopeChoice = options.scopeChoice || (controller.isStandaloneScopeReply && controller.isStandaloneScopeReply(options.userText));
    if (!pending && !hasScopeChoice) return { handled: false };
    return controller.runFolderContextFlow({
      api: options.api,
      userText: options.userText,
      scopeChoice: options.scopeChoice,
      selection: options.selection,
      pendingState: options.pendingState,
      blockedState: options.blockedState
    });
  }

  function createSelectionActionGuidance(options) {
    const intent = getIntentApi();
    if (!intent || typeof intent.hasSelectionActionGuidanceSignal !== 'function') return null;
    if (!intent.hasSelectionActionGuidanceSignal(options.userText)) return null;

    const selection = options.selection || null;
    const contextItems = selection && Array.isArray(selection.contextItems) ? selection.contextItems : [];
    const hasFolderTarget = Boolean(selection && selection.kind === 'folder')
      || contextItems.some((item) => item && item.kind === 'folder');
    if (!hasFolderTarget) return null;

    return {
      handled: true,
      kind: 'message',
      message: 'Use "Inspect Folder" in Selection Actions to inspect the selected folder.',
      historyContent: 'Selection action guidance shown for folder listing request.'
    };
  }

  async function retryMatchingBlockedActionFromText(options) {
    const blockedState = options.blockedState || defaultBlockedState;
    const intent = getIntentApi();
    const blocked = blockedState && typeof blockedState.snapshot === 'function' ? blockedState.snapshot() : null;
    if (!blocked || !intent || typeof intent.hasBlockedActionRetrySignal !== 'function') return null;
    if (!intent.hasBlockedActionRetrySignal(options.userText)) return null;
    if (!selectionMatchesBlockedAction(options.selection, blocked)) return null;
    return retryBlockedAction({
      api: options.api,
      selection: options.selection,
      blockedState,
      blockedActionId: blocked.id,
      pendingState: options.pendingState || defaultPendingState
    });
  }

  async function retryBlockedAction(options) {
    const blockedState = options.blockedState || defaultBlockedState;
    const blocked = blockedState && typeof blockedState.snapshot === 'function' ? blockedState.snapshot() : null;
    if (!blocked || blocked.id !== options.blockedActionId) {
      return createBlockedUnavailableMessage('Blocked action is no longer available. Please run the request again.');
    }

    const selection = options.selection || null;
    if (!selectionMatchesBlockedAction(selection, blocked)) {
      if (typeof blockedState.clear === 'function') blockedState.clear(blocked.id);
      return createBlockedUnavailableMessage('Blocked action no longer matches the current selection. Please select the target again.');
    }

    if (blocked.type === 'selected_file_read') return retrySelectedFileRead(blocked, selection, blockedState);
    if (blocked.type === 'folder_list') return retryFolderList(blocked, selection, blockedState, options);

    if (typeof blockedState.clear === 'function') blockedState.clear(blocked.id);
    return createBlockedUnavailableMessage('Blocked action type is no longer supported. Please run the request again.');
  }

  function retrySelectedFileRead(blocked, selection, blockedState) {
    if (!isBlockedActionPermissionAllowed(selection, blocked)) return createBlockedStillNeedsPermission(blocked);
    if (!selection.content) {
      return {
        handled: true,
        kind: 'message',
        message: 'Read is enabled, but the selected file content is not loaded yet. Click or reselect the file, then retry.',
        historyContent: 'Blocked file read retry needs loaded content: ' + blocked.targetPath
      };
    }

    if (typeof blockedState.clear === 'function') blockedState.clear(blocked.id);
    return {
      handled: true,
      kind: 'retry_provider_request',
      retryUserText: blocked.userText,
      historyContent: 'Retrying blocked selected-file read: ' + blocked.targetPath
    };
  }

  async function retryFolderList(blocked, selection, blockedState, options) {
    if (!isBlockedActionPermissionAllowed(selection, blocked)) return createBlockedStillNeedsPermission(blocked);
    const vault = options.api && options.api.vault;
    if (!vault || typeof vault.listFolder !== 'function') {
      return createBlockedUnavailableMessage('Folder listing failed: vault API unavailable.');
    }
    if (typeof blockedState.clear === 'function') blockedState.clear(blocked.id);
    const result = await vault.listFolder(blocked.targetPath);
    return {
      handled: true,
      kind: 'message',
      message: formatFolderListing(blocked.targetPath, result),
      historyContent: 'Folder listing displayed for blocked action: ' + normalizePath(blocked.targetPath)
    };
  }


  function formatFolderListing(folderPath, result) {
    const path = normalizePath(folderPath);
    if (!result || result.ok !== true) {
      return 'Folder listing failed: ' + ((result && (result.message || result.code)) || 'Unknown error.');
    }
    const entries = Array.isArray(result.entries) ? result.entries : [];
    if (!entries.length) return 'Folder listed: ' + path + '\n\nNo supported Markdown folders or files found.';
    return 'Folder listed: ' + path + '\n\n' + entries.map((entry) => {
      const name = entry && (entry.name || entry.path) ? (entry.name || entry.path) : 'Unnamed';
      return name + (entry && entry.kind === 'folder' ? '/' : '');
    }).join('\n');
  }
  function createBlockedStillNeedsPermission(blocked) {
    return {
      handled: true,
      kind: 'message',
      message: formatMissingPermissionMessage(blocked),
      historyContent: 'Blocked action still missing ' + formatPermissionShortcut(blocked.requiredPermission) + ': ' + blocked.targetPath
    };
  }

  function createBlockedUnavailableMessage(message) {
    return {
      handled: true,
      kind: 'message',
      message,
      historyContent: message
    };
  }

  function selectionMatchesBlockedAction(selection, blocked) {
    if (!selection || !blocked) return false;
    const selectionPath = normalizePath(selection.path);
    const blockedPath = normalizePath(blocked.targetPath);
    if (!selectionPath || !blockedPath) return false;
    if (blocked.targetKind === 'folder') return selection.kind === 'folder' && selectionPath === blockedPath;
    if (blocked.targetKind === 'file') return selection.kind === 'file' && selectionPath === blockedPath;
    return selectionPath === blockedPath
      || parentFolderOf(selectionPath) === blockedPath;
  }

  function isBlockedActionPermissionAllowed(selection, blocked) {
    if (!selection || !blocked) return false;
    if (blocked.targetKind === 'folder') return selection.kind === 'folder'
      && normalizePath(selection.path) === normalizePath(blocked.targetPath)
      && selection.readAllowed === true;
    if (blocked.targetKind === 'file') return selection.kind === 'file'
      && normalizePath(selection.path) === normalizePath(blocked.targetPath)
      && selection.readAllowed === true;
    return selection.kind === 'file'
      && parentFolderOf(selection.path) === normalizePath(blocked.targetPath)
      && selection.parentReadAllowed === true;
  }

  function parentFolderOf(path) {
    const value = normalizePath(path);
    const index = value.lastIndexOf('/');
    return index > 0 ? value.slice(0, index) : '';
  }

  function createDefaultPendingState() {
    const api = getPendingActionStateApi();
    return api && typeof api.createPendingActionState === 'function'
      ? api.createPendingActionState()
      : { set: () => null, clear: () => null, snapshot: () => null, hasPending: () => false };
  }

  function createDefaultBlockedState() {
    const api = getBlockedActionStateApi();
    return api && typeof api.createBlockedActionState === 'function'
      ? api.createBlockedActionState()
      : { set: () => null, clear: () => null, snapshot: () => null };
  }

  function normalizePath(value) {
    return String(value || '')
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, '')
      .trim();
  }

  function formatPermissionShortcut(permission) {
    const api = getBlockedActionStateApi();
    return api && typeof api.formatPermissionShortcut === 'function'
      ? api.formatPermissionShortcut(permission)
      : String(permission || 'read').toLowerCase() === 'write' ? 'W' : 'R';
  }


  function formatMissingPermissionMessage(blocked) {
    const api = getBlockedActionStateApi();
    return api && typeof api.formatMissingPermissionMessage === 'function'
      ? api.formatMissingPermissionMessage(blocked)
      : formatPermissionShortcut(blocked && blocked.requiredPermission) + ' is still disabled for this target: ' + normalizePath(blocked && blocked.targetPath);
  }

  function getIntentApi() {
    if (typeof window !== 'undefined' && window.VincariosContextIntent) return window.VincariosContextIntent;
    if (typeof module !== 'undefined' && module.exports) return require('../context/contextIntent');
    return null;
  }

  function getFolderContextControllerApi() {
    if (typeof window !== 'undefined' && window.VincariosFolderContextController) return window.VincariosFolderContextController;
    if (typeof module !== 'undefined' && module.exports) return require('../context/folderContextController');
    return null;
  }

  function getPendingActionStateApi() {
    if (typeof window !== 'undefined' && window.VincariosPendingActionState) return window.VincariosPendingActionState;
    if (typeof module !== 'undefined' && module.exports) return require('../context/pendingActionState');
    return null;
  }

  function getBlockedActionStateApi() {
    if (typeof window !== 'undefined' && window.VincariosBlockedActionState) return window.VincariosBlockedActionState;
    if (typeof module !== 'undefined' && module.exports) return require('../context/blockedActionState');
    return null;
  }

  const api = {
    runReadContextPreflight,
    createSelectionActionGuidance,
    retryMatchingBlockedActionFromText,
    retryBlockedAction,
    selectionMatchesBlockedAction,
    isBlockedActionPermissionAllowed
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosReadContextPreflight = Object.freeze(api);
})();
