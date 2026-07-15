(function() {
  'use strict';

  function mountFolderScopeForm(options) {
    options = options || {};
    const host = options.host;
    if (!host || typeof host.appendChild !== 'function') return null;

    const scopeOptions = getScopeOptions().normalizeFolderScopeOptions(options.initialOptions || {});
    const form = document.createElement('form');
    form.className = 'selection-action-form';
    form.dataset.actionId = String(options.actionId || 'folder.scope');

    const label = document.createElement('label');
    label.className = 'selection-action-form-label';
    label.textContent = String(options.title || 'Folder scope');

    const grid = document.createElement('div');
    grid.className = 'selection-action-grid';

    const scopeLabel = document.createElement('label');
    scopeLabel.textContent = 'Include';
    const scopeSelect = document.createElement('select');
    scopeSelect.innerHTML = '<option value="current">Current folder only</option><option value="subfolders">Subfolders</option>';
    scopeSelect.value = scopeOptions.scope;
    scopeLabel.appendChild(scopeSelect);

    const depthLabel = document.createElement('label');
    depthLabel.textContent = 'Maximum depth';
    const depthInput = document.createElement('input');
    depthInput.type = 'number';
    depthInput.min = '1';
    depthInput.max = '10';
    depthInput.value = String(scopeOptions.maxDepth);
    depthLabel.appendChild(depthInput);

    const filesLabel = document.createElement('label');
    filesLabel.textContent = 'Maximum Markdown notes';
    const filesInput = document.createElement('input');
    filesInput.type = 'number';
    filesInput.min = '1';
    filesInput.max = '200';
    filesInput.value = String(scopeOptions.maxFiles);
    filesLabel.appendChild(filesInput);

    grid.appendChild(scopeLabel);
    grid.appendChild(depthLabel);
    grid.appendChild(filesLabel);

    const actions = document.createElement('div');
    actions.className = 'selection-action-form-actions';
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.textContent = String(options.submitLabel || 'Apply');
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => {
      form.remove();
      if (typeof options.onCancel === 'function') options.onCancel();
    });
    actions.appendChild(submit);
    actions.appendChild(cancel);

    form.appendChild(label);
    form.appendChild(grid);
    form.appendChild(actions);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const normalized = getScopeOptions().normalizeFolderScopeOptions({
        scope: scopeSelect.value,
        maxDepth: depthInput.value,
        maxFiles: filesInput.value,
        fileType: 'markdown'
      });
      form.remove();
      if (typeof options.onSubmit === 'function') options.onSubmit(normalized);
    });

    host.appendChild(form);
    scopeSelect.focus();
    return form;
  }

  function getScopeOptions() {
    if (typeof window !== 'undefined' && window.VitruviosFolderScopeOptions) return window.VitruviosFolderScopeOptions;
    if (typeof module !== 'undefined' && module.exports) return require('./folderScopeOptions');
    throw new Error('vitruvios folder scope options API is not available.');
  }

  const api = { mountFolderScopeForm };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosFolderScopeForm = Object.freeze(api);
})();