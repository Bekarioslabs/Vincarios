(function() {
  'use strict';

  const defaultPendingState = createDefaultPendingState();
  const defaultBlockedState = createDefaultBlockedState();

  async function runReadContextPreflight(options) {
    options = options || {};
    const controller = getFolderContextControllerApi();
    if (!controller || typeof controller.runFolderContextFlow !== 'function') return { handled: false };

    const blockedState = options.blockedState || defaultBlockedState;
    const selection = options.selection || null;

    if (options.blockedActionId) {
      return retryBlockedAction({
        api: options.api,
        selection,
        blockedState,
        blockedActionId: options.blockedActionId,
        pendingState: options.pendingState || defaultPendingState
      });
    }

    const textRetryResult = await retryMatchingBlockedActionFromText({
      api: options.api,
      selection,
      blockedState,
      userText: options.userText,
      pendingState: options.pendingState || defaultPendingState
    });
    if (textRetryResult) return textRetryResult;

    const selectedFileBlocked = createSelectedFileReadBlock({
      selection,
      userText: options.userText,
      blockedState
    });
    if (selectedFileBlocked) return selectedFileBlocked;

    return controller.runFolderContextFlow({
      api: options.api,
      userText: options.userText,
      scopeChoice: options.scopeChoice,
      selection,
      pendingState: options.pendingState || defaultPendingState,
      blockedState
    });
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
    if (blocked.type === 'folder_list') {
      if (!isBlockedActionPermissionAllowed(selection, blocked)) return createBlockedStillNeedsPermission(blocked);
      if (typeof blockedState.clear === 'function') blockedState.clear(blocked.id);
      const controller = getFolderContextControllerApi();
      return controller.runFolderContextFlow({
        api: options.api,
        userText: blocked.userText,
        selection,
        pendingState: options.pendingState || defaultPendingState,
        blockedState
      });
    }

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

  function createSelectedFileReadBlock(options) {
    const selection = options.selection || null;
    const userText = String(options.userText || '');
    const intent = getIntentApi();
    if (!selection || selection.kind !== 'file' || selection.readAllowed !== false) return null;
    if (!intent || typeof intent.looksLikeSelectedTargetRequest !== 'function') return null;
    if (!intent.looksLikeSelectedTargetRequest(userText)) return null;

    const blockedAction = options.blockedState && typeof options.blockedState.set === 'function'
      ? options.blockedState.set({
          type: 'selected_file_read',
          selectionId: selection.selectionId || 0,
          targetPath: selection.path || '',
          targetKind: 'file',
          requiredPermission: 'read',
          userText
        })
      : null;

    return {
      handled: true,
      kind: blockedAction ? 'blocked_action' : 'message',
      message: 'Please enable R for this file before I read it: ' + normalizePath(selection.path),
      historyContent: 'Read blocked for current selection ' + ((selection && selection.selectionId) || 0) + ': ' + normalizePath(selection.path),
      blockedActions: blockedAction ? [{ label: formatBlockedActionRetryLabel(blockedAction.requiredPermission), blockedActionId: blockedAction.id }] : []
    };
  }

  function createBlockedStillNeedsPermission(blocked) {
    return {
      handled: true,
      kind: 'blocked_action',
      message: formatMissingPermissionMessage(blocked),
      historyContent: 'Blocked action still missing ' + formatPermissionShortcut(blocked.requiredPermission) + ': ' + blocked.targetPath,
      blockedActions: [{ label: formatBlockedActionRetryLabel(blocked.requiredPermission), blockedActionId: blocked.id }]
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
    const selectionKind = String(selection.kind || '');
    const blockedKind = String(blocked.targetKind || '');
    if (selectionPath === blockedPath && selectionKind === blockedKind) return true;
    return blocked.type === 'folder_list'
      && blockedKind === 'folder'
      && selectionKind === 'file'
      && parentFolderOf(selectionPath) === blockedPath;
  }

  function isBlockedActionPermissionAllowed(selection, blocked) {
    if (!selection || !blocked) return false;
    const permission = normalizeRequiredPermission(blocked.requiredPermission);
    const targetKind = String(blocked.targetKind || 'file');
    if (permission === 'write') return selection.writeAllowed === true;
    if (targetKind === 'file') return selection.kind === 'file' && selection.readAllowed === true;
    if (selection.kind === 'folder') return selection.readAllowed === true;
    return selection.kind === 'file'
      && parentFolderOf(selection.path) === normalizePath(blocked.targetPath)
      && selection.parentReadAllowed === true;
  }

  function parentFolderOf(path) {
    const value = normalizePath(path);
    const index = value.lastIndexOf('/');
    return index > 0 ? value.slice(0, index) : '';
  }

  function resolveReadTarget(selection, userText, intent) {
    const controller = getFolderContextControllerApi();
    if (!controller || typeof controller.resolveFolderReadTarget !== 'function') return null;
    return controller.resolveFolderReadTarget(selection, userText, intent);
  }

  async function listFolderTree(vaultApi, target) {
    const controller = getFolderContextControllerApi();
    return controller.listFolderTree(vaultApi, target);
  }

  function formatRecursiveFolderListing(target, result) {
    const controller = getFolderContextControllerApi();
    return controller.formatRecursiveFolderListing(target, result);
  }

  function formatFolderListing(target, result) {
    const controller = getFolderContextControllerApi();
    return controller.formatFolderListing(target, result);
  }

  function createDefaultPendingState() {
    const pendingApi = getPendingActionStateApi();
    return pendingApi && typeof pendingApi.createPendingActionState === 'function'
      ? pendingApi.createPendingActionState()
      : { set: () => null, clear: () => null, snapshot: () => null, hasPending: () => false };
  }

  function createDefaultBlockedState() {
    const blockedApi = getBlockedActionStateApi();
    return blockedApi && typeof blockedApi.createBlockedActionState === 'function'
      ? blockedApi.createBlockedActionState()
      : { set: () => null, clear: () => null, snapshot: () => null, hasBlocked: () => false };
  }

  function normalizePath(value) {
    return String(value || '')
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, '')
      .replace(/\/+/g, '/');
  }


  function normalizeRequiredPermission(permission) {
    const api = getBlockedActionStateApi();
    return api && typeof api.normalizeRequiredPermission === 'function'
      ? api.normalizeRequiredPermission(permission)
      : (String(permission || 'read').toLowerCase() === 'write' ? 'write' : 'read');
  }

  function formatPermissionShortcut(permission) {
    const api = getBlockedActionStateApi();
    return api && typeof api.formatPermissionShortcut === 'function'
      ? api.formatPermissionShortcut(permission)
      : (normalizeRequiredPermission(permission) === 'write' ? 'W' : 'R');
  }

  function formatBlockedActionRetryLabel(permission) {
    const api = getBlockedActionStateApi();
    return api && typeof api.formatBlockedActionRetryLabel === 'function'
      ? api.formatBlockedActionRetryLabel(permission)
      : 'Retry after enabling ' + formatPermissionShortcut(permission);
  }

  function formatMissingPermissionMessage(blocked) {
    const api = getBlockedActionStateApi();
    return api && typeof api.formatMissingPermissionMessage === 'function'
      ? api.formatMissingPermissionMessage(blocked)
      : formatPermissionShortcut(blocked && blocked.requiredPermission) + ' is still disabled for this target: ' + normalizePath(blocked && blocked.targetPath);
  }
  function getIntentApi() {
    if (typeof window !== 'undefined' && window.ZeusContextIntent) return window.ZeusContextIntent;
    if (typeof module !== 'undefined' && module.exports) return require('../context/contextIntent');
    return null;
  }

  function getFolderContextControllerApi() {
    if (typeof window !== 'undefined' && window.ZeusFolderContextController) return window.ZeusFolderContextController;
    if (typeof module !== 'undefined' && module.exports) return require('../context/folderContextController');
    return null;
  }

  function getPendingActionStateApi() {
    if (typeof window !== 'undefined' && window.ZeusPendingActionState) return window.ZeusPendingActionState;
    if (typeof module !== 'undefined' && module.exports) return require('../context/pendingActionState');
    return null;
  }

  function getBlockedActionStateApi() {
    if (typeof window !== 'undefined' && window.ZeusBlockedActionState) return window.ZeusBlockedActionState;
    if (typeof module !== 'undefined' && module.exports) return require('../context/blockedActionState');
    return null;
  }

  const api = {
    runReadContextPreflight,
    resolveReadTarget,
    formatFolderListing,
    formatRecursiveFolderListing,
    listFolderTree
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusReadContextPreflight = Object.freeze(api);
})();