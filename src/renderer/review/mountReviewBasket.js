(function() {
  'use strict';

  function mountReviewBasket(options) {
    options = options || {};
    const app = options.app;
    const api = options.api || null;
    const status = options.status;
    const executeProposal = typeof options.executeProposal === 'function' ? options.executeProposal : null;
    const onSnapshotChange = typeof options.onSnapshotChange === 'function' ? options.onSnapshotChange : null;
    const root = app ? app.querySelector('#review-basket-items') : null;
    const executeButton = app ? app.querySelector('#review-execute') : null;
    const clearButton = app ? app.querySelector('#review-clear') : null;
    const clearDoneButton = app ? app.querySelector('#review-clear-done') : null;
    const countBadge = app ? app.querySelector('#review-basket-count') : null;
    let isExecuting = false;
    let persistenceReady = false;
    const persistenceApi = getReviewBasketPersistenceApi();
    const persistence = persistenceApi ? persistenceApi.createReviewBasketPersistence({ api }) : null;

    if (!window.VincariosReviewBasketState || !root) return null;

    const state = window.VincariosReviewBasketState.createReviewBasketState({
      onChange(snapshot) {
        renderReviewBasket(root, snapshot, state);
        updateCountBadge(countBadge, snapshot && snapshot.items);
        updateExecuteButton(executeButton, state, isExecuting);
        updateClearButton(clearButton, state, isExecuting);
        updateClearDoneButton(clearDoneButton, state, isExecuting);
        if (onSnapshotChange) onSnapshotChange(snapshot);
        if (persistenceReady && persistence) persistSnapshot(persistence, snapshot, status);
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

    async function restore() {
      persistenceReady = false;
      if (!persistence) return { ok: false, message: 'Review Basket persistence unavailable.' };
      try {
        const result = await persistence.restore(state);
        persistenceReady = result && result.ok === true;
        if (result && result.warning) setText(status, result.warning);
        if (!persistenceReady) setText(status, result && result.message || 'Review Basket could not be restored.');
        return result;
      } catch (_error) {
        setText(status, 'Review Basket could not be restored.');
        return { ok: false, message: 'Review Basket could not be restored.' };
      }
    }

    function reveal() {
      const slot = app ? app.querySelector('#review-basket') : null;
      if (slot && typeof slot.scrollIntoView === 'function') slot.scrollIntoView({ block: 'nearest' });
    }

    return Object.assign({}, state, { restore, reveal });
  }


  function persistSnapshot(persistence, snapshot, status) {
    persistence.persist(snapshot).then((result) => {
      if (!result || result.ok === false) setText(status, result && result.message || 'Review Basket could not be saved.');
    }).catch(() => setText(status, 'Review Basket could not be saved.'));
  }

  function getReviewBasketPersistenceApi() {
    if (typeof window !== 'undefined' && window.VincariosReviewBasketPersistence) return window.VincariosReviewBasketPersistence;
    if (typeof require === 'function') {
      try { return require('./reviewBasketPersistence'); } catch (_error) {}
    }
    return null;
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
      if (item.updateRisk) row.dataset.updateRisk = item.updateRisk.level;

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
      if (item.updateRisk && item.updateRisk.level !== 'normal') {
        const warning = document.createElement('div');
        warning.className = 'review-basket-risk-summary';
        warning.dataset.updateRisk = item.updateRisk.level;
        warning.textContent = item.updateRisk.level === 'high'
          ? 'Large replacement: extra confirmation required.'
          : 'Update blocked: ' + item.diffError;
        warning.title = item.updateRisk.reasons.join(' ');
        text.appendChild(warning);
      }
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
      const iconName = status === 'done' ? 'check' : (status === 'failed' || status === 'stale') ? 'warning' : '';
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
    if (status === 'stale') return 'Stale';
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

    const nameError = document.createElement('p');
    nameError.className = 'review-basket-error-summary';
    nameError.id = title.id + '-name-error';
    nameError.setAttribute('role', 'alert');
    nameError.hidden = true;
    titleInput.setAttribute('aria-describedby', nameError.id);

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
      const nextTitle = titleInput.value;
      const names = typeof window !== 'undefined' && window.VincariosNewNames
        ? window.VincariosNewNames
        : typeof require === 'function' ? require('../../shared/pathRules/newNames') : null;
      const validation = names ? names.validateNewName(nextTitle) : { ok: false, message: 'Write-name validation unavailable.' };
      if (!validation.ok) {
        nameError.textContent = validation.message;
        nameError.hidden = false;
        titleInput.setAttribute('aria-invalid', 'true');
        titleInput.focus();
        return;
      }
      if (state && typeof state.updateProposal === 'function') {
        state.updateProposal(item.id, buildCreateEditPatch(item, nextTitle, contentInput.value));
      }
      overlay.remove();
    });

    titleInput.addEventListener('input', () => {
      save.disabled = titleInput.value.length === 0;
      nameError.hidden = true;
      titleInput.setAttribute('aria-invalid', 'false');
    });

    titleField.appendChild(titleInput);
    titleField.appendChild(nameError);
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
    const newRoot = parent ? parent + '/' + nextTitle : nextTitle;
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
    if (!item || (item.status !== 'failed' && item.status !== 'stale') || !item.error) return null;
    const summary = document.createElement('div');
    summary.className = 'review-basket-error-summary';
    summary.textContent = (item.status === 'stale' ? 'Stale: ' : 'Failed: ') + item.error;
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
      } else {
        state.updateStatus(item.id, getExecutionFailureStatus(result), {
          error: result && (result.message || result.code) ? (result.message || result.code) : 'Action failed.'
        });
      }
    }

    setButtonBusy(executeButton, false);
  }

  function getExecutionFailureStatus(result) {
    return result && result.code === 'stale_content' ? 'stale' : 'failed';
  }

  function confirmReviewAction(item) {
    if (item && item.type === 'update_note') return confirmUpdateNote(item);
    return Promise.resolve({ ok: true, patch: {} });
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
    if (!item.updateRisk || item.updateRisk.level === 'blocked') return Promise.resolve(false);
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
      confirm.addEventListener('click', () => {
        if (!confirm.disabled) close({ ok: true, patch: {} });
      });

      if (item.updateRisk.level === 'high') {
        const warning = document.createElement('p');
        warning.id = title.id + '-risk';
        warning.className = 'review-update-risk-warning';
        warning.setAttribute('role', 'alert');
        warning.textContent = 'Large replacement. ' + item.updateRisk.reasons.join(' ');
        dialog.setAttribute('aria-describedby', warning.id);
        body.appendChild(warning);

        const label = document.createElement('label');
        label.className = 'review-risk-acknowledgement';
        const acknowledgement = document.createElement('input');
        acknowledgement.type = 'checkbox';
        acknowledgement.setAttribute('aria-label', 'I have reviewed this large replacement.');
        acknowledgement.addEventListener('change', () => { confirm.disabled = !acknowledgement.checked; });
        const caption = document.createElement('span');
        caption.textContent = 'I have reviewed this large replacement.';
        label.appendChild(acknowledgement);
        label.appendChild(caption);
        body.appendChild(label);
        confirm.disabled = true;
      }
      renderDiffLines(body, item.diffPreview);

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
      getModalBehavior().mountModalBehavior({ overlay, dialog, initialFocus: cancel }).focusInitial();
    });
  }
  function setText(node, value) {
    if (node) node.textContent = value;
  }

  function getDiffLineRenderer() {
    if (typeof window !== 'undefined' && window.VincariosDiffLineRenderer) return window.VincariosDiffLineRenderer;
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
    return (typeof window !== 'undefined' && window.VincariosIconRenderer) ? window.VincariosIconRenderer : null;
  }

  function getModalBehavior() {
    return window.VincariosModalBehavior;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { mountReviewBasket, renderReviewBasket, getExecutionFailureStatus };
  }

  if (typeof window !== 'undefined') {
    window.VincariosReviewBasket = Object.freeze({ mountReviewBasket });
  }
})();
