(function() {
  'use strict';

  function mountSelectionActions(options) {
    options = options || {};
    const api = options.api || {};
    const app = options.app;
    const contextState = options.contextState;
    const reviewBasket = options.reviewBasket || null;
    const suggestionState = options.suggestionState || null;
    const status = options.status || null;
    let similarNotesSessionOptions = null;
    if (!app || !contextState || typeof contextState.snapshot !== 'function') return null;

    const root = app.querySelector('.selection-actions-pane');
    if (!root) return null;

    const unsubscribe = typeof contextState.subscribe === 'function'
      ? contextState.subscribe(render)
      : null;

    render(contextState.snapshot());

    function render(snapshot) {
      root.innerHTML = '';
      const header = document.createElement('div');
      header.className = 'selection-actions-header';
      header.textContent = 'Selection Actions';
      root.appendChild(header);

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

      actions.forEach((action) => root.appendChild(createActionRow(action, snapshot)));
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
      button.className = 'selection-action-button is-' + action.category;
      button.dataset.actionId = action.id;
      button.dataset.actionCategory = action.category;
      if (action.future) button.dataset.futureSlot = action.id;
      button.disabled = action.enabled !== true;
      if (action.softDisabled) {
        button.classList.add('is-soft-disabled');
        button.setAttribute('aria-disabled', 'true');
      }
      button.title = action.reason || (action.future ? 'Planned V1 action.' : action.label);

      const category = getCategories().getActionCategory(action.category);
      const tag = document.createElement('span');
      tag.className = 'selection-action-category';
      tag.textContent = category.label;

      const label = document.createElement('span');
      label.className = 'selection-action-label';
      label.textContent = action.label;

      button.appendChild(tag);
      button.appendChild(label);
      if (action.softDisabled) renderSoftDisabledLock(button);
      button.addEventListener('click', () => runAction(action, snapshot, host));
      return button;
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
        contextState.addContextItem({ kind: 'folder', path: snapshot.path });
        setText(status, 'Added folder to Context Basket: ' + snapshot.path);
        return;
      }
      if (action.id === 'folder.listCurrent') {
        listFolder(snapshot);
        return;
      }
      if (action.id === 'folder.analyze') {
        analyzeFolder(snapshot);
        return;
      }
      if (action.id === 'folder.summarizeMarkdown') {
        summarizeFolderMarkdown(snapshot);
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

      const request = summary.buildFileSummaryMessages(snapshot);
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
          appendActionMessage(result.message.content, [], { allowSave: true, suggestedTitle: buildSummaryTitle('md', request.path), responseSubfolder: 'Summaries', originAction: 'summarize_file' });
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
        appendActionMessage('No tag candidates found: ' + (result.message || 'No useful missing tags.'));
        setText(status, 'No tag candidates found.');
        return;
      }
      suggestionState.addGroup(result.group);
      appendActionMessage('Tag candidates added to Suggestions.');
      setText(status, 'Tag candidates added: ' + snapshot.path);
    }

    async function renderSimilarNotesForm(snapshot, host) {
      removeOpenActionForms();
      const defaults = await loadSimilarNotesDefaults();
      const form = document.createElement('form');
      form.className = 'selection-action-form';
      form.dataset.actionId = 'file.findSimilar';
      form.innerHTML = [
        '<label class="selection-action-form-label">Find similar notes</label>',
        '<div class="selection-action-grid">',
        '  <label><span>Mode</span><select data-similar-mode><option value="mixed">Mixed</option><option value="content">Content</option><option value="metadata">Metadata</option></select></label>',
        '  <label><span>Minimum match %</span><input type="number" min="0" max="100" step="1" data-similar-min></label>',
        '  <label class="selection-action-range"><span>Content / metadata weight <strong data-similar-weight-display></strong></span><input type="range" min="0" max="100" step="5" data-similar-content-weight></label>',
        '  <label><span>Max results</span><input type="number" min="1" step="1" data-similar-limit></label>',
        '  <label class="selection-action-check"><input type="checkbox" data-similar-refresh-index><span>Refresh index first</span></label>',
        '</div>',
        '<div class="selection-action-form-actions">',
        '  <button type="submit">Find</button>',
        '  <button type="button" data-similar-cancel>Cancel</button>',
        '</div>'
      ].join('');
      const values = similarNotesSessionOptions || defaults;
      form.querySelector('[data-similar-min]').value = String(values.minimumScorePercent);
      form.querySelector('[data-similar-limit]').value = String(values.maxResults);
      form.querySelector('[data-similar-mode]').value = values.mode;
      form.querySelector('[data-similar-content-weight]').value = String(values.contentWeight);
      wireSimilarWeightSlider(form, values.contentWeight);
      form.querySelector('[data-similar-refresh-index]').checked = values.refreshIndex === true;
      form.querySelector('[data-similar-cancel]').addEventListener('click', () => form.remove());
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const contentWeight = normalizePercent(form.querySelector('[data-similar-content-weight]').value, 80);
        const options = {
          mode: form.querySelector('[data-similar-mode]').value,
          minimumScorePercent: form.querySelector('[data-similar-min]').value,
          contentWeight,
          metadataWeight: 100 - contentWeight,
          limit: form.querySelector('[data-similar-limit]').value,
          refreshIndex: form.querySelector('[data-similar-refresh-index]').checked
        };
        similarNotesSessionOptions = Object.assign({}, options, { maxResults: options.limit });
        form.remove();
        findSimilarNotes(snapshot, options);
      });
      appendActionForm(host, form);
      const submit = form.querySelector('button[type="submit"]');
      if (submit) submit.focus();
    }

    function appendActionForm(host, form) {
      const target = host && typeof host.appendChild === 'function' ? host : root;
      target.appendChild(form);
    }

    function removeOpenActionForms() {
      Array.from(root.querySelectorAll('.selection-action-form')).forEach(removeNode);
    }
    function normalizePercent(value, fallback) {
      const number = Number(value);
      if (!Number.isFinite(number)) return fallback;
      return Math.max(0, Math.min(100, Math.floor(number)));
    }

    function wireSimilarWeightSlider(form, value) {
      const slider = form.querySelector('[data-similar-content-weight]');
      const display = form.querySelector('[data-similar-weight-display]');
      function update() {
        const content = normalizePercent(slider && slider.value, value);
        if (display) display.textContent = content + '% content / ' + (100 - content) + '% metadata';
      }
      if (slider) slider.addEventListener('input', update);
      update();
    }

    async function loadSimilarNotesDefaults() {
      const fallback = { minimumScorePercent: 65, maxResults: 8, mode: 'mixed', contentWeight: 80, metadataWeight: 20 };
      if (!api.settings || typeof api.settings.get !== 'function') return fallback;
      try {
        const settings = await api.settings.get();
        const similarNotes = settings && settings.embeddings && settings.embeddings.similarNotes ? settings.embeddings.similarNotes : {};
        return {
          minimumScorePercent: similarNotes.minimumScorePercent || fallback.minimumScorePercent,
          maxResults: similarNotes.maxResults || fallback.maxResults,
          mode: similarNotes.mode || fallback.mode,
          contentWeight: similarNotes.contentWeight || fallback.contentWeight,
          metadataWeight: similarNotes.metadataWeight || fallback.metadataWeight
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
      removeOpenActionForms();

      const form = document.createElement('form');
      form.className = 'selection-action-form';
      form.dataset.actionId = 'file.proposeUpdate';

      const label = document.createElement('label');
      label.className = 'selection-action-form-label';
      label.textContent = 'Content update instruction';

      const textarea = document.createElement('textarea');
      textarea.rows = 4;
      textarea.placeholder = 'Describe the content change for this note. Rename/move are not part of this action...';

      const actions = document.createElement('div');
      actions.className = 'selection-action-form-actions';

      const submit = document.createElement('button');
      submit.type = 'submit';
      submit.textContent = 'Create proposal';

      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.textContent = 'Cancel';
      cancel.addEventListener('click', () => {
        if (!confirmDiscardActionForm(textarea, 'Discard update instruction?')) return;
        form.remove();
      });

      actions.appendChild(submit);
      actions.appendChild(cancel);
      form.appendChild(label);
      form.appendChild(textarea);
      form.appendChild(actions);
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const instruction = textarea.value.trim();
        if (!instruction) {
          setText(status, 'Update proposal needs an instruction.');
          textarea.focus();
          return;
        }
        form.remove();
        proposeFileUpdate(snapshot, instruction);
      });

      appendActionForm(host, form);
      textarea.focus();
      setText(status, 'Describe update for: ' + snapshot.path);
    }

    function confirmDiscardActionForm(input, message) {
      if (!input || !String(input.value || '').trim()) return true;
      if (typeof window === 'undefined' || typeof window.confirm !== 'function') return false;
      return window.confirm(message || 'Discard unsaved changes?');
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
    async function summarizeFolderMarkdown(snapshot) {
      const summary = getFolderSummaryAction();
      if (!summary || typeof summary.buildFolderMarkdownSummaryMessages !== 'function') {
        appendActionMessage('Folder Markdown summary failed: summary action module unavailable.');
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

      setText(status, 'Preparing folder Markdown summary: ' + snapshot.path);
      const pending = appendActionMessage('Summarizing Markdown files in: ' + snapshot.path, [], { pending: true });
      try {
        const folderResult = await api.vault.listFolder(snapshot.path);
        if (!folderResult || !folderResult.ok) {
          removeNode(pending);
          appendActionMessage('Folder Markdown summary failed: ' + ((folderResult && (folderResult.message || folderResult.code)) || 'Could not list folder.'));
          setText(status, 'Folder Markdown summary failed.');
          return;
        }

        const limits = await getCurrentLimits();
        const entries = Array.isArray(folderResult.entries) ? folderResult.entries : [];
        const markdownEntries = entries.filter(isMarkdownEntry).slice(0, positiveIntegerOrDefault(limits.maxAnalysisFiles, 30));
        const files = [];
        for (const entry of markdownEntries) {
          const read = await api.vault.readMarkdown(entry.path);
          if (read && read.ok) files.push({ path: read.path, content: read.content });
        }

        const request = summary.buildFolderMarkdownSummaryMessages({ folderPath: snapshot.path, files, limits });
        if (!request.ok) {
          removeNode(pending);
          appendActionMessage('Folder Markdown summary unavailable: ' + (request.message || 'No direct Markdown files.'));
          setText(status, 'Folder Markdown summary unavailable.');
          return;
        }

        const result = await api.chat.send({ messages: request.messages });
        removeNode(pending);
        if (result && result.ok && result.message && result.message.content) {
          appendActionMessage(result.message.content, [], { allowSave: true, suggestedTitle: buildSummaryTitle('dir', snapshot.path), responseSubfolder: 'Summaries', originAction: 'summarize_folder' });
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

    async function listFolder(snapshot) {
      if (!api.vault || typeof api.vault.listFolder !== 'function') {
        appendActionMessage('Folder listing failed: vault API unavailable.');
        setText(status, 'Folder listing failed.');
        return;
      }
      setText(status, 'Listing folder: ' + snapshot.path);
      const result = await api.vault.listFolder(snapshot.path);
      appendActionMessage(formatFolderListing(snapshot.path, result), [{
        label: 'Check whole tree',
        onClick: () => listFolderTree(snapshot)
      }]);
      setText(status, result && result.ok ? 'Folder listed: ' + snapshot.path : 'Folder listing failed.');
    }

    async function analyzeFolder(snapshot) {
      if (!api.vault || typeof api.vault.listFolder !== 'function') {
        appendActionMessage('Folder analysis failed: vault API unavailable.');
        setText(status, 'Folder analysis failed.');
        return;
      }
      setText(status, 'Analyzing folder structure: ' + snapshot.path);
      const result = await api.vault.listFolder(snapshot.path);
      appendActionMessage(formatFolderAnalysis(snapshot.path, result));
      setText(status, result && result.ok ? 'Folder analyzed: ' + snapshot.path : 'Folder analysis failed.');
    }

    async function listFolderTree(snapshot) {
      const controller = getFolderController();
      if (!api.vault || !controller || typeof controller.listFolderTree !== 'function' || typeof controller.formatRecursiveFolderListing !== 'function') {
        appendActionMessage('Recursive folder listing failed: folder controller unavailable.');
        setText(status, 'Recursive folder listing failed.');
        return;
      }
      setText(status, 'Listing whole tree: ' + snapshot.path);
      const target = {
        kind: 'folder',
        path: snapshot.path,
        readAllowed: true,
        selectionId: snapshot.selectionId || 0,
        recursive: true
      };
      const result = await controller.listFolderTree(api.vault, target);
      appendActionMessage(controller.formatRecursiveFolderListing(target, result));
      setText(status, 'Whole tree listed: ' + snapshot.path);
    }

    function appendActionMessage(content, actions, options) {
      options = options || {};
      const chatLog = app.querySelector('#chat-log');
      if (!chatLog) return;
      if (typeof window !== 'undefined' && window.ZeusChat && typeof window.ZeusChat.appendMessage === 'function') {
        const message = window.ZeusChat.appendMessage(chatLog, 'assistant', content, { allowSave: options.allowSave === true, actions: actions || [], reviewBasket: reviewBasket, status: status, suggestedTitle: options.suggestedTitle, responseSubfolder: options.responseSubfolder, originAction: options.originAction });
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
      label.textContent = 'ZEUS';
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
      if (typeof window !== 'undefined' && window.ZeusSelectionActionPermissionText) return window.ZeusSelectionActionPermissionText;
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
      return String(value || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/').trim();
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
        detail: [
          candidate.path,
          '',
          candidate.scoreText + ' ' + candidate.scoreLabel,
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
      destroy() {
        if (typeof unsubscribe === 'function') unsubscribe();
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
    if (typeof window !== 'undefined' && window.ZeusTagCandidateAction) return window.ZeusTagCandidateAction;
    if (typeof module !== 'undefined' && module.exports) return require('./tagCandidateAction');
    return null;
  }

  function getSimilarNotesPresentation() {
    if (typeof window !== 'undefined' && window.ZeusSimilarNotesPresentation) return window.ZeusSimilarNotesPresentation;
    if (typeof module !== 'undefined' && module.exports) return require('./similarNotesPresentation');
    return null;
  }

  function getRegistry() {
    if (typeof window !== 'undefined' && window.ZeusSelectionActionRegistry) return window.ZeusSelectionActionRegistry;
    if (typeof module !== 'undefined' && module.exports) return require('./actionRegistry');
    throw new Error('ZEUS selection action registry is not available.');
  }

  function getCategories() {
    if (typeof window !== 'undefined' && window.ZeusSelectionActionCategories) return window.ZeusSelectionActionCategories;
    if (typeof module !== 'undefined' && module.exports) return require('./actionCategories');
    throw new Error('ZEUS selection action categories are not available.');
  }

  function getIconRenderer() {
    return (typeof window !== 'undefined' && window.ZeusIconRenderer) ? window.ZeusIconRenderer : null;
  }

  function getFileSummaryAction() {
    if (typeof window !== 'undefined' && window.ZeusFileSummaryAction) return window.ZeusFileSummaryAction;
    if (typeof module !== 'undefined' && module.exports) return require('./fileSummaryAction');
    return null;
  }

  function getSelectedUpdateProposalAction() {
    if (typeof window !== 'undefined' && window.ZeusSelectedUpdateProposalAction) return window.ZeusSelectedUpdateProposalAction;
    if (typeof module !== 'undefined' && module.exports) return require('../chat/selectedUpdateProposalAction');
    return null;
  }

  function getFolderSummaryAction() {
    if (typeof window !== 'undefined' && window.ZeusFolderSummaryAction) return window.ZeusFolderSummaryAction;
    if (typeof module !== 'undefined' && module.exports) return require('./folderSummaryAction');
    return null;
  }

  function positiveIntegerOrDefault(value, fallback) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return Math.floor(number);
    return fallback;
  }

  function getFolderController() {
    if (typeof window !== 'undefined' && window.ZeusFolderContextController) return window.ZeusFolderContextController;
    if (typeof module !== 'undefined' && module.exports) return require('../context/folderContextController');
    return null;
  }

  function setText(node, value) {
    if (node) node.textContent = value;
  }

  const api = { mountSelectionActions, formatFolderAnalysis };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusSelectionActions = Object.freeze(api);
})();
