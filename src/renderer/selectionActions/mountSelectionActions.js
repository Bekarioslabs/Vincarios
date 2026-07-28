(function() {
  'use strict';

  function mountSelectionActions(options) {
    options = options || {};
    const api = options.api || {};
    const onRequestPanelExpand = typeof options.onRequestPanelExpand === 'function' ? options.onRequestPanelExpand : function noop() {};
    const isTargetAvailable = typeof options.isTargetAvailable === 'function' ? options.isTargetAvailable : () => true;
    const openSourceEditor = typeof options.openSourceEditor === 'function' ? options.openSourceEditor : () => false;
    const app = options.app;
    const contextState = options.contextState;
    const reviewBasket = options.reviewBasket || null;
    const suggestionState = options.suggestionState || null;
    const status = options.status || null;
    let similarNotesSessionOptions = null;
    if (!app || !contextState || typeof contextState.snapshot !== 'function') return null;

    const root = app.querySelector('.selection-actions-content');
    if (!root) return null;

    const unsubscribe = typeof contextState.subscribe === 'function'
      ? contextState.subscribe(render)
      : null;
    const onFilesCollapseChanged = () => render(contextState.snapshot());
    const onSimilarDefaultsChanged = () => {
      similarNotesSessionOptions = null;
      removeOpenActionForms();
    };
    app.addEventListener('vincarios:files-collapse-change', onFilesCollapseChanged);
    app.addEventListener('vincarios:embedding-similar-defaults-change', onSimilarDefaultsChanged);

    render(contextState.snapshot());

    function render(snapshot) {
      root.innerHTML = '';

      if (!snapshot || snapshot.kind === 'none') {
        const empty = document.createElement('div');
        empty.className = 'selection-actions-empty';
        empty.textContent = 'Select a file or folder.';
        root.appendChild(empty);
        return;
      }


      const actions = getRegistry().getSelectionActions(snapshot);
      if (!actions.length) {
        const empty = document.createElement('div');
        empty.className = 'selection-actions-empty';
        empty.textContent = 'No actions for this target yet.';
        root.appendChild(empty);
        return;
      }

      const available = isTargetAvailable() !== false;
      actions.forEach((action) => {
        const renderedAction = available ? action : createLayoutLockedAction(action);
        root.appendChild(createActionRow(renderedAction, snapshot));
      });
    }

    function createLayoutLockedAction(action) {
      return Object.assign({}, action, {
        enabled: false,
        softDisabled: false,
        layoutLocked: true,
        reason: 'Expand Files to use Selection Actions.'
      });
    }

    function createActionRow(action, snapshot) {
      const row = document.createElement('div');
      row.className = 'selection-action-row';
      row.dataset.actionId = action.id;
      row.appendChild(createActionButton(action, snapshot, row));
      return row;
    }

    function createActionButton(action, snapshot, host) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'selection-action-button ui-flat-row is-' + action.category;
      button.dataset.actionId = action.id;
      button.dataset.actionCategory = action.category;
      button.dataset.actionExecution = action.executionKind || 'app';
      if (action.future) button.dataset.futureSlot = action.id;
      button.disabled = action.enabled !== true;
      if (action.softDisabled) {
        button.classList.add('is-soft-disabled');
        button.setAttribute('aria-disabled', 'true');
      }
      if (action.layoutLocked) {
        button.classList.add('is-layout-locked');
        button.setAttribute('aria-disabled', 'true');
      }

      const category = getCategories().getActionCategory(action.category);
      const hoverText = action.reason || (action.future ? 'Planned V1 action.' : action.description || action.label);
      button.title = hoverText;
      button.setAttribute('aria-label', action.reason || getActionAriaLabel(action, category));

      const renderer = getIconRenderer();
      if (renderer && action.icon) button.appendChild(renderer.createIconElement(action.icon, 'selection-action-icon'));

      const categoryDot = document.createElement('span');
      categoryDot.className = 'selection-action-category-dot';
      categoryDot.setAttribute('aria-hidden', 'true');

      const label = document.createElement('span');
      label.className = 'selection-action-label';
      label.textContent = action.shortLabel || action.label;

      button.appendChild(categoryDot);
      button.appendChild(label);
      renderExecutionMarker(button, action.executionKind);
      if (action.softDisabled || action.layoutLocked) renderSoftDisabledLock(button);
      button.addEventListener('click', () => runAction(action, snapshot, host));
      return button;
    }

    function getActionAriaLabel(action, category) {
      const execution = executionDescription(action.executionKind);
      return [action.description || action.label, category.label + ' action', execution].filter(Boolean).join('. ');
    }

    function executionDescription(kind) {
      if (kind === 'provider') return 'Uses the local provider.';
      if (kind === 'embedding') return 'Uses local embeddings.';
      return 'Runs locally without a model.';
    }

    function renderExecutionMarker(button, executionKind) {
      const renderer = getIconRenderer();
      if (!renderer || executionKind === 'app') return;
      const iconName = executionKind === 'provider' ? 'actionProvider' : 'actionEmbedding';
      const marker = renderer.createIconElement(iconName, 'selection-action-execution-icon is-' + executionKind);
      button.appendChild(marker);
    }
    function renderSoftDisabledLock(button) {
      const renderer = getIconRenderer();
      if (!renderer || typeof renderer.createIconElement !== 'function') return;
      button.appendChild(renderer.createIconElement('lock', 'selection-action-lock-icon'));
    }

    function runAction(action, snapshot, host) {
      if (!action || action.enabled !== true) return;
      if (action.softDisabled) {
        const gate = createSoftDisabledActionGate(action, snapshot);
        appendMissingPermissionMessage(gate, action.id);
        return;
      }
      if (action.id === 'file.summarize') {
        summarizeFile(snapshot);
        return;
      }
      if (action.id === 'file.useAsContext') {
        contextState.addContextItem({ kind: 'file', path: snapshot.path, content: snapshot.content });
        setText(status, 'Added to Context Basket: ' + snapshot.path);
        return;
      }
      if (action.id === 'file.findSimilar') {
        renderSimilarNotesForm(snapshot, host);
        return;
      }
      if (action.id === 'file.suggestTags') {
        suggestTags(snapshot);
        return;
      }
      if (action.id === 'file.proposeUpdate') {
        const gate = validateFileUpdatePermissions(snapshot);
        if (!gate.ok) {
          appendMissingPermissionMessage(gate, 'file.proposeUpdate');
          return;
        }
        renderUpdateInstructionForm(snapshot, host);
        return;
      }
      if (action.id === 'folder.useAsContext') {
        renderFolderContextForm(snapshot, host);
        return;
      }
      if (action.id === 'folder.inspect') {
        renderFolderInspectForm(snapshot, host);
        return;
      }
      if (action.id === 'folder.summarizeMarkdown') {
        renderFolderSummaryForm(snapshot, host);
      }
    }

    function validateFileUpdatePermissions(snapshot) {
      if (!snapshot || snapshot.kind !== 'file') {
        return { ok: false, message: 'Select a Markdown file before proposing an update.' };
      }
      if (snapshot.readAllowed !== true) {
        return createMissingPermissionAction(snapshot, 'read', 'file.proposeUpdate');
      }
      if (typeof snapshot.content !== 'string' || snapshot.content.length === 0) {
        return { ok: false, message: 'Read is enabled, but the selected file content is not loaded yet. Click or reselect the file, then retry.' };
      }
      if (snapshot.writeAllowed !== true) {
        return createMissingPermissionAction(snapshot, 'write', 'file.proposeUpdate');
      }
      return { ok: true };
    }

    function createSoftDisabledActionGate(action, snapshot) {
      if (action && (action.id === 'file.proposeUpdate' || action.id === 'file.suggestTags')) {
        return createMissingPermissionAction(snapshot, 'read_write', action.id);
      }
      return createMissingPermissionAction(snapshot, action && action.requiredPermission ? action.requiredPermission : 'read', action && action.id);
    }

    function createMissingPermissionAction(snapshot, requiredPermission, actionId) {
      const path = normalizePath(snapshot && snapshot.path);
      return {
        ok: false,
        missingPermission: requiredPermission,
        actionId,
        targetPath: path,
        targetKind: snapshot && snapshot.kind === 'folder' ? 'folder' : 'file',
        message: getPermissionText().missingPermissionMessage({ actionId, requiredPermission, targetKind: snapshot && snapshot.kind === 'folder' ? 'folder' : 'file', path })
      };
    }

    function appendMissingPermissionMessage(gate) {
      appendActionMessage((gate && gate.message) || 'Action unavailable.');
      setText(status, (gate && gate.message) || 'Action unavailable.');
    }

    async function summarizeFile(snapshot) {
      const summary = getFileSummaryAction();
      if (!summary || typeof summary.buildFileSummaryMessages !== 'function') {
        appendActionMessage('File summary failed: summary action module unavailable.');
        setText(status, 'File summary failed.');
        return;
      }
      if (!api.chat || typeof api.chat.send !== 'function') {
        appendActionMessage('File summary failed: chat provider API unavailable.');
        setText(status, 'File summary failed.');
        return;
      }

      const request = summary.buildFileSummaryMessages(snapshot, {
        maxChars: await getFileSummaryMaxChars()
      });
      if (!request.ok) {
        appendActionMessage('File summary unavailable: ' + (request.message || 'Unsupported selection.'));
        setText(status, 'File summary unavailable.');
        return;
      }

      setText(status, 'Summarizing file: ' + request.path);
      const pending = appendActionMessage('Summarizing file: ' + request.path, [], { pending: true });
      try {
        const result = await api.chat.send({ messages: request.messages });
        if (result && result.ok && result.message && result.message.content) {
          removeNode(pending);
          appendActionMessage(getSummaryResponsePresentation().formatFileSummaryResponse({
            path: request.path,
            truncated: request.truncated,
            content: result.message.content
          }), [], { allowSave: true, suggestedTitle: buildSummaryTitle('md', request.path), responseSubfolder: 'Summaries', originAction: 'summarize_file', presentation: 'summary' });
          setText(status, 'File summarized: ' + request.path);
          return;
        }
        removeNode(pending);
        appendActionMessage('File summary failed: ' + ((result && result.error) || 'No response.'));
        setText(status, 'File summary failed.');
      } catch (error) {
        removeNode(pending);
        appendActionMessage('File summary failed: ' + ((error && error.message) || 'request failed'));
        setText(status, 'File summary failed.');
      }
    }

    async function getFileSummaryMaxChars() {
      const fallback = getActionDefaults().DEFAULT_FOLDER_ACTION_DEFAULTS.fileSummaryMaxChars;
      if (!api.settings || typeof api.settings.get !== 'function') return fallback;
      const settings = await api.settings.get();
      const value = settings && settings.actionDefaults ? settings.actionDefaults.fileSummaryMaxChars : fallback;
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 1000 ? Math.min(60000, Math.floor(parsed)) : fallback;
    }
    function suggestTags(snapshot) {
      const builder = getTagCandidateAction();
      if (!builder || typeof builder.buildTagCandidates !== 'function') {
        appendActionMessage('Tag candidates failed: tag candidate module unavailable.');
        setText(status, 'Tag candidates failed.');
        return;
      }
      if (!suggestionState || typeof suggestionState.addGroup !== 'function') {
        appendActionMessage('Tag candidates failed: Suggestions workspace unavailable.');
        setText(status, 'Tag candidates failed.');
        return;
      }
      const result = builder.buildTagCandidates({ path: snapshot && snapshot.path, content: snapshot && snapshot.content });
      if (!result.ok) {
        if (result.code === 'frontmatter_invalid') {
          appendActionMessage('YAML tags could not be updated safely. Fix the frontmatter in Source editor, then try again.', [{
            label: 'Open source',
            onClick: () => {
              if (!openSourceEditor(snapshot && snapshot.path)) setText(status, 'Open this Markdown file in Preview before editing source.');
            }
          }]);
          setText(status, 'YAML tags could not be updated safely.');
          return;
        }
        appendActionMessage('No tag candidates found: ' + (result.message || 'No useful missing tags.'));
        setText(status, 'No tag candidates found.');
        return;
      }
      suggestionState.addGroup(result.group);
      appendActionMessage('Tag candidates added to Suggestions.');
      setText(status, 'Tag candidates added: ' + snapshot.path);
    }

    async function renderSimilarNotesForm(snapshot, host) {
      onRequestPanelExpand();
      removeOpenActionForms();
      const defaults = await loadSimilarNotesDefaults();
      getSimilarNotesForm().mountSimilarNotesForm({
        host: host || root,
        initialOptions: similarNotesSessionOptions || defaults,
        sourceOptions: getSimilaritySourceOptions(),
        onSubmit: (formOptions) => {
          similarNotesSessionOptions = Object.assign({}, formOptions, { maxResults: formOptions.limit });
          findSimilarNotes(snapshot, formOptions);
        }
      });
    }

    function removeOpenActionForms() {
      Array.from(root.querySelectorAll('.selection-action-form')).forEach(removeNode);
    }
    function getSimilaritySourceOptions() {
      return window.VincariosSimilaritySourceOptions;
    }

    function getSimilarNotesForm() {
      return window.VincariosSimilarNotesForm;
    }

    function getUpdateInstructionForm() {
      return window.VincariosUpdateInstructionForm;
    }

    async function loadSimilarNotesDefaults() {
      const fallback = { minimumScorePercent: 65, maxResults: 8, mode: 'mixed', scope: 'same_role' };
      if (!api.settings || typeof api.settings.get !== 'function') return fallback;
      try {
        const settings = await api.settings.get();
        const similarNotes = settings && settings.embeddings && settings.embeddings.similarNotes ? settings.embeddings.similarNotes : {};
        return {
          minimumScorePercent: similarNotes.minimumScorePercent || fallback.minimumScorePercent,
          maxResults: similarNotes.maxResults || fallback.maxResults,
          mode: getSimilaritySourceOptions().normalize(similarNotes.mode || fallback.mode),
          scope: fallback.scope
        };
      } catch (error) {
        return fallback;
      }
    }

    async function findSimilarNotes(snapshot, searchOptions) {
      if (!api.embeddings || typeof api.embeddings.findSimilarNotes !== 'function') {
        appendActionMessage('Similar notes failed: embeddings API unavailable.');
        setText(status, 'Similar notes failed.');
        return;
      }
      const targetPath = normalizePath(snapshot && snapshot.path);
      setText(status, 'Finding similar notes: ' + targetPath);
      const pending = appendActionMessage('Finding similar notes: ' + targetPath, [], { pending: true });
      try {
        const result = await api.embeddings.findSimilarNotes(Object.assign({ targetPath: targetPath }, searchOptions || {}));
        removeNode(pending);
        if (result && result.ok && suggestionState && typeof suggestionState.addGroup === 'function') {
          const added = addSimilarNotesSuggestionGroup(targetPath, result, snapshot && snapshot.content);
          if (added) {
            appendActionMessage('Similar notes found. Suggestions updated.');
            setText(status, 'Similar notes found: ' + targetPath);
            return;
          }
        }
        appendActionMessage(formatSimilarNotesSummary(targetPath, result, snapshot && snapshot.content));
        setText(status, result && result.ok ? 'Similar notes found: ' + targetPath : 'Similar notes unavailable.');
      } catch (error) {
        removeNode(pending);
        appendActionMessage('Similar notes failed: ' + ((error && error.message) || 'request failed'));
        setText(status, 'Similar notes failed.');
      }
    }
    function renderUpdateInstructionForm(snapshot, host) {
      onRequestPanelExpand();
      removeOpenActionForms();
      getUpdateInstructionForm().mountUpdateInstructionForm({
        host: host || root,
        confirmDiscard: (message) => typeof window !== 'undefined'
          && typeof window.confirm === 'function'
          && window.confirm(message),
        onInvalid: (result) => setText(status, result.message),
        onSubmit: (instruction) => proposeFileUpdate(snapshot, instruction)
      });
      setText(status, 'Describe update for: ' + snapshot.path);
    }

    async function proposeFileUpdate(snapshot, instruction) {
      const updater = getSelectedUpdateProposalAction();
      if (!updater || typeof updater.buildSelectedFileUpdateMessages !== 'function' || typeof updater.parseSelectedFileUpdateProposal !== 'function') {
        appendActionMessage('Update proposal failed: update proposal module unavailable.');
        setText(status, 'Update proposal failed.');
        return;
      }
      if (!api.chat || typeof api.chat.send !== 'function') {
        appendActionMessage('Update proposal failed: chat provider API unavailable.');
        setText(status, 'Update proposal failed.');
        return;
      }
      if (!reviewBasket || typeof reviewBasket.addProposal !== 'function') {
        appendActionMessage('Update proposal failed: Review Basket unavailable.');
        setText(status, 'Update proposal failed.');
        return;
      }

      const request = updater.buildSelectedFileUpdateMessages(snapshot, instruction);
      if (!request.ok) {
        appendActionMessage('Update proposal unavailable: ' + (request.message || 'Unsupported selection.'));
        setText(status, 'Update proposal unavailable.');
        return;
      }

      setText(status, 'Preparing update proposal: ' + request.path);
      const pending = appendActionMessage('Preparing update proposal: ' + request.path, [], { pending: true });
      try {
        const result = await api.chat.send({ messages: request.messages });
        removeNode(pending);
        if (!result || !result.ok || !result.message || !result.message.content) {
          appendActionMessage(formatUpdateProposalDiagnostics(request, 'provider', classifyProviderFailure(result)));
          setText(status, 'Update proposal failed: provider.');
          return;
        }

        const proposal = updater.parseSelectedFileUpdateProposal(result.message.content, {
          path: request.path,
          currentContent: request.currentContent
        });
        if (!proposal.ok) {
          appendActionMessage(formatUpdateProposalDiagnostics(request, 'parser', (proposal.message || 'Invalid proposal.') + ' [' + (proposal.code || 'unknown') + ']'));
          setText(status, 'Update proposal failed: parser.');
          return;
        }

        try {
          reviewBasket.addProposal(proposal.proposal);
        } catch (basketError) {
          appendActionMessage(formatUpdateProposalDiagnostics(request, 'review_basket', (basketError && basketError.message) || 'Could not add proposal to Review Basket.'));
          setText(status, 'Update proposal failed: Review Basket.');
          return;
        }
        appendActionMessage('Update proposal added to Review Basket.');
        setText(status, 'Update proposal added to Review Basket.');
      } catch (error) {
        removeNode(pending);
        appendActionMessage(formatUpdateProposalDiagnostics(request, 'provider_exception', classifyThrownProviderError(error)));
        setText(status, 'Update proposal failed: provider.');
      }
    }
    function renderFolderSummaryForm(snapshot, host) {
      renderFolderScopeForm(snapshot, host, {
        defaultKey: 'folderSummary',
        actionId: 'folder.summarizeMarkdown',
        title: 'Summary scope',
        submitLabel: 'Summarize',
        onSubmit: (scopeOptions) => summarizeFolderMarkdown(snapshot, scopeOptions)
      });
    }

    async function summarizeFolderMarkdown(snapshot, scopeOptions) {
      const summary = getFolderSummaryAction();
      const scopeReader = getFolderMarkdownScopeReader();
      if (!summary || typeof summary.buildFolderMarkdownSummaryMessages !== 'function' || !scopeReader || typeof scopeReader.listScopedMarkdownFiles !== 'function') {
        appendActionMessage('Folder Markdown summary failed: summary module unavailable.');
        setText(status, 'Folder Markdown summary failed.');
        return;
      }
      if (!api.vault || typeof api.vault.listFolder !== 'function' || typeof api.vault.readMarkdown !== 'function') {
        appendActionMessage('Folder Markdown summary failed: vault API unavailable.');
        setText(status, 'Folder Markdown summary failed.');
        return;
      }
      if (!api.chat || typeof api.chat.send !== 'function') {
        appendActionMessage('Folder Markdown summary failed: chat provider API unavailable.');
        setText(status, 'Folder Markdown summary failed.');
        return;
      }

      const scope = getFolderScopeOptions().normalizeFolderScopeOptions(scopeOptions);
      setText(status, 'Preparing folder Markdown summary: ' + snapshot.path);
      const pending = appendActionMessage('Summarizing Markdown files in selected scope: ' + snapshot.path, [], { pending: true });
      try {
        const limits = await getCurrentLimits();
        const listed = await scopeReader.listScopedMarkdownFiles({
          vaultApi: api.vault,
          folderController: getFolderController(),
          path: snapshot.path,
          scopeOptions: scope,
          limits
        });
        if (!listed || listed.ok !== true) {
          removeNode(pending);
          appendActionMessage((listed && listed.message) || 'Folder Markdown summary failed.');
          setText(status, 'Folder Markdown summary failed.');
          return;
        }

        const files = [];
        for (const filePath of listed.files) {
          const read = await api.vault.readMarkdown(filePath);
          if (read && read.ok) files.push({ path: read.path, content: read.content });
        }

        const request = summary.buildFolderMarkdownSummaryMessages({
          folderPath: snapshot.path,
          scope,
          files,
          limits: Object.assign({}, limits, { maxAnalysisFiles: scope.maxFiles })
        });
        if (!request.ok) {
          removeNode(pending);
          appendActionMessage('Folder Markdown summary unavailable: ' + (request.message || 'No Markdown files in the selected scope.'));
          setText(status, 'Folder Markdown summary unavailable.');
          return;
        }

        const result = await api.chat.send({ messages: request.messages });
        removeNode(pending);
        if (result && result.ok && result.message && result.message.content) {
          appendActionMessage(getSummaryResponsePresentation().formatFolderSummaryResponse({
            folderPath: snapshot.path,
            scope: request.scope,
            includedFileCount: request.files.length,
            limitedByFileCount: request.limitedByFileCount,
            content: result.message.content
          }), [], { allowSave: true, suggestedTitle: buildSummaryTitle('dir', snapshot.path), responseSubfolder: 'Summaries', originAction: 'summarize_folder', presentation: 'summary' });
          setText(status, 'Folder Markdown summarized: ' + snapshot.path);
          return;
        }
        appendActionMessage('Folder Markdown summary failed: ' + ((result && result.error) || 'No response.'));
        setText(status, 'Folder Markdown summary failed.');
      } catch (error) {
        removeNode(pending);
        appendActionMessage('Folder Markdown summary failed: ' + ((error && error.message) || 'request failed'));
        setText(status, 'Folder Markdown summary failed.');
      }
    }
    async function getCurrentLimits() {
      if (!api.settings || typeof api.settings.get !== 'function') return {};
      const result = await api.settings.get();
      return result && result.limits ? result.limits : {};
    }

    function renderFolderContextForm(snapshot, host) {
      renderFolderScopeForm(snapshot, host, {
        defaultKey: 'folderContext',
        actionId: 'folder.useAsContext',
        title: 'Context scope',
        submitLabel: 'Add to context',
        onSubmit: (scopeOptions) => addFolderContextSnapshot(snapshot, scopeOptions)
      });
    }

    function renderFolderInspectForm(snapshot, host) {
      renderFolderScopeForm(snapshot, host, {
        actionId: 'folder.inspect',
        title: 'Inspection scope',
        submitLabel: 'Inspect',
        onSubmit: (scopeOptions) => inspectFolder(snapshot, scopeOptions)
      });
    }

    async function renderFolderScopeForm(snapshot, host, config) {
      onRequestPanelExpand();
      removeOpenActionForms();
      try {
        const form = getFolderScopeForm().mountFolderScopeForm({
          host: host || root,
          actionId: config.actionId,
          title: config.title,
          submitLabel: config.submitLabel,
          initialOptions: await getFolderActionInitialOptions(config.defaultKey),
          onSubmit: config.onSubmit
        });
        if (form) setText(status, 'Choose ' + String(config.title || 'folder').toLowerCase() + ': ' + snapshot.path);
      } catch (error) {
        setText(status, 'Could not load action defaults.');
      }
    }

    async function getFolderActionInitialOptions(defaultKey) {
      const fallback = getFolderScopeOptions().normalizeFolderScopeOptions({});
      if (!defaultKey || !api.settings || typeof api.settings.get !== 'function') return fallback;
      const settings = await api.settings.get();
      return getActionDefaults().getFolderActionDefault(settings && settings.actionDefaults, defaultKey);
    }

    async function addFolderContextSnapshot(snapshot, scopeOptions) {
      const action = getFolderContextSnapshotAction();
      if (!action || typeof action.buildFolderContextSnapshot !== 'function') {
        appendActionMessage('Folder context failed: snapshot action unavailable.');
        setText(status, 'Folder context failed.');
        return;
      }
      setText(status, 'Building folder context: ' + snapshot.path);
      const result = await action.buildFolderContextSnapshot({
        vaultApi: api.vault,
        folderController: getFolderController(),
        path: snapshot.path,
        scopeOptions,
        limits: await getCurrentLimits()
      });
      if (!result || result.ok !== true) {
        appendActionMessage((result && result.message) || 'Folder context failed.');
        setText(status, 'Folder context failed.');
        return;
      }
      contextState.addContextItem(result.item);
      setText(status, 'Added folder snapshot to Context Basket: ' + snapshot.path + ' (' + String(result.item.files.length) + ' Markdown notes).');
    }
    async function inspectFolder(snapshot, scopeOptions) {
      if (!api.vault || typeof api.vault.listFolder !== 'function') {
        appendActionMessage('Folder inspection failed: vault API unavailable.');
        setText(status, 'Folder inspection failed.');
        return;
      }

      const options = getFolderScopeOptions().normalizeFolderScopeOptions(scopeOptions);
      if (options.scope === 'subfolders') {
        await inspectFolderTree(snapshot, options);
        return;
      }

      setText(status, 'Inspecting folder: ' + snapshot.path);
      const result = await api.vault.listFolder(snapshot.path);
      if (!result || !result.ok) {
        appendActionMessage('Folder inspection failed: ' + ((result && (result.message || result.code)) || 'Could not list folder.'));
        setText(status, 'Folder inspection failed.');
        return;
      }
      appendActionMessage(getFolderInspectAction().buildFolderInspectionReport({
        path: snapshot.path,
        entries: result.entries
      }), [{
        label: 'Check whole tree',
        onClick: () => inspectFolderTree(snapshot, options)
      }]);
      setText(status, 'Folder inspected: ' + snapshot.path);
    }

    async function inspectFolderTree(snapshot, scopeOptions) {
      const controller = getFolderController();
      if (!api.vault || !controller || typeof controller.listFolderTree !== 'function') {
        appendActionMessage('Folder tree inspection failed: folder controller unavailable.');
        setText(status, 'Folder tree inspection failed.');
        return;
      }

      const options = getFolderScopeOptions().normalizeFolderScopeOptions(scopeOptions);
      setText(status, 'Inspecting folder tree: ' + snapshot.path);
      const target = {
        kind: 'folder',
        path: snapshot.path,
        readAllowed: true,
        selectionId: snapshot.selectionId || 0,
        recursive: true,
        maxDepth: options.maxDepth,
        limits: { maxListedFiles: options.maxFiles }
      };
      const result = await controller.listFolderTree(api.vault, target);
      appendActionMessage(getFolderInspectAction().buildFolderTreeInspectionReport({
        rootPath: snapshot.path,
        folders: result && result.folders,
        depthLimitReached: result && result.depthLimitReached,
        fileLimitReached: result && result.fileLimitReached,
        folderLimitReached: result && result.truncated
      }));
      setText(status, result && result.ok ? 'Folder tree inspected: ' + snapshot.path : 'Folder tree inspection failed.');
    }
    function appendActionMessage(content, actions, options) {
      options = options || {};
      const chatLog = app.querySelector('#chat-log');
      if (!chatLog) return;
      if (typeof window !== 'undefined' && window.VincariosChat && typeof window.VincariosChat.appendMessage === 'function') {
        const message = window.VincariosChat.appendMessage(chatLog, 'assistant', content, { allowSave: options.allowSave === true, actions: actions || [], reviewBasket: reviewBasket, status: status, suggestedTitle: options.suggestedTitle, responseSubfolder: options.responseSubfolder, originAction: options.originAction, presentation: options.presentation });
        if (options.pending && message) {
          message.classList.add('chat-message-pending');
          message.setAttribute('aria-busy', 'true');
        }
        return message;
      }
      const message = document.createElement('article');
      message.className = 'chat-message chat-message-assistant';
      if (options.pending) {
        message.classList.add('chat-message-pending');
        message.setAttribute('aria-busy', 'true');
      }
      const label = document.createElement('div');
      label.className = 'chat-message-label';
      label.textContent = 'vincarios';
      const body = document.createElement('div');
      body.className = 'chat-message-body';
      body.textContent = content;
      message.appendChild(label);
      message.appendChild(body);
      const actionList = actions || [];
      if (actionList.length) {
        const actionWrapper = document.createElement('div');
        actionWrapper.className = 'chat-message-actions';
        actionList.forEach((action) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'chat-message-action-button';
          button.textContent = action.label;
          button.addEventListener('click', action.onClick);
          actionWrapper.appendChild(button);
        });
        message.appendChild(actionWrapper);
      }
      chatLog.appendChild(message);
      chatLog.scrollTop = chatLog.scrollHeight;
      return message;
    }

    function removeNode(node) {
      if (node && typeof node.remove === 'function') node.remove();
    }

    function classifyProviderFailure(result) {
      if (!result) return 'Provider returned no result.';
      if (result.canceled === true || /cancell?ed/i.test(String(result.error || ''))) return 'Provider canceled the request.';
      if (result.ok !== true) return 'Provider failed: ' + String(result.error || 'Unknown provider error.');
      return 'Provider returned an empty response.';
    }

    function classifyThrownProviderError(error) {
      const message = String((error && error.message) || 'request failed');
      return /cancell?ed/i.test(message) ? 'Provider canceled the request.' : 'Provider request threw: ' + message;
    }

    function formatUpdateProposalDiagnostics(request, stage, detail) {
      const diagnostics = request && request.diagnostics ? request.diagnostics : {};
      return [
        'Update proposal failed [' + stage + ']: ' + detail,
        '',
        'Diagnostics:',
        '- Target: ' + String(diagnostics.path || (request && request.path) || 'unknown'),
        '- Current chars: ' + String(diagnostics.currentContentChars ?? 'unknown'),
        '- Sent chars: ' + String(diagnostics.sentContentChars ?? 'unknown'),
        '- Instruction chars: ' + String(diagnostics.instructionChars ?? 'unknown'),
        '- Context truncated: ' + (diagnostics.truncated ? 'yes' : 'no')
      ].join('\n');
    }

    function getPermissionText() {
      if (typeof window !== 'undefined' && window.VincariosSelectionActionPermissionText) return window.VincariosSelectionActionPermissionText;
      if (typeof require === 'function') return require('./permissionText');
      return {
        missingPermissionMessage(options) {
          const path = options && options.path ? options.path : '';
          if (options && options.actionId === 'file.proposeUpdate') return 'Please enable R and W for this file before proposing a content update: ' + path;
          if (options && options.actionId === 'file.suggestTags') return 'Please enable R and W for this file before suggesting tag updates: ' + path;
          const shortcut = options && options.requiredPermission === 'read_write' ? 'R and W' : options && options.requiredPermission === 'write' ? 'W' : 'R';
          const targetKind = options && options.targetKind === 'folder' ? 'folder' : 'file';
          return 'Please enable ' + shortcut + ' for this ' + targetKind + ': ' + path;
        }
      };
    }

    function normalizePath(value) {
      return getVaultPathApi().normalizeRelativePath(value);
    }

    function getVaultPathApi() {
      if (typeof window !== 'undefined' && window.VincariosVaultPath) return window.VincariosVaultPath;
      if (typeof require === 'function') return require('../path/vaultPath');
      throw new Error('Vault path contract unavailable.');
    }

    function formatSimilarNotesSummary(targetPath, result, targetContent) {
      const presentation = getSimilarNotesPresentation();
      if (presentation && typeof presentation.formatSimilarNotesSummary === 'function') {
        return presentation.formatSimilarNotesSummary(targetPath, result, targetContent);
      }
      if (!result || !result.ok) return 'Similar notes unavailable for: ' + targetPath + '\n\n' + ((result && (result.message || result.code)) || 'Unknown error.');
      const count = Array.isArray(result.candidates) ? result.candidates.length : 0;
      return 'Similar notes for: ' + targetPath + '\n\n' + count + ' matches found. Details are shown in Suggestions.';
    }

    function addSimilarNotesSuggestionGroup(targetPath, result, targetContent) {
      const presentation = getSimilarNotesPresentation();
      const candidates = presentation && typeof presentation.normalizeSimilarNotesCandidates === 'function'
        ? presentation.normalizeSimilarNotesCandidates(result && result.candidates)
        : [];
      const mode = result && result.mode ? result.mode : 'mixed';
      const threshold = Number.isFinite(Number(result && result.minimumScorePercent)) ? Number(result.minimumScorePercent) : 0;
      const lowContent = presentation && typeof presentation.isLowContent === 'function' && presentation.isLowContent(targetContent);
      const items = candidates.map((candidate, index) => ({
        id: normalizePath(candidate.path) || 'candidate-' + String(index + 1),
        title: candidate.path,
        path: candidate.path,
        kind: 'similar_note',
        scoreLabel: candidate.scoreText + ' ' + candidate.scoreLabel,
        scorePercent: candidate.scorePercent,
        scoreTone: scoreToneForPercent(candidate.scorePercent),
        relationshipLabel: candidate.relationshipLabel,
        detail: [
          candidate.path,
          '',
          candidate.relationshipLabel,
          candidate.scoreText + ' ' + candidate.scoreLabel,
          candidate.reasonText,
          candidate.contentScoreText + ' | ' + candidate.metadataScoreText
        ].join('\n'),
        data: candidate
      }));
      if (!items.length) return false;
      suggestionState.addGroup({
        id: 'similar-notes:' + normalizePath(targetPath),
        title: 'Similar notes for: ' + targetPath,
        source: 'file.findSimilar',
        summary: 'Mode: ' + mode + ' | Minimum: ' + threshold + '%' + (lowContent ? ' | Low content target' : ''),
        items
      });
      return true;
    }

    function scoreToneForPercent(value) {
      const score = Number(value);
      if (!Number.isFinite(score)) return 'neutral';
      if (score >= 90) return 'green';
      if (score >= 80) return 'yellow';
      if (score >= 60) return 'orange';
      return 'red';
    }

    function formatFolderListing(folderPath, result) {
      if (!result || !result.ok) return 'Folder listing failed: ' + ((result && (result.message || result.code)) || 'Unknown error.');
      const entries = Array.isArray(result.entries) ? result.entries : [];
      if (!entries.length) return 'Folder listed: ' + folderPath + '\n\nNo supported Markdown folders or files found.';
      return 'Folder listed: ' + folderPath + '\n\n' + entries.map((entry) => (entry.name || entry.path || 'Unnamed') + (entry.kind === 'folder' ? '/' : '')).join('\n');
    }

    return Object.freeze({
      closeOpenForms() {
        removeOpenActionForms();
      },
      destroy() {
        if (typeof unsubscribe === 'function') unsubscribe();
        app.removeEventListener('vincarios:files-collapse-change', onFilesCollapseChanged);
        app.removeEventListener('vincarios:embedding-similar-defaults-change', onSimilarDefaultsChanged);
      }
    });
  }

  function formatFolderAnalysis(folderPath, result) {
    if (!result || !result.ok) return 'Folder analysis failed: ' + ((result && (result.message || result.code)) || 'Unknown error.');
    const entries = Array.isArray(result.entries) ? result.entries : [];
    const folders = entries.filter((entry) => entry.kind === 'folder');
    const markdownFiles = entries.filter(isMarkdownEntry);
    const otherEntries = entries.filter((entry) => !folders.includes(entry) && !markdownFiles.includes(entry));
    const names = entries.map((entry) => String(entry.name || entry.path || 'Unnamed'));
    const samples = names.slice(0, 8);

    return [
      'Folder analysis (structure only): ' + folderPath,
      '',
      'This is based on names and entry types only. No Markdown file contents were read.',
      '',
      '- Folders: ' + folders.length,
      '- Markdown files: ' + markdownFiles.length,
      '- Other supported entries: ' + otherEntries.length,
      '',
      samples.length ? 'Name samples:\n' + samples.map((name) => '- ' + name).join('\n') : 'Name samples: none',
      '',
      'Use a file-specific action or add files to context before asking for content-level analysis.'
    ].join('\n');
  }
  function buildSummaryTitle(kind, path) {
    return 'Summary - ' + normalizeSummaryKind(kind) + ' - ' + deriveTargetName(kind, path) + ' - ' + formatDateForTitle(new Date());
  }

  function normalizeSummaryKind(kind) {
    const value = String(kind || '').toLowerCase();
    if (value === 'md') return 'MD';
    if (value === 'dir') return 'DIR';
    return value.toUpperCase() || 'ITEM';
  }

  function deriveTargetName(kind, path) {
    const parts = String(path || '').split(/[\\/]+/).filter(Boolean);
    const base = parts.length ? parts[parts.length - 1] : 'Selection';
    if (kind === 'file') return base.replace(/\.(md|markdown)$/i, '') || 'File';
    return base || 'Folder';
  }

  function formatDateForTitle(date) {
    const safeDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
    const year = safeDate.getFullYear();
    const month = String(safeDate.getMonth() + 1).padStart(2, '0');
    const day = String(safeDate.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }
  function isMarkdownEntry(entry) {
    if (!entry) return false;
    if (entry.kind === 'markdown') return true;
    if (entry.kind !== 'file') return false;
    return /\.(md|markdown)$/i.test(String(entry.name || entry.path || ''));
  }


  function getTagCandidateAction() {
    if (typeof window !== 'undefined' && window.VincariosTagCandidateAction) return window.VincariosTagCandidateAction;
    if (typeof module !== 'undefined' && module.exports) return require('./tagCandidateAction');
    return null;
  }

  function getSimilarNotesPresentation() {
    if (typeof window !== 'undefined' && window.VincariosSimilarNotesPresentation) return window.VincariosSimilarNotesPresentation;
    if (typeof module !== 'undefined' && module.exports) return require('./similarNotesPresentation');
    return null;
  }

  function getRegistry() {
    if (typeof window !== 'undefined' && window.VincariosSelectionActionRegistry) return window.VincariosSelectionActionRegistry;
    if (typeof module !== 'undefined' && module.exports) return require('./actionRegistry');
    throw new Error('vincarios selection action registry is not available.');
  }

  function getCategories() {
    if (typeof window !== 'undefined' && window.VincariosSelectionActionCategories) return window.VincariosSelectionActionCategories;
    if (typeof module !== 'undefined' && module.exports) return require('./actionCategories');
    throw new Error('vincarios selection action categories are not available.');
  }

  function getIconRenderer() {
    return (typeof window !== 'undefined' && window.VincariosIconRenderer) ? window.VincariosIconRenderer : null;
  }

  function getSummaryResponsePresentation() {
    if (typeof window !== 'undefined' && window.VincariosSummaryResponsePresentation) return window.VincariosSummaryResponsePresentation;
    if (typeof module !== 'undefined' && module.exports) return require('./summaryResponsePresentation');
    throw new Error('vincarios summary response presentation is not available.');
  }
  function getFileSummaryAction() {
    if (typeof window !== 'undefined' && window.VincariosFileSummaryAction) return window.VincariosFileSummaryAction;
    if (typeof module !== 'undefined' && module.exports) return require('./fileSummaryAction');
    return null;
  }

  function getSelectedUpdateProposalAction() {
    if (typeof window !== 'undefined' && window.VincariosSelectedUpdateProposalAction) return window.VincariosSelectedUpdateProposalAction;
    if (typeof module !== 'undefined' && module.exports) return require('../chat/selectedUpdateProposalAction');
    return null;
  }

  function getFolderSummaryAction() {
    if (typeof window !== 'undefined' && window.VincariosFolderSummaryAction) return window.VincariosFolderSummaryAction;
    if (typeof module !== 'undefined' && module.exports) return require('./folderSummaryAction');
    return null;
  }

  function getFolderInspectAction() {
    if (typeof window !== 'undefined' && window.VincariosFolderInspectAction) return window.VincariosFolderInspectAction;
    if (typeof module !== 'undefined' && module.exports) return require('./folderInspectAction');
    throw new Error('vincarios folder inspection API is not available.');
  }

  function getActionDefaults() {
    if (typeof window !== 'undefined' && window.VincariosActionDefaults) return window.VincariosActionDefaults;
    if (typeof module !== 'undefined' && module.exports) return require('../../shared/settings/actionDefaults');
    throw new Error('vincarios action defaults API is not available.');
  }

  function getFolderScopeOptions() {
    if (typeof window !== 'undefined' && window.VincariosFolderScopeOptions) return window.VincariosFolderScopeOptions;
    if (typeof module !== 'undefined' && module.exports) return require('./folderScopeOptions');
    throw new Error('vincarios folder scope options API is not available.');
  }

  function getFolderScopeForm() {
    if (typeof window !== 'undefined' && window.VincariosFolderScopeForm) return window.VincariosFolderScopeForm;
    if (typeof module !== 'undefined' && module.exports) return require('./folderScopeForm');
    throw new Error('vincarios folder scope form API is not available.');
  }

  function getFolderContextSnapshotAction() {
    if (typeof window !== 'undefined' && window.VincariosFolderContextSnapshotAction) return window.VincariosFolderContextSnapshotAction;
    if (typeof module !== 'undefined' && module.exports) return require('./folderContextSnapshotAction');
    return null;
  }

  function getFolderMarkdownScopeReader() {
    if (typeof window !== 'undefined' && window.VincariosFolderMarkdownScopeReader) return window.VincariosFolderMarkdownScopeReader;
    if (typeof module !== 'undefined' && module.exports) return require('./folderMarkdownScopeReader');
    return null;
  }
  function positiveIntegerOrDefault(value, fallback) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return Math.floor(number);
    return fallback;
  }

  function getFolderController() {
    if (typeof window !== 'undefined' && window.VincariosFolderContextController) return window.VincariosFolderContextController;
    if (typeof module !== 'undefined' && module.exports) return require('../context/folderContextController');
    return null;
  }

  function setText(node, value) {
    if (node) node.textContent = value;
  }

  const api = { mountSelectionActions, formatFolderAnalysis };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosSelectionActions = Object.freeze(api);
})();
