(function() {
  'use strict';

  const defaultPendingState = createDefaultPendingState();

  async function runReadContextPreflight(options) {
    options = options || {};
    const controller = getFolderContextControllerApi();
    if (!controller || typeof controller.runFolderContextFlow !== 'function') return { handled: false };

    return controller.runFolderContextFlow({
      api: options.api,
      userText: options.userText,
      scopeChoice: options.scopeChoice,
      selection: options.selection || null,
      pendingState: options.pendingState || defaultPendingState
    });
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
