(function() {
  'use strict';

  function mountUpdateInstructionForm(options) {
    options = options || {};
    const host = options.host;
    if (!host || typeof host.appendChild !== 'function') {
      throw new TypeError('Update instruction form host is required.');
    }

    const form = document.createElement('form');
    form.className = 'selection-action-form';
    form.dataset.actionId = 'file.proposeUpdate';

    const label = document.createElement('label');
    label.className = 'selection-action-form-label';
    label.textContent = 'Content update instruction';

    const textarea = document.createElement('textarea');
    textarea.rows = 4;
    textarea.setAttribute('aria-label', 'Content update instruction');
    textarea.placeholder = 'Describe the content change for this note. Rename/move are not part of this action...';

    const actions = document.createElement('div');
    actions.className = 'selection-action-form-actions';
    const submit = createButton('submit', 'Create proposal');
    const cancel = createButton('button', 'Cancel');

    const budget = document.createElement('details');
    budget.className = 'selection-action-budget';
    const summary = document.createElement('summary');
    summary.setAttribute('aria-live', 'polite');
    const detail = document.createElement('div');
    budget.appendChild(summary);
    budget.appendChild(detail);
    let revision = 0;
    let timer;
    let submitting = false;

    function close() {
      revision += 1;
      clearTimeout(timer);
      form.remove();
    }

    function showBudget(result) {
      const info = result && result.budget || {};
      budget.dataset.state = info.state || 'unknown';
      summary.textContent = info.state === 'fits' ? 'Context: likely fits'
        : info.state === 'too_large' ? 'Context: too large for loaded model'
          : 'Context: size unknown';
      const number = (value) => Number.isFinite(value) ? value.toLocaleString('en-US') : 'unknown';
      detail.textContent = info.contextTokens
        ? 'Loaded context: ' + number(info.contextTokens) + ' tokens. Estimated input: ' + number(info.estimatedInputTokens)
          + '. Response allowance: ' + number(info.responseReserveTokens) + '. Safety reserve: ' + number(info.safetyReserveTokens)
          + '. Conservative estimate, not an exact token count; rechecked on send.'
          + (result.ok === false ? ' ' + String(result.error || result.message || '') : '')
        : String(result && (result.error || result.message) || 'Load the selected model in your provider, then retry.');
    }

    async function check(instruction) {
      const current = ++revision;
      budget.dataset.state = 'checking';
      summary.textContent = 'Context: checking loaded model...';
      detail.textContent = 'Checking the loaded context without generating a response.';
      let result;
      try {
        result = typeof options.checkBudget === 'function' ? await options.checkBudget(instruction) : null;
      } catch (_error) {
        result = { ok: false, error: 'Context check failed. Check your provider, then retry.' };
      }
      if (current !== revision || !form.parentNode || form.isConnected === false || textarea.value.trim() !== instruction) return null;
      showBudget(result);
      return result;
    }

    textarea.addEventListener('input', () => {
      revision += 1;
      clearTimeout(timer);
      budget.dataset.state = 'checking';
      summary.textContent = 'Context: checking loaded model...';
      timer = setTimeout(() => {
        if (form.parentNode && form.isConnected !== false) void check(textarea.value.trim());
      }, 400);
    });

    cancel.addEventListener('click', () => {
      if (!canDiscard(textarea, options.confirmDiscard)) return;
      close();
      if (typeof options.onCancel === 'function') options.onCancel();
    });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (submitting) return;
      const result = normalizeUpdateInstruction(textarea.value);
      if (!result.ok) {
        if (typeof options.onInvalid === 'function') options.onInvalid(result);
        textarea.focus();
        return;
      }
      clearTimeout(timer);
      submitting = true;
      submit.disabled = true;
      const assessment = await check(result.instruction);
      if (!assessment || assessment.ok !== true) {
        submitting = false;
        submit.disabled = false;
        if (assessment && typeof options.onInvalid === 'function') {
          options.onInvalid({ message: assessment.error || assessment.message || 'Context check unavailable. Check your provider, then retry.' });
        }
        return;
      }
      // Generation cannot be canceled by discarding an instruction already sent.
      cancel.disabled = true;
      textarea.readOnly = true;
      try {
        const outcome = typeof options.onSubmit === 'function' ? await options.onSubmit(result.instruction) : null;
        if (outcome && outcome.ok === true) close();
        else if (outcome && outcome.budget) showBudget(outcome);
      } catch (_error) {
        if (typeof options.onInvalid === 'function') options.onInvalid({ message: 'Update proposal failed. Your instruction is kept; check the provider and retry.' });
      } finally {
        submitting = false;
        submit.disabled = false;
        cancel.disabled = false;
        textarea.readOnly = false;
      }
    });

    actions.appendChild(submit);
    actions.appendChild(cancel);
    form.appendChild(label);
    form.appendChild(textarea);
    form.appendChild(budget);
    form.appendChild(actions);
    host.appendChild(form);
    textarea.focus();
    void check(textarea.value.trim());
    return form;
  }

  function normalizeUpdateInstruction(value) {
    const instruction = String(value || '').trim();
    if (!instruction) {
      return {
        ok: false,
        code: 'instruction_required',
        message: 'Update proposal needs an instruction.'
      };
    }
    return { ok: true, instruction };
  }

  function canDiscard(input, confirmDiscard) {
    if (!input || !String(input.value || '').trim()) return true;
    if (typeof confirmDiscard !== 'function') return false;
    return confirmDiscard('Discard update instruction?') === true;
  }

  function createButton(type, text) {
    const button = document.createElement('button');
    button.type = type;
    button.textContent = text;
    return button;
  }

  const api = {
    mountUpdateInstructionForm,
    normalizeUpdateInstruction
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosUpdateInstructionForm = Object.freeze(api);
})();
