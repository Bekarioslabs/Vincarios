(function() {
  'use strict';

  const SEARCH_SCOPES = Object.freeze([
    { value: 'all', label: 'All indexed fields' },
    { value: 'files', label: 'Names and paths' },
    { value: 'metadata', label: 'Metadata' },
    { value: 'content', label: 'Full-text content' }
  ]);

  function mountSearchWorkspace(options) {
    options = options || {};
    const root = options.root;
    const api = options.api;
    const status = options.status || null;
    const onOpenResult = typeof options.onOpenResult === 'function' ? options.onOpenResult : null;
    const onRevealResult = typeof options.onRevealResult === 'function' ? options.onRevealResult : null;
    if (!root || !api || !api.search || typeof api.search.query !== 'function') return null;

    const state = { query: '', scope: 'all', results: [], fullText: { enabled: false, available: false }, message: '' };
    render();

    async function runSearch() {
      const response = await api.search.query({ query: state.query, scope: state.scope });
      if (!response || !response.ok) {
        state.results = [];
        state.fullText = { enabled: false, available: false };
        state.message = response && response.message || 'Search could not run.';
      } else {
        state.query = response.query || state.query;
        state.results = Array.isArray(response.results) ? response.results : [];
        state.fullText = response.fullText || { enabled: false, available: false };
        state.message = state.query ? '' : 'Enter a filename, path, tag, or indexed word.';
      }
      render();
      if (status && state.query) status.textContent = response && response.ok ? 'Search completed: ' + state.results.length + ' result(s).' : state.message;
    }

    function render() {
      root.innerHTML = '';
      root.classList.add('search-workspace');

      const header = document.createElement('div');
      header.className = 'search-workspace-header';
      header.textContent = 'Vault Search';
      root.appendChild(header);

      const form = document.createElement('form');
      form.className = 'search-form';
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        state.query = input.value;
        runSearch();
      });

      const input = document.createElement('input');
      input.type = 'search';
      input.className = 'search-input';
      input.value = state.query;
      input.placeholder = 'Search indexed vault data';
      input.setAttribute('aria-label', 'Search the active vault');
      form.appendChild(input);

      const clear = document.createElement('button');
      clear.type = 'button';
      clear.className = 'search-clear ui-tool-button';
      clear.title = 'Clear search';
      clear.setAttribute('aria-label', 'Clear search');
      const iconRenderer = window.VincariosIconRenderer;
      if (iconRenderer && typeof iconRenderer.createIconElement === 'function') clear.appendChild(iconRenderer.createIconElement('close', 'search-clear-icon'));
      else clear.textContent = 'Clear';
      clear.hidden = !state.query;
      input.addEventListener('input', () => { clear.hidden = !input.value; });
      clear.addEventListener('click', () => {
        state.query = '';
        state.results = [];
        state.message = '';
        render();
      });
      form.appendChild(clear);

      const submit = document.createElement('button');
      submit.type = 'submit';
      submit.className = 'search-submit';
      submit.textContent = 'Search';
      form.appendChild(submit);
      root.appendChild(form);

      const filters = document.createElement('div');
      filters.className = 'search-filters';
      SEARCH_SCOPES.forEach((scope) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'search-filter' + (scope.value === state.scope ? ' is-active' : '');
        button.textContent = scope.label;
        button.setAttribute('aria-pressed', String(scope.value === state.scope));
        button.addEventListener('click', () => {
          state.scope = scope.value;
          state.query = input.value;
          runSearch();
        });
        filters.appendChild(button);
      });
      root.appendChild(filters);

      const notice = document.createElement('div');
      notice.className = 'search-index-notice';
      notice.textContent = getNotice(state);
      root.appendChild(notice);

      const results = document.createElement('div');
      results.className = 'search-results';
      if (!state.query || state.message) {
        results.appendChild(createEmptyState(state.message || 'Enter a filename, path, tag, title, or indexed word.'));
      } else if (!state.results.length) {
        results.appendChild(createEmptyState('No indexed matches found.'));
      } else {
        state.results.forEach((result) => results.appendChild(createResult(result)));
      }
      root.appendChild(results);
    }

    function createResult(result) {
      const row = document.createElement('article');
      row.className = 'search-result';

      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'search-result-open';
      open.title = 'Open in Preview';
      open.addEventListener('click', async () => {
        if (!onOpenResult) return;
        const response = await onOpenResult(result.path);
        if (!response || !response.ok) {
          state.message = response && response.message || 'Could not open the result in Preview.';
          render();
        }
      });
      const title = document.createElement('span');
      title.className = 'search-result-title';
      title.textContent = result.title || result.path;
      const path = document.createElement('span');
      path.className = 'search-result-path';
      path.textContent = result.path;
      const reasons = document.createElement('span');
      reasons.className = 'search-result-reasons';
      reasons.textContent = (result.reasons || []).join(' · ');
      open.append(title, path, reasons);

      const reveal = document.createElement('button');
      reveal.type = 'button';
      reveal.className = 'search-result-reveal ui-tool-button';
      reveal.title = 'Reveal in Files';
      reveal.setAttribute('aria-label', 'Reveal ' + (result.title || result.path) + ' in Files');
      const iconRenderer = window.VincariosIconRenderer;
      if (iconRenderer && typeof iconRenderer.createIconElement === 'function') reveal.appendChild(iconRenderer.createIconElement('folder', 'search-result-reveal-icon'));
      else reveal.textContent = 'Reveal';
      reveal.addEventListener('click', async () => {
        if (!onRevealResult) return;
        const response = await onRevealResult(result.path);
        if (!response || !response.ok) {
          state.message = response && response.message || 'Could not reveal the result in Files.';
          render();
        }
      });

      row.append(open, reveal);
      return row;
    }

    function createEmptyState(message) {
      const empty = document.createElement('div');
      empty.className = 'search-empty-state';
      empty.textContent = message;
      return empty;
    }

    return Object.freeze({ runSearch });
  }

  function getNotice(state) {
    if (state.scope === 'content' && !state.fullText.available) {
      return state.fullText.enabled ? 'Full-text cache needs a refresh before content can be searched.' : 'Enable Full-text Search in Settings to search note bodies.';
    }
    if (state.scope === 'all' && !state.fullText.available) return 'Searching names, paths, titles, and YAML metadata. Full-text content is unavailable.';
    return 'Search stays local. Provider access and R permission are not required.';
  }

  const api = { SEARCH_SCOPES, mountSearchWorkspace };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosSearchWorkspace = Object.freeze(api);
})();
