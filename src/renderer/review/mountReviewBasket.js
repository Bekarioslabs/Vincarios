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
    let isExecuting = false;

    if (!window.ZeusReviewBasketState || !root) return null;

    const state = window.ZeusReviewBasketState.createReviewBasketState({
      onChange(snapshot) {
        renderReviewBasket(root, snapshot, state);
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

  function renderReviewBasket(root, snapshot, state) {
    const items = snapshot && Array.isArray(snapshot.items) ? snapshot.items : [];
    root.innerHTML = '';

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'mini-panel-empty';
      empty.textContent = 'No suggestions yet.';
      root.appendChild(empty);
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
      const diffButton = renderDiffButton(item);
      if (diffButton) itemActions.appendChild(diffButton);
      itemActions.appendChild(renderDismissButton(item, state));

      const status = document.createElement('span');
      status.className = 'review-basket-item-status';
      status.textContent = item.status;

      row.appendChild(check);
      row.appendChild(text);
      row.appendChild(itemActions);
      row.appendChild(status);
      root.appendChild(row);
    });
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

  function renderDiffButton(item) {
    if (!item || !item.diffPreview) return null;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'review-diff-button';
    button.textContent = 'Review Diff';
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
    title.textContent = 'Diff Preview';

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
    close.focus();
  }

  function renderDiffLines(root, diffPreview) {
    const hunks = diffPreview && Array.isArray(diffPreview.hunks) ? diffPreview.hunks : [];
    if (hunks.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'review-diff-line';
      empty.textContent = 'No changes';
      root.appendChild(empty);
      return;
    }
    hunks.forEach((hunk) => {
      hunk.lines.forEach((line) => {
        const row = document.createElement('div');
        row.className = 'review-diff-line review-diff-line-' + line.type;
        row.textContent = diffPrefix(line.type) + ' ' + line.text;
        root.appendChild(row);
      });
    });
  }

  function diffPrefix(type) {
    if (type === 'add') return '+';
    if (type === 'remove') return '-';
    return ' ';
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
    return confirmCreateNote(item);
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
      title.textContent = 'Apply Update Preview';

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
      confirm.focus();
    });
  }
  function confirmCreateNote(item) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'review-modal-overlay';

      const dialog = document.createElement('section');
      dialog.className = 'review-modal';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');

      const title = document.createElement('h2');
      title.textContent = 'Create Note Preview';

      const field = document.createElement('label');
      field.className = 'review-modal-field';
      field.textContent = 'Note title';

      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.className = 'review-modal-title-input';
      titleInput.value = item.title;
      titleInput.setAttribute('autocomplete', 'off');
      titleInput.setAttribute('spellcheck', 'false');

      const target = document.createElement('div');
      target.className = 'review-modal-target';

      const preview = document.createElement('pre');
      preview.className = 'review-modal-preview';
      preview.textContent = item.content || '';

      const actions = document.createElement('div');
      actions.className = 'review-modal-actions';

      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.textContent = 'Cancel';
      cancel.addEventListener('click', () => close(false));

      const confirm = document.createElement('button');
      confirm.type = 'button';
      confirm.className = 'review-modal-confirm';
      confirm.textContent = 'Create note';
      confirm.addEventListener('click', () => close({ ok: true, patch: { title: titleInput.value.trim() } }));

      titleInput.addEventListener('input', updateTargetPreview);

      function updateTargetPreview() {
        const nextTitle = titleInput.value.trim();
        target.textContent = (item.targetFolder || '') + ' / ' + (nextTitle || 'Untitled') + '.md';
        confirm.disabled = nextTitle.length === 0;
      }

      function close(value) {
        overlay.remove();
        resolve(value);
      }

      field.appendChild(titleInput);
      actions.appendChild(cancel);
      actions.appendChild(confirm);
      dialog.appendChild(title);
      dialog.appendChild(field);
      dialog.appendChild(target);
      dialog.appendChild(preview);
      dialog.appendChild(actions);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
      updateTargetPreview();
      titleInput.focus();
      titleInput.select();
    });
  }
  function setText(node, value) {
    if (node) node.textContent = value;
  }

  function getIconRenderer() {
    return (typeof window !== 'undefined' && window.ZeusIconRenderer) ? window.ZeusIconRenderer : null;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { mountReviewBasket, renderReviewBasket };
  }

  if (typeof window !== 'undefined') {
    window.ZeusReviewBasket = Object.freeze({ mountReviewBasket });
  }
})();
