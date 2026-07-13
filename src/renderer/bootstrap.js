(function() {
  'use strict';

  const REQUIRED_RENDERER_MODULES = Object.freeze([
    { name: 'ZeusVaultProfile', globalName: 'ZeusVaultProfile' },
    { name: 'ZeusPayloadLimits', globalName: 'ZeusPayloadLimits', methods: ['normalizePayloadLimits', 'validateProviderMessagesPayload'] },
    { name: 'ZeusActionSchema', globalName: 'ZeusActionSchema' },
    { name: 'ZeusModelActionParser', globalName: 'ZeusModelActionParser', methods: ['parseModelActionCalls', 'stripModelActionCalls', 'normalizePathLike'] },
    { name: 'ZeusProposalPlan', globalName: 'ZeusProposalPlan' },
    { name: 'ZeusDiffPreview', globalName: 'ZeusDiffPreview' },
    { name: 'ZeusContextIntent', globalName: 'ZeusContextIntent' },
    { name: 'ZeusContextLimits', globalName: 'ZeusContextLimits', methods: ['normalizeContextLimits'] },
    { name: 'ZeusPendingActionState', globalName: 'ZeusPendingActionState', methods: ['createPendingActionState'] },
    { name: 'ZeusBlockedActionState', globalName: 'ZeusBlockedActionState', methods: ['createBlockedActionState'] },
    { name: 'ZeusFolderContextController', globalName: 'ZeusFolderContextController', methods: ['runFolderContextFlow'] },
    { name: 'ZeusContextState', globalName: 'ZeusContextState', methods: ['createContextState', 'buildChatContextPackage'] },
    { name: 'ZeusContextPackageBuilder', globalName: 'ZeusContextPackageBuilder', methods: ['buildChatContextPackage'] },
    { name: 'ZeusContextBasket', globalName: 'ZeusContextBasket', methods: ['mountContextBasket'] },
    { name: 'ZeusSuggestionConverters', globalName: 'ZeusSuggestionConverters', methods: ['isConvertibleSuggestion', 'convertSuggestionToReviewProposal', 'getConvertibleCheckedSuggestions', 'buildSuggestionDiffPreview'] },
    { name: 'ZeusInboxCleanupReport', globalName: 'ZeusInboxCleanupReport', methods: ['buildInboxCleanupReport', 'formatInboxCleanupReportMarkdown'] },
    { name: 'ZeusInboxCleanup', globalName: 'ZeusInboxCleanup', methods: ['mountInboxCleanup', 'runInboxCleanupReport'] },
    { name: 'ZeusFileTreeKeyboard', globalName: 'ZeusFileTreeKeyboard', methods: ['getFileTreeNavigation', 'isFileTreeNavigationKey'] },
    { name: 'ZeusScopedSelection', globalName: 'ZeusScopedSelection', methods: ['mountScopedSelection'] },
    { name: 'ZeusSelectionActionCategories', globalName: 'ZeusSelectionActionCategories', methods: ['getActionCategory'] },
    { name: 'ZeusSelectionActionPermissionText', globalName: 'ZeusSelectionActionPermissionText', methods: ['fileReadReason', 'folderReadReason', 'fileWriteReason', 'missingPermissionMessage'] },
    { name: 'ZeusSelectionActionRegistry', globalName: 'ZeusSelectionActionRegistry', methods: ['getSelectionActions', 'getTargetKind'] },
    { name: 'ZeusFileSummaryAction', globalName: 'ZeusFileSummaryAction', methods: ['buildFileSummaryMessages'] },
    { name: 'ZeusFolderSummaryAction', globalName: 'ZeusFolderSummaryAction', methods: ['buildFolderMarkdownSummaryMessages'] },
    { name: 'ZeusTagCandidateAction', globalName: 'ZeusTagCandidateAction', methods: ['buildTagCandidates', 'extractTags', 'applyTagsToMarkdown'] },
    { name: 'ZeusSelectionActions', globalName: 'ZeusSelectionActions', methods: ['mountSelectionActions'] },
    { name: 'ZeusPermissionState', globalName: 'ZeusPermissionState' },
    { name: 'ZeusIconRegistry', globalName: 'ZeusIconRegistry' },
    { name: 'ZeusIconRenderer', globalName: 'ZeusIconRenderer', methods: ['createIconElement', 'getIconPath'] },
    { name: 'ZeusModalBehavior', globalName: 'ZeusModalBehavior', methods: ['mountModalBehavior'] },
    { name: 'MarkdownItBrowserEngine', globalName: 'markdownit' },
    { name: 'ZeusObsidianMarkdownExtension', globalName: 'ZeusObsidianMarkdownExtension', methods: ['useObsidianMarkdown'] },
    { name: 'ZeusMarkdownEngine', globalName: 'ZeusMarkdownEngine', methods: ['renderBody', 'renderInline'] },
    { name: 'ZeusMarkdownProperties', globalName: 'ZeusMarkdownProperties', methods: ['splitFrontmatter', 'renderProperties'] },
    { name: 'ZeusMarkdownRenderer', globalName: 'ZeusMarkdownRenderer', methods: ['renderMarkdown'] },
    { name: 'ZeusMarkdownPreview', globalName: 'ZeusMarkdownPreview' },
    { name: 'ZeusUpdateFlashState', globalName: 'ZeusUpdateFlashState', methods: ['createUpdateFlashState'] },
    { name: 'ZeusPanelLayoutState', globalName: 'ZeusPanelLayoutState', methods: ['createPanelLayoutState'] },
    { name: 'ZeusFilePanel', globalName: 'ZeusFilePanel' },
    { name: 'ZeusReviewBasketState', globalName: 'ZeusReviewBasketState' },
    { name: 'ZeusReviewBasket', globalName: 'ZeusReviewBasket' },
    { name: 'ZeusModelReadActionRunner', globalName: 'ZeusModelReadActionRunner', methods: ['runModelReadActions'] },
    { name: 'ZeusReadContextPreflight', globalName: 'ZeusReadContextPreflight', methods: ['runReadContextPreflight'] },
    { name: 'ZeusSelectedUpdateProposalAction', globalName: 'ZeusSelectedUpdateProposalAction', methods: ['isSelectedFileUpdateRequest', 'buildSelectedFileUpdateMessages', 'parseSelectedFileUpdateProposal'] },
    { name: 'ZeusMarkdownDropController', globalName: 'ZeusMarkdownDropController', methods: ['mountMarkdownDropController'] },
    { name: 'ZeusChat', globalName: 'ZeusChat', methods: ['mountChat', 'appendMessage'] },
    { name: 'ZeusProviderStatus', globalName: 'ZeusProviderStatus', methods: ['mountProviderStatus'] },
    { name: 'ZeusSettingsPanel', globalName: 'ZeusSettingsPanel', methods: ['mountSettingsPanel'] },
    { name: 'ZeusShell', globalName: 'ZeusShell', methods: ['mountShell'] }
  ]);

  function bootstrapZeus(api, root) {
    const validation = validateRendererModules(typeof window !== 'undefined' ? window : null);
    if (!validation.ok) {
      renderStartupError(root, validation.message);
      throw new Error(validation.message);
    }
    return window.ZeusShell.mountShell(root, api);
  }

  function validateRendererModules(runtime) {
    if (!runtime) return { ok: false, message: 'ZEUS renderer runtime is not available.' };

    const missing = [];
    REQUIRED_RENDERER_MODULES.forEach((module) => {
      const api = runtime[module.globalName];
      if (!api) {
        missing.push(module.name);
        return;
      }
      (module.methods || []).forEach((method) => {
        if (typeof api[method] !== 'function') missing.push(module.name + '.' + method);
      });
    });

    if (missing.length > 0) {
      return {
        ok: false,
        message: 'ZEUS startup failed. Missing renderer module(s): ' + missing.join(', ')
      };
    }

    return { ok: true, message: 'Renderer modules ready.' };
  }

  function renderStartupError(root, message) {
    if (!root) return;
    root.innerHTML = '';
    const panel = document.createElement('main');
    panel.className = 'startup-error';
    panel.innerHTML = '<h1>ZEUS startup failed</h1><p></p>';
    panel.querySelector('p').textContent = message;
    root.appendChild(panel);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { bootstrapZeus, validateRendererModules, REQUIRED_RENDERER_MODULES };
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
      bootstrapZeus(window.zeus, document.getElementById('app'));
    });
  }
})();
