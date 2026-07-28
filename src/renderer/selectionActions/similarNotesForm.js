(function() {
  'use strict';

  const DEFAULTS = Object.freeze({
    mode: 'mixed',
    minimumScorePercent: 65,
    maxResults: 8,
    scope: 'same_role',
    refreshIndex: false
  });

  function mountSimilarNotesForm(options) {
    options = options || {};
    const host = options.host;
    const sourceOptions = options.sourceOptions || getBrowserSourceOptions();
    if (!host || typeof host.appendChild !== 'function') {
      throw new TypeError('Similar Notes form host is required.');
    }

    const values = normalizeInitialOptions(options.initialOptions, sourceOptions);
    const form = document.createElement('form');
    form.className = 'selection-action-form';
    form.dataset.actionId = 'file.findSimilar';
    form.innerHTML = [
      '<label class="selection-action-form-label">Find similar notes</label>',
      '<div class="selection-action-grid">',
      '  <fieldset class="selection-action-source" data-similar-source><legend>Search source</legend><label><input type="radio" name="similar-source" value="content">Content</label><label><input type="radio" name="similar-source" value="metadata">Metadata</label><label><input type="radio" name="similar-source" value="mixed">Both</label></fieldset>',
      '  <fieldset class="selection-action-source" data-similar-scope><legend>Search scope</legend><label title="Search within the active Vault Role, or the current top-level area when no role is assigned."><input type="radio" name="similar-scope" value="same_role">Relevant area</label><label><input type="radio" name="similar-scope" value="whole_vault">Whole vault</label></fieldset>',
      '  <label><span>Minimum match %</span><input type="number" min="0" max="100" step="1" data-similar-min></label>',
      '  <label><span>Max results</span><input type="number" min="1" step="1" data-similar-limit></label>',
      '  <label class="selection-action-check"><input type="checkbox" data-similar-refresh-index><span>Refresh index first</span></label>',
      '</div>',
      '<div class="selection-action-form-actions">',
      '  <button type="submit">Find</button>',
      '  <button type="button" data-similar-cancel>Cancel</button>',
      '</div>'
    ].join('');

    form.querySelector('[data-similar-min]').value = String(values.minimumScorePercent);
    form.querySelector('[data-similar-limit]').value = String(values.maxResults);
    checkValue(form, '[data-similar-source]', values.mode);
    checkValue(form, '[data-similar-scope]', values.scope);
    form.querySelector('[data-similar-refresh-index]').checked = values.refreshIndex;
    form.querySelector('[data-similar-cancel]').addEventListener('click', () => {
      form.remove();
      if (typeof options.onCancel === 'function') options.onCancel();
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const result = normalizeSimilarNotesFormOptions(readFormValues(form), sourceOptions);
      form.remove();
      if (typeof options.onSubmit === 'function') options.onSubmit(result);
    });

    host.appendChild(form);
    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.focus();
    return form;
  }

  function normalizeSimilarNotesFormOptions(input, sourceOptions) {
    input = input || {};
    sourceOptions = sourceOptions || getBrowserSourceOptions();
    const similarity = sourceOptions.weightsFor(sourceOptions.normalize(input.mode || DEFAULTS.mode));
    return {
      mode: similarity.mode,
      minimumScorePercent: String(valueOrDefault(input.minimumScorePercent, DEFAULTS.minimumScorePercent)),
      contentWeight: similarity.contentWeight,
      metadataWeight: similarity.metadataWeight,
      limit: String(valueOrDefault(input.limit, valueOrDefault(input.maxResults, DEFAULTS.maxResults))),
      scope: input.scope === 'whole_vault' ? 'whole_vault' : DEFAULTS.scope,
      refreshIndex: input.refreshIndex === true
    };
  }

  function valueOrDefault(value, fallback) {
    return value === undefined || value === null || value === '' ? fallback : value;
  }
  function normalizeInitialOptions(input, sourceOptions) {
    const normalized = normalizeSimilarNotesFormOptions(input, sourceOptions);
    return Object.assign({}, normalized, { maxResults: normalized.limit });
  }

  function readFormValues(form) {
    const source = form.querySelector('[data-similar-source] input:checked');
    const scope = form.querySelector('[data-similar-scope] input:checked');
    return {
      mode: source && source.value,
      minimumScorePercent: form.querySelector('[data-similar-min]').value,
      maxResults: form.querySelector('[data-similar-limit]').value,
      scope: scope && scope.value,
      refreshIndex: form.querySelector('[data-similar-refresh-index]').checked
    };
  }

  function checkValue(form, groupSelector, value) {
    const option = form.querySelector(groupSelector + ' input[value="' + value + '"]');
    if (option) option.checked = true;
  }

  function getBrowserSourceOptions() {
    if (typeof window !== 'undefined' && window.VincariosSimilaritySourceOptions) {
      return window.VincariosSimilaritySourceOptions;
    }
    throw new Error('Similarity source options unavailable.');
  }

  const api = {
    mountSimilarNotesForm,
    normalizeSimilarNotesFormOptions
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosSimilarNotesForm = Object.freeze(api);
})();
