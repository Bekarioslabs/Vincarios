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
    textarea.placeholder = 'Describe the content change for this note. Rename/move are not part of this action...';

    const actions = document.createElement('div');
    actions.className = 'selection-action-form-actions';
    const submit = createButton('submit', 'Create proposal');
    const cancel = createButton('button', 'Cancel');

    cancel.addEventListener('click', () => {
      if (!canDiscard(textarea, options.confirmDiscard)) return;
      form.remove();
      if (typeof options.onCancel === 'function') options.onCancel();
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const result = normalizeUpdateInstruction(textarea.value);
      if (!result.ok) {
        if (typeof options.onInvalid === 'function') options.onInvalid(result);
        textarea.focus();
        return;
      }
      form.remove();
      if (typeof options.onSubmit === 'function') options.onSubmit(result.instruction);
    });

    actions.appendChild(submit);
    actions.appendChild(cancel);
    form.appendChild(label);
    form.appendChild(textarea);
    form.appendChild(actions);
    host.appendChild(form);
    textarea.focus();
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
