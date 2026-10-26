(function() {
  'use strict';

  const REQUIRED_RENDERER_MODULES = Object.freeze([
    { name: 'VincariosYamlRuntime', globalName: 'VincariosYamlRuntime', methods: ['Document', 'isMap', 'parseDocument'] },
    { name: 'VincariosFrontmatterContract', globalName: 'VincariosFrontmatterContract', methods: ['applyTags', 'getSearchFields', 'mergeMetadata', 'readFrontmatter'] },
    { name: 'VincariosVaultProfile', globalName: 'VincariosVaultProfile' },
    { name: 'VincariosVaultProfileDraftState', globalName: 'VincariosVaultProfileDraftState', methods: ['createVaultProfileDraftState'] },
    { name: 'VincariosVaultProfileVisualIconRenderer', globalName: 'VincariosVaultProfileVisualIconRenderer', methods: ['createFolderVisualIcon'] },
    { name: 'VincariosPayloadLimits', globalName: 'VincariosPayloadLimits', methods: ['normalizePayloadLimits', 'validateProviderMessagesPayload'] },
    { name: 'VincariosActionSchema', globalName: 'VincariosActionSchema' },
    { name: 'VincariosModelActionParser', globalName: 'VincariosModelActionParser', methods: ['parseModelActionCalls', 'stripModelActionCalls', 'normalizePathLike'] },
    { name: 'VincariosProposalPlan', globalName: 'VincariosProposalPlan' },
    { name: 'VincariosDiffPreview', globalName: 'VincariosDiffPreview' },
    { name: 'VincariosLineEndings', globalName: 'VincariosLineEndings', methods: ['normalizeLineEndings', 'preserveLineEndings'] },
    { name: 'VincariosVaultPath', globalName: 'VincariosVaultPath', methods: ['normalizeRelativePath'] },
    { name: 'VincariosContextIntent', globalName: 'VincariosContextIntent' },
    { name: 'VincariosContextLimits', globalName: 'VincariosContextLimits', methods: ['normalizeContextLimits'] },
    { name: 'VincariosPendingActionState', globalName: 'VincariosPendingActionState', methods: ['createPendingActionState'] },
    { name: 'VincariosBlockedActionState', globalName: 'VincariosBlockedActionState', methods: ['createBlockedActionState'] },
    { name: 'VincariosFolderContextController', globalName: 'VincariosFolderContextController', methods: ['runFolderContextFlow'] },
    { name: 'VincariosContextState', globalName: 'VincariosContextState', methods: ['createContextState', 'buildChatContextPackage'] },
    { name: 'VincariosContextPackageBuilder', globalName: 'VincariosContextPackageBuilder', methods: ['buildChatContextPackage'] },
    { name: 'VincariosContextBasket', globalName: 'VincariosContextBasket', methods: ['mountContextBasket'] },
    { name: 'VincariosSuggestionConverters', globalName: 'VincariosSuggestionConverters', methods: ['isConvertibleSuggestion', 'convertSuggestionToReviewProposal', 'getConvertibleCheckedSuggestions', 'buildSuggestionDiffPreview'] },
    { name: 'VincariosWorkspaceShortcuts', globalName: 'VincariosWorkspaceShortcuts', methods: ['mountWorkspaceShortcuts'] },
    { name: 'VincariosActivityReporter', globalName: 'VincariosActivityReporter', methods: ['createActivityReporter'] },
    { name: 'VincariosUserFeedbackMessages', globalName: 'VincariosUserFeedbackMessages', methods: ['formatUserFeedback', 'getUserFeedbackTone'] },
    { name: 'VincariosSearchWorkspace', globalName: 'VincariosSearchWorkspace', methods: ['mountSearchWorkspace'] },
    { name: 'VincariosVaultHome', globalName: 'VincariosVaultHome', methods: ['mountVaultHome'] },
    { name: 'VincariosInboxCleanupReport', globalName: 'VincariosInboxCleanupReport', methods: ['buildInboxCleanupReport', 'formatInboxCleanupReportMarkdown'] },
    { name: 'VincariosInboxCleanup', globalName: 'VincariosInboxCleanup', methods: ['mountInboxCleanup', 'runInboxCleanupReport'] },
    { name: 'VincariosFileTreeKeyboard', globalName: 'VincariosFileTreeKeyboard', methods: ['getFileTreeNavigation', 'isFileTreeNavigationKey'] },
    { name: 'VincariosFileTreeRenderer', globalName: 'VincariosFileTreeRenderer', methods: ['createFileTreeRenderer'] },
    { name: 'VincariosScopedSelection', globalName: 'VincariosScopedSelection', methods: ['mountScopedSelection'] },
    { name: 'VincariosSelectionActionCategories', globalName: 'VincariosSelectionActionCategories', methods: ['getActionCategory'] },
    { name: 'VincariosSelectionActionPermissionText', globalName: 'VincariosSelectionActionPermissionText', methods: ['fileReadReason', 'folderReadReason', 'fileWriteReason', 'missingPermissionMessage'] },
    { name: 'VincariosSelectionActionRegistry', globalName: 'VincariosSelectionActionRegistry', methods: ['getSelectionActions', 'getTargetKind'] },
    { name: 'VincariosSummaryResponsePresentation', globalName: 'VincariosSummaryResponsePresentation', methods: ['formatFileSummaryResponse', 'formatFolderSummaryResponse'] },
    { name: 'VincariosFileSummaryAction', globalName: 'VincariosFileSummaryAction', methods: ['buildFileSummaryMessages'] },
    { name: 'VincariosFolderSummaryAction', globalName: 'VincariosFolderSummaryAction', methods: ['buildFolderMarkdownSummaryMessages'] },
    { name: 'VincariosActionDefaults', globalName: 'VincariosActionDefaults', methods: ['getFolderActionDefault'] },
    { name: 'VincariosTheme', globalName: 'VincariosTheme', methods: ['resolveEffectiveTheme'] },
    { name: 'VincariosThemePacks', globalName: 'VincariosThemePacks', methods: ['getBuiltInThemePack', 'listBuiltInThemePacks'] },
    { name: 'VincariosThemeController', globalName: 'VincariosThemeController', methods: ['createThemeController'] },
    { name: 'VincariosFolderScopeOptions', globalName: 'VincariosFolderScopeOptions', methods: ['normalizeFolderScopeOptions'] },
    { name: 'VincariosFolderScopeForm', globalName: 'VincariosFolderScopeForm', methods: ['mountFolderScopeForm'] },
    { name: 'VincariosFolderMarkdownScopeReader', globalName: 'VincariosFolderMarkdownScopeReader', methods: ['listScopedMarkdownFiles'] },
    { name: 'VincariosFolderInspectAction', globalName: 'VincariosFolderInspectAction', methods: ['buildFolderInspectionReport'] },
    { name: 'VincariosFolderContextSnapshotAction', globalName: 'VincariosFolderContextSnapshotAction', methods: ['buildFolderContextSnapshot'] },
    { name: 'VincariosTagCandidateAction', globalName: 'VincariosTagCandidateAction', methods: ['buildTagCandidates', 'extractTags', 'applyTagsToMarkdown'] },
    { name: 'VincariosSimilarNotesForm', globalName: 'VincariosSimilarNotesForm', methods: ['mountSimilarNotesForm'] },
    { name: 'VincariosUpdateInstructionForm', globalName: 'VincariosUpdateInstructionForm', methods: ['mountUpdateInstructionForm'] },
    { name: 'VincariosSelectionActions', globalName: 'VincariosSelectionActions', methods: ['mountSelectionActions'] },
    { name: 'VincariosPermissionState', globalName: 'VincariosPermissionState' },
    { name: 'VincariosIconRegistry', globalName: 'VincariosIconRegistry' },
    { name: 'VincariosIconRenderer', globalName: 'VincariosIconRenderer', methods: ['createIconElement', 'getIconPath'] },
    { name: 'VincariosModalBehavior', globalName: 'VincariosModalBehavior', methods: ['mountModalBehavior'] },
    { name: 'MarkdownItBrowserEngine', globalName: 'markdownit' },
    { name: 'VincariosObsidianMarkdownExtension', globalName: 'VincariosObsidianMarkdownExtension', methods: ['useObsidianMarkdown'] },
    { name: 'VincariosMarkdownEngine', globalName: 'VincariosMarkdownEngine', methods: ['renderBody', 'renderInline'] },
    { name: 'VincariosMarkdownProperties', globalName: 'VincariosMarkdownProperties', methods: ['splitFrontmatter', 'renderProperties'] },
    { name: 'VincariosMarkdownRenderer', globalName: 'VincariosMarkdownRenderer', methods: ['renderMarkdown'] },
    { name: 'VincariosEditorFormatting', globalName: 'VincariosEditorFormatting', methods: ['applyEditorFormat', 'insertInternalWikilink'] },
    { name: 'VincariosMarkdownLinkPicker', globalName: 'VincariosMarkdownLinkPicker', methods: ['mountMarkdownLinkPicker'] },

    { name: 'VincariosMarkdownPreview', globalName: 'VincariosMarkdownPreview' },
    { name: 'VincariosUpdateFlashState', globalName: 'VincariosUpdateFlashState', methods: ['createUpdateFlashState'] },
    { name: 'VincariosPanelLayoutState', globalName: 'VincariosPanelLayoutState', methods: ['createPanelLayoutState'] },
    { name: 'VincariosFilePanel', globalName: 'VincariosFilePanel' },
    { name: 'VincariosReviewBasketState', globalName: 'VincariosReviewBasketState' },
    { name: 'VincariosReviewBasketPersistence', globalName: 'VincariosReviewBasketPersistence', methods: ['createReviewBasketPersistence'] },
    { name: 'VincariosReviewExecution', globalName: 'VincariosReviewExecution', methods: ['createReviewExecutionController'] },
    { name: 'VincariosReviewBasket', globalName: 'VincariosReviewBasket' },
    { name: 'VincariosModelReadActionRunner', globalName: 'VincariosModelReadActionRunner', methods: ['runModelReadActions'] },
    { name: 'VincariosReadContextPreflight', globalName: 'VincariosReadContextPreflight', methods: ['runReadContextPreflight'] },
    { name: 'VincariosSelectedUpdateProposalAction', globalName: 'VincariosSelectedUpdateProposalAction', methods: ['isSelectedFileUpdateRequest', 'buildSelectedFileUpdateMessages', 'parseSelectedFileUpdateProposal'] },
    { name: 'VincariosMarkdownDropController', globalName: 'VincariosMarkdownDropController', methods: ['mountMarkdownDropController'] },
    { name: 'VincariosChat', globalName: 'VincariosChat', methods: ['mountChat', 'appendMessage'] },
    { name: 'VincariosProviderStatus', globalName: 'VincariosProviderStatus', methods: ['mountProviderStatus'] },
    { name: 'VincariosStartup', globalName: 'VincariosStartup', methods: ['mountStartupScreen'] },
    { name: 'VincariosIndexSettings', globalName: 'VincariosIndexSettings', methods: ['createIndexSettingsController'] },
    { name: 'VincariosSettingsPanel', globalName: 'VincariosSettingsPanel', methods: ['mountSettingsPanel'] },
    { name: 'VincariosShell', globalName: 'VincariosShell', methods: ['mountShell'] }
  ]);

  function bootstrapVincarios(api, root) {
    const validation = validateRendererModules(typeof window !== 'undefined' ? window : null);
    if (!validation.ok) {
      renderStartupError(root, validation.message);
      throw new Error(validation.message);
    }
    return window.VincariosShell.mountShell(root, api);
  }

  function validateRendererModules(runtime) {
    if (!runtime) return { ok: false, message: 'vincarios renderer runtime is not available.' };

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
        message: 'vincarios startup failed. Missing renderer module(s): ' + missing.join(', ')
      };
    }

    return { ok: true, message: 'Renderer modules ready.' };
  }

  function renderStartupError(root, message) {
    if (!root) return;
    root.innerHTML = '';
    const panel = document.createElement('main');
    panel.className = 'startup-error';
    panel.innerHTML = '<h1>vincarios startup failed</h1><p></p>';
    panel.querySelector('p').textContent = message;
    root.appendChild(panel);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { bootstrapVincarios, validateRendererModules, REQUIRED_RENDERER_MODULES };
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
      bootstrapVincarios(window.vincarios, document.getElementById('app'));
    });
  }
})();
