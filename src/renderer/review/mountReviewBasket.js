(function() {
  'use strict';

  function mountReviewBasket(options) {
    options = options || {};
    const app = options.app;
    const status = options.status;
    const executeProposal = typeof options.executeProposal === 'function' ? options.executeProposal : null;
    const root = app ? app.querySelector('#review-basket-items') : null;
    const executeButton = app ? app.querySelector('#review-execute') : null;
    const clearButton = app ? app.querySelector('#review-clear') : null;
    const clearDoneButton = app ? app.querySelector('#review-clear-done') : null;
    const countBadge = app ? app.querySelector('#review-basket-count') : null;
    let isExecuting = false;

    if (!window.VitruviosReviewBasketState || !root) return null;

    const state = window.VitruviosReviewBasketState.createReviewBasketState({
      onChange(snapshot) {
        renderReviewBasket(root, snapshot, state);
        updateCountBadge(countBadge, snapshot && snapshot.items);
        updateExecuteButton(executeButton, state, isExecuting);
        updateClearButton(clearButton, state, isExecuting);
        updateClearDoneButton(clearDoneButton, state, isExecuting);
      }
    });

    if (clearButton) {
      clearButton.addEventListener('click', () => {
        if (isExecuting || !state || typeof state.clearOpen !== 'function') return;
        state.clearOpen();
      });
      updateClearButton(clearButton, state, isExecuting);
      updateClearDoneButton(clearDoneButton, state, isExecuting);
    }
    if (clearDoneButton) {
      clearDoneButton.addEventListener('click', () => {
        if (isExecuting || !state || typeof state.clearDone !== 'function') return;
        state.clearDone();
      });
      updateClearDoneButton(clearDoneButton, state, isExecuting);
    }
    if (executeButton) {
      executeButton.addEventListener('click', async () => {
        if (isExecuting) return;
        isExecuting = true;
        updateExecuteButton(executeButton, state, isExecuting);
        try {
          await executeSelected(state, executeProposal, status, executeButton);
        } finally {
          isExecuting = false;
          updateExecuteButton(executeButton, state, isExecuting);
          updateClearButton(clearButton, state, isExecuting);
          updateClearDoneButton(clearDoneButton, state, isExecuting);
        }
      });
      updateExecuteButton(executeButton, state, isExecuting);
      updateClearButton(clearButton, state, isExecuting);
    }

    return state;
  }


  function updateCountBadge(badge, items) {
    if (!badge) return;
    const count = Array.isArray(items) ? items.length : 0;
    badge.textContent = String(count);
    badge.hidden = count === 0;
  }
  function renderReviewBasket(root, snapshot, state) {
    const items = snapshot && Array.isArray(snapshot.items) ? snapshot.items : [];
    root.innerHTML = '';

    if (items.length === 0) {
      root.appendChild(createEmptyState('check', 'No review items.'));
      return;
    }

    items.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'review-basket-item';
      row.dataset.status = item.status;
      row.dataset.type = item.type || 'unknown';

      const check = document.createElement('input');
      check.type = 'checkbox';
      check.checked = item.selected !== false;
      check.disabled = item.status !== 'open' || item.executable === false;
      check.setAttribute('aria-label', 'Select review item: ' + getItemSummary(item));
      check.addEventListener('change', () => {
        if (state && typeof state.setSelected === 'function') {
          state.setSelected(item.id, check.checked);
        }
      });

      const text = document.createElement('div');
      text.className = 'review-basket-item-text';
      text.textContent = item.title + ' -> ' + getItemTargetLabel(item);
      const diffSummary = renderDiffSummary(item);
      if (diffSummary) text.appendChild(diffSummary);
      const errorSummary = renderErrorSummary(item);
      if (errorSummary) text.appendChild(errorSummary);

      const itemActions = document.createElement('div');
      itemActions.className = 'review-basket-item-actions';
      const editButton = renderEditButton(item, state);
      if (editButton) itemActions.appendChild(editButton);
      const diffButton = renderDiffButton(item);
      if (diffButton) itemActions.appendChild(diffButton);
      itemActions.appendChild(renderDismissButton(item, state));

      const status = renderStatusBadge(item.status);

      row.appendChild(check);
      row.appendChild(text);
      row.appendChild(itemActions);
      row.appendChild(status);
      root.appendChild(row);
    });
  }


  function createEmptyState(iconName, message) {
    const empty = document.createElement('div');
    empty.className = 'mini-panel-empty mini-panel-empty-rich';
    const renderer = getIconRenderer();
    if (renderer && typeof renderer.createIconElement === 'function') {
      empty.appendChild(renderer.createIconElement(iconName, 'empty-state-icon'));
    }
    const text = document.createElement('span');
    text.textContent = message;
    empty.appendChild(text);
    return empty;
  }
  function renderStatusBadge(statusValue) {
    const status = String(statusValue || 'open');
    const badge = document.createElement('span');
    badge.className = 'review-basket-item-status review-basket-item-status-' + status;
    badge.title = formatStatusLabel(status);
    badge.setAttribute('aria-label', formatStatusLabel(status));

    const renderer = getIconRenderer();
    if (renderer && typeof renderer.createIconElement === 'function') {
      const iconName = status === 'done' ? 'check' : status === 'failed' ? 'warning' : '';
      if (iconName) {
        badge.appendChild(renderer.createIconElement(iconName, 'review-status-icon'));
        return badge;
      }
    }

    const dot = document.createElement('span');
    dot.className = 'review-status-dot';
    badge.appendChild(dot);
    return badge;
  }

  function formatStatusLabel(status) {
    if (status === 'done') return 'Done';
    if (status === 'failed') return 'Failed';
    if (status === 'running') return 'Running';
    return 'Pending';
  }
  function renderDismissButton(item, state) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'review-basket-remove';
    button.title = 'Dismiss';
    button.setAttribute('aria-label', 'Dismiss review item');
    renderRemoveIcon(button);
    button.addEventListener('click', () => {
      if (state && typeof state.remove === 'function') state.remove(item.id);
    });
    return button;
  }

  function renderRemoveIcon(button) {
    const renderer = getIconRenderer();
    button.textContent = '';
    if (renderer && typeof renderer.createIconElement === 'function') {
      button.appendChild(renderer.createIconElement('close', 'review-remove-icon'));
      return;
    }
    button.textContent = 'x';
  }

  function renderEditButton(item, state) {
    if (!item || item.status !== 'open') return null;
    if (item.type !== 'create_note' && item.type !== 'create_from_template') return null;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'review-diff-button';
    button.textContent = 'Edit';
    button.setAttribute('aria-label', 'Edit review item: ' + getItemSummary(item));
    button.addEventListener('click', () => showCreateEditModal(item, state));
    return button;
  }

  function showCreateEditModal(item, state) {
    const overlay = document.createElement('div');
    overlay.className = 'review-modal-overlay';

    const dialog = document.createElement('section');
    dialog.className = 'review-modal';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');

    const title = document.createElement('h2');
    title.id = createDialogTitleId('edit-create');
    title.textContent = item.type === 'create_from_template' ? 'Edit Project Preset' : 'Edit Note';
    dialog.setAttribute('aria-labelledby', title.id);

    const titleField = document.createElement('label');
    titleField.className = 'review-modal-field';
    titleField.textContent = item.type === 'create_from_template' ? 'Project name' : 'Note title';

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'review-modal-title-input';
    titleInput.value = item.title;
    titleInput.setAttribute('autocomplete', 'off');
    titleInput.setAttribute('spellcheck', 'false');

    const contentField = document.createElement('label');
    contentField.className = 'review-modal-field';
    contentField.textContent = item.type === 'create_from_template' ? 'Plan preview' : 'Content';

    const contentInput = document.createElement('textarea');
    contentInput.className = 'review-modal-preview';
    contentInput.value = item.type === 'create_from_template' ? formatTemplatePlanPreview(item) : (item.content || '');
    contentInput.readOnly = item.type === 'create_from_template';

    const actions = document.createElement('div');
    actions.className = 'review-modal-actions';

    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => overlay.remove());

    const save = document.createElement('button');
    save.type = 'button';
    save.className = 'review-modal-confirm';
    save.textContent = 'Save changes';
    save.addEventListener('click', () => {
      const nextTitle = titleInput.value.trim();
      if (!nextTitle) return;
      if (state && typeof state.updateProposal === 'function') {
        state.updateProposal(item.id, buildCreateEditPatch(item, nextTitle, contentInput.value));
      }
      overlay.remove();
    });

    titleInput.addEventListener('input', () => {
      save.disabled = titleInput.value.trim().length === 0;
    });

    titleField.appendChild(titleInput);
    contentField.appendChild(contentInput);
    actions.appendChild(cancel);
    actions.appendChild(save);
    dialog.appendChild(title);
    dialog.appendChild(titleField);
    dialog.appendChild(contentField);
    dialog.appendChild(actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    getModalBehavior().mountModalBehavior({ overlay, dialog, initialFocus: titleInput }).focusInitial();
    titleInput.select();
  }

  function buildCreateEditPatch(item, nextTitle, content) {
    if (item.type !== 'create_from_template') {
      return { title: nextTitle, content: content };
    }
    return renameTemplatePlan(item, nextTitle);
  }

  function renameTemplatePlan(item, nextTitle) {
    const oldRoot = item.templatePlanRootPath || item.targetPath || '';
    const parent = oldRoot.split('/').slice(0, -1).join('/');
    const newRoot = parent ? parent + '/' + sanitizePathSegment(nextTitle) : sanitizePathSegment(nextTitle);
    const renamedFiles = (item.files || []).map((file) => ({
      path: replacePathPrefix(file.path, oldRoot, newRoot),
      content: String(file.content || '').replace(new RegExp(escapeRegExp(item.title), 'g'), nextTitle)
    }));
    const renamedFolders = (item.folders || []).map((folder) => replacePathPrefix(folder, oldRoot, newRoot));
    return {
      title: nextTitle,
      targetPath: newRoot,
      templatePlanRootPath: newRoot,
      folders: renamedFolders,
      files: renamedFiles
    };
  }

  function formatTemplatePlanPreview(item) {
    const folders = (item.folders || []).map((folder) => '- ' + folder);
    const files = (item.files || []).map((file) => '- ' + file.path);
    const sections = [];
    if (folders.length > 0) sections.push('Folders:\n' + folders.join('\n'));
    if (files.length > 0) sections.push('Files:\n' + files.join('\n'));
    return sections.join('\n\n');
  }

  function replacePathPrefix(value, oldRoot, newRoot) {
    const path = String(value || '');
    if (!oldRoot || path === oldRoot) return newRoot;
    if (path.indexOf(oldRoot + '/') === 0) return newRoot + path.slice(oldRoot.length);
    return path;
  }

  function sanitizePathSegment(value) {
    return String(value || 'Untitled')
      .replace(/\\/g, '/')
      .split('/')
      .filter(Boolean)
      .pop()
      .replace(/[<>:"|?*\x00-\x1f]/g, ' ')
      .replace(/[!]+/g, '')
      .replace(/\s+/g, ' ')
      .replace(/[. ]+$/g, '')
      .trim() || 'Untitled';
  }

  function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  function renderDiffButton(item) {
    if (!item || !item.diffPreview) return null;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'review-diff-button';
    button.textContent = 'Review Diff';
    button.setAttribute('aria-label', 'Review diff for: ' + getItemSummary(item));
    button.addEventListener('click', () => showDiffPreviewModal(item));
    return button;
  }

  function showDiffPreviewModal(item) {
    const overlay = document.createElement('div');
    overlay.className = 'review-modal-overlay';

    const dialog = document.createElement('section');
    dialog.className = 'review-modal review-diff-modal';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');

    const title = document.createElement('h2');
    title.id = createDialogTitleId('diff');
    title.textContent = 'Diff Preview';
    dialog.setAttribute('aria-labelledby', title.id);

    const target = document.createElement('div');
    target.className = 'review-modal-target';
    target.textContent = getItemTargetLabel(item) + ' - ' + (item.diffPreview.summary || 'Diff required');

    const body = document.createElement('div');
    body.className = 'review-diff-body';
    renderDiffLines(body, item.diffPreview);

    const actions = document.createElement('div');
    actions.className = 'review-modal-actions';

    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Close';
    close.addEventListener('click', () => overlay.remove());

    actions.appendChild(close);
    dialog.appendChild(title);
    dialog.appendChild(target);
    dialog.appendChild(body);
    dialog.appendChild(actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    getModalBehavior().mountModalBehavior({ overlay, dialog, initialFocus: close }).focusInitial();
  }

  function renderDiffLines(root, diffPreview) {
    getDiffLineRenderer().renderDiffLines(root, diffPreview);
  }
  function renderDiffSummary(item) {
    if (!item || !item.requiresDiff) return null;
    const summary = document.createElement('div');
    summary.className = 'review-basket-diff-summary';
    if (item.noChange === true) {
      summary.textContent = 'No content changes proposed.';
      return summary;
    }
    summary.textContent = item.diffPreview && item.diffPreview.summary
      ? 'Diff required: ' + item.diffPreview.summary
      : 'Diff required';
    return summary;
  }

  function renderErrorSummary(item) {
    if (!item || item.status !== 'failed' || !item.error) return null;
    const summary = document.createElement('div');
    summary.className = 'review-basket-error-summary';
    summary.textContent = 'Failed: ' + item.error;
    return summary;
  }


  function getItemSummary(item) {
    return String((item && item.title) || 'Review item') + ' -> ' + getItemTargetLabel(item || {});
  }

  function createDialogTitleId(prefix) {
    return 'review-dialog-title-' + String(prefix || 'dialog') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }
  function getItemTargetLabel(item) {
    return item.targetPath || item.targetFolder || item.sourcePath || 'No target';
  }
  async function executeSelected(state, executeProposal, status, executeButton) {
    if (!state || typeof state.getSelectedOpenItems !== 'function') return;
    if (typeof executeProposal !== 'function') {
      setText(status, 'Review execution unavailable.');
      return;
    }

    const items = state.getSelectedOpenItems();
    if (items.length === 0) return;
    setButtonBusy(executeButton, true);

    for (const item of items) {
      const confirmed = await confirmReviewAction(item);
      if (!confirmed || !confirmed.ok) continue;
      const proposal = Object.assign({}, item, confirmed.patch);

      state.updateStatus(item.id, 'running');
      const result = await executeProposal(proposal);
      if (result && result.ok) {
        state.updateStatus(item.id, 'done', { path: result.path });
        setText(status, getSuccessMessage(proposal, result));
      } else {
        state.updateStatus(item.id, 'failed', {
          error: result && (result.message || result.code) ? (result.message || result.code) : 'Action failed.'
        });
        setText(status, 'Review action failed.');
      }
    }

    setButtonBusy(executeButton, false);
  }

  function confirmReviewAction(item) {
    if (item && item.type === 'update_note') return confirmUpdateNote(item);
    return Promise.resolve({ ok: true, patch: {} });
  }

  function getSuccessMessage(proposal, result) {
    if (proposal && proposal.type === 'update_note') {
      return 'Updated note: ' + (result.path || proposal.targetPath || 'unknown');
    }
    return 'Created note: ' + (result.path || 'unknown');
  }
  function updateExecuteButton(button, state, busy) {
    if (!button || !state || typeof state.getSelectedOpenItems !== 'function') return;
    const count = state.getSelectedOpenItems().length;
    button.disabled = busy || count === 0;
    button.textContent = count > 0 ? 'Execute selected (' + count + ')' : 'Execute selected';
  }

  function updateClearButton(button, state, busy) {
    if (!button || !state || typeof state.getSnapshot !== 'function') return;
    const hasOpenItems = state.getSnapshot().items.some((item) => item.status === 'open');
    button.disabled = busy || !hasOpenItems;
  }

  function updateClearDoneButton(button, state, busy) {
    if (!button || !state || typeof state.getSnapshot !== 'function') return;
    const hasDoneItems = state.getSnapshot().items.some((item) => item.status === 'done');
    button.disabled = busy || !hasDoneItems;
  }

  function setButtonBusy(button, busy) {
    if (!button) return;
    button.disabled = busy;
    if (busy) button.textContent = 'Executing...';
  }

  function confirmUpdateNote(item) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'review-modal-overlay';

      const dialog = document.createElement('section');
      dialog.className = 'review-modal review-diff-modal';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');

      const title = document.createElement('h2');
      title.id = createDialogTitleId('apply-update');
      title.textContent = 'Apply Update Preview';
      dialog.setAttribute('aria-labelledby', title.id);

      const target = document.createElement('div');
      target.className = 'review-modal-target';
      target.textContent = getItemTargetLabel(item) + ' - ' + (item.diffPreview && item.diffPreview.summary ? item.diffPreview.summary : 'Diff required');

      const body = document.createElement('div');
      body.className = 'review-diff-body';
      renderDiffLines(body, item.diffPreview);

      const actions = document.createElement('div');
      actions.className = 'review-modal-actions';

      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.textContent = 'Cancel';
      cancel.addEventListener('click', () => close(false));

      const confirm = document.createElement('button');
      confirm.type = 'button';
      confirm.className = 'review-modal-confirm';
      confirm.textContent = 'Apply update';
      confirm.addEventListener('click', () => close({ ok: true, patch: {} }));

      function close(value) {
        overlay.remove();
        resolve(value);
      }

      actions.appendChild(cancel);
      actions.appendChild(confirm);
      dialog.appendChild(title);
      dialog.appendChild(target);
      dialog.appendChild(body);
      dialog.appendChild(actions);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
      getModalBehavior().mountModalBehavior({ overlay, dialog, initialFocus: confirm }).focusInitial();
    });
  }
  function setText(node, value) {
    if (node) node.textContent = value;
  }

  function getDiffLineRenderer() {
    if (typeof window !== 'undefined' && window.VitruviosDiffLineRenderer) return window.VitruviosDiffLineRenderer;
    if (typeof require === 'function') {
      try {
        return require('../diff/diffLineRenderer');
      } catch (error) {
        // Fall through to the inert renderer below.
      }
    }
    return { renderDiffLines() {} };
  }

  function getIconRenderer() {
    return (typeof window !== 'undefined' && window.VitruviosIconRenderer) ? window.VitruviosIconRenderer : null;
  }

  function getModalBehavior() {
    return window.VitruviosModalBehavior;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { mountReviewBasket, renderReviewBasket };
  }

  if (typeof window !== 'undefined') {
    window.VitruviosReviewBasket = Object.freeze({ mountReviewBasket });
  }
})();
