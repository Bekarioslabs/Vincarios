(function() {
  'use strict';

  const REQUIRED_RENDERER_MODULES = Object.freeze([
    { name: 'VitruviosYamlRuntime', globalName: 'VitruviosYamlRuntime', methods: ['Document', 'isMap', 'parseDocument'] },
    { name: 'VitruviosFrontmatterContract', globalName: 'VitruviosFrontmatterContract', methods: ['applyTags', 'getSearchFields', 'mergeMetadata', 'readFrontmatter'] },
    { name: 'VitruviosVaultProfile', globalName: 'VitruviosVaultProfile' },
    { name: 'VitruviosVaultProfileDraftState', globalName: 'VitruviosVaultProfileDraftState', methods: ['createVaultProfileDraftState'] },
    { name: 'VitruviosVaultProfileVisualIconRenderer', globalName: 'VitruviosVaultProfileVisualIconRenderer', methods: ['createFolderVisualIcon'] },
    { name: 'VitruviosPayloadLimits', globalName: 'VitruviosPayloadLimits', methods: ['normalizePayloadLimits', 'validateProviderMessagesPayload'] },
    { name: 'VitruviosActionSchema', globalName: 'VitruviosActionSchema' },
    { name: 'VitruviosModelActionParser', globalName: 'VitruviosModelActionParser', methods: ['parseModelActionCalls', 'stripModelActionCalls', 'normalizePathLike'] },
    { name: 'VitruviosProposalPlan', globalName: 'VitruviosProposalPlan' },
    { name: 'VitruviosDiffPreview', globalName: 'VitruviosDiffPreview' },
    { name: 'VitruviosContextIntent', globalName: 'VitruviosContextIntent' },
    { name: 'VitruviosContextLimits', globalName: 'VitruviosContextLimits', methods: ['normalizeContextLimits'] },
    { name: 'VitruviosPendingActionState', globalName: 'VitruviosPendingActionState', methods: ['createPendingActionState'] },
    { name: 'VitruviosBlockedActionState', globalName: 'VitruviosBlockedActionState', methods: ['createBlockedActionState'] },
    { name: 'VitruviosFolderContextController', globalName: 'VitruviosFolderContextController', methods: ['runFolderContextFlow'] },
    { name: 'VitruviosContextState', globalName: 'VitruviosContextState', methods: ['createContextState', 'buildChatContextPackage'] },
    { name: 'VitruviosContextPackageBuilder', globalName: 'VitruviosContextPackageBuilder', methods: ['buildChatContextPackage'] },
    { name: 'VitruviosContextBasket', globalName: 'VitruviosContextBasket', methods: ['mountContextBasket'] },
    { name: 'VitruviosSuggestionConverters', globalName: 'VitruviosSuggestionConverters', methods: ['isConvertibleSuggestion', 'convertSuggestionToReviewProposal', 'getConvertibleCheckedSuggestions', 'buildSuggestionDiffPreview'] },
    { name: 'VitruviosSearchWorkspace', globalName: 'VitruviosSearchWorkspace', methods: ['mountSearchWorkspace'] },
    { name: 'VitruviosInboxCleanupReport', globalName: 'VitruviosInboxCleanupReport', methods: ['buildInboxCleanupReport', 'formatInboxCleanupReportMarkdown'] },
    { name: 'VitruviosInboxCleanup', globalName: 'VitruviosInboxCleanup', methods: ['mountInboxCleanup', 'runInboxCleanupReport'] },
    { name: 'VitruviosFileTreeKeyboard', globalName: 'VitruviosFileTreeKeyboard', methods: ['getFileTreeNavigation', 'isFileTreeNavigationKey'] },
    { name: 'VitruviosScopedSelection', globalName: 'VitruviosScopedSelection', methods: ['mountScopedSelection'] },
    { name: 'VitruviosSelectionActionCategories', globalName: 'VitruviosSelectionActionCategories', methods: ['getActionCategory'] },
    { name: 'VitruviosSelectionActionPermissionText', globalName: 'VitruviosSelectionActionPermissionText', methods: ['fileReadReason', 'folderReadReason', 'fileWriteReason', 'missingPermissionMessage'] },
    { name: 'VitruviosSelectionActionRegistry', globalName: 'VitruviosSelectionActionRegistry', methods: ['getSelectionActions', 'getTargetKind'] },
    { name: 'VitruviosSummaryResponsePresentation', globalName: 'VitruviosSummaryResponsePresentation', methods: ['formatFileSummaryResponse', 'formatFolderSummaryResponse'] },
    { name: 'VitruviosFileSummaryAction', globalName: 'VitruviosFileSummaryAction', methods: ['buildFileSummaryMessages'] },
    { name: 'VitruviosFolderSummaryAction', globalName: 'VitruviosFolderSummaryAction', methods: ['buildFolderMarkdownSummaryMessages'] },
    { name: 'VitruviosActionDefaults', globalName: 'VitruviosActionDefaults', methods: ['getFolderActionDefault'] },
    { name: 'VitruviosTheme', globalName: 'VitruviosTheme', methods: ['resolveEffectiveTheme'] },
    { name: 'VitruviosThemePacks', globalName: 'VitruviosThemePacks', methods: ['getBuiltInThemePack', 'listBuiltInThemePacks'] },
    { name: 'VitruviosThemeController', globalName: 'VitruviosThemeController', methods: ['createThemeController'] },
    { name: 'VitruviosFolderScopeOptions', globalName: 'VitruviosFolderScopeOptions', methods: ['normalizeFolderScopeOptions'] },
    { name: 'VitruviosFolderScopeForm', globalName: 'VitruviosFolderScopeForm', methods: ['mountFolderScopeForm'] },
    { name: 'VitruviosFolderMarkdownScopeReader', globalName: 'VitruviosFolderMarkdownScopeReader', methods: ['listScopedMarkdownFiles'] },
    { name: 'VitruviosFolderInspectAction', globalName: 'VitruviosFolderInspectAction', methods: ['buildFolderInspectionReport'] },
    { name: 'VitruviosFolderContextSnapshotAction', globalName: 'VitruviosFolderContextSnapshotAction', methods: ['buildFolderContextSnapshot'] },
    { name: 'VitruviosTagCandidateAction', globalName: 'VitruviosTagCandidateAction', methods: ['buildTagCandidates', 'extractTags', 'applyTagsToMarkdown'] },
    { name: 'VitruviosSelectionActions', globalName: 'VitruviosSelectionActions', methods: ['mountSelectionActions'] },
    { name: 'VitruviosPermissionState', globalName: 'VitruviosPermissionState' },
    { name: 'VitruviosIconRegistry', globalName: 'VitruviosIconRegistry' },
    { name: 'VitruviosIconRenderer', globalName: 'VitruviosIconRenderer', methods: ['createIconElement', 'getIconPath'] },
    { name: 'VitruviosModalBehavior', globalName: 'VitruviosModalBehavior', methods: ['mountModalBehavior'] },
    { name: 'MarkdownItBrowserEngine', globalName: 'markdownit' },
    { name: 'VitruviosObsidianMarkdownExtension', globalName: 'VitruviosObsidianMarkdownExtension', methods: ['useObsidianMarkdown'] },
    { name: 'VitruviosMarkdownEngine', globalName: 'VitruviosMarkdownEngine', methods: ['renderBody', 'renderInline'] },
    { name: 'VitruviosMarkdownProperties', globalName: 'VitruviosMarkdownProperties', methods: ['splitFrontmatter', 'renderProperties'] },
    { name: 'VitruviosMarkdownRenderer', globalName: 'VitruviosMarkdownRenderer', methods: ['renderMarkdown'] },
    { name: 'VitruviosEditorFormatting', globalName: 'VitruviosEditorFormatting', methods: ['applyEditorFormat', 'insertInternalWikilink'] },
    { name: 'VitruviosMarkdownLinkPicker', globalName: 'VitruviosMarkdownLinkPicker', methods: ['mountMarkdownLinkPicker'] },

    { name: 'VitruviosMarkdownPreview', globalName: 'VitruviosMarkdownPreview' },
    { name: 'VitruviosUpdateFlashState', globalName: 'VitruviosUpdateFlashState', methods: ['createUpdateFlashState'] },
    { name: 'VitruviosPanelLayoutState', globalName: 'VitruviosPanelLayoutState', methods: ['createPanelLayoutState'] },
    { name: 'VitruviosFilePanel', globalName: 'VitruviosFilePanel' },
    { name: 'VitruviosReviewBasketState', globalName: 'VitruviosReviewBasketState' },
    { name: 'VitruviosReviewBasket', globalName: 'VitruviosReviewBasket' },
    { name: 'VitruviosModelReadActionRunner', globalName: 'VitruviosModelReadActionRunner', methods: ['runModelReadActions'] },
    { name: 'VitruviosReadContextPreflight', globalName: 'VitruviosReadContextPreflight', methods: ['runReadContextPreflight'] },
    { name: 'VitruviosSelectedUpdateProposalAction', globalName: 'VitruviosSelectedUpdateProposalAction', methods: ['isSelectedFileUpdateRequest', 'buildSelectedFileUpdateMessages', 'parseSelectedFileUpdateProposal'] },
    { name: 'VitruviosMarkdownDropController', globalName: 'VitruviosMarkdownDropController', methods: ['mountMarkdownDropController'] },
    { name: 'VitruviosChat', globalName: 'VitruviosChat', methods: ['mountChat', 'appendMessage'] },
    { name: 'VitruviosProviderStatus', globalName: 'VitruviosProviderStatus', methods: ['mountProviderStatus'] },
    { name: 'VitruviosStartup', globalName: 'VitruviosStartup', methods: ['mountStartupScreen'] },
    { name: 'VitruviosSettingsPanel', globalName: 'VitruviosSettingsPanel', methods: ['mountSettingsPanel'] },
    { name: 'VitruviosShell', globalName: 'VitruviosShell', methods: ['mountShell'] }
  ]);

  function bootstrapVitruvios(api, root) {
    const validation = validateRendererModules(typeof window !== 'undefined' ? window : null);
    if (!validation.ok) {
      renderStartupError(root, validation.message);
      throw new Error(validation.message);
    }
    return window.VitruviosShell.mountShell(root, api);
  }

  function validateRendererModules(runtime) {
    if (!runtime) return { ok: false, message: 'vitruvios renderer runtime is not available.' };

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
        message: 'vitruvios startup failed. Missing renderer module(s): ' + missing.join(', ')
      };
    }

    return { ok: true, message: 'Renderer modules ready.' };
  }

  function renderStartupError(root, message) {
    if (!root) return;
    root.innerHTML = '';
    const panel = document.createElement('main');
    panel.className = 'startup-error';
    panel.innerHTML = '<h1>vitruvios startup failed</h1><p></p>';
    panel.querySelector('p').textContent = message;
    root.appendChild(panel);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { bootstrapVitruvios, validateRendererModules, REQUIRED_RENDERER_MODULES };
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
      bootstrapVitruvios(window.vitruvios, document.getElementById('app'));
    });
  }
})();
