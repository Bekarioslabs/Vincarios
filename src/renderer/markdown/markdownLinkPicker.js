(function() {
  'use strict';

  const MAX_RESULTS = 8;

  function normalizeLinkResults(results) {
    return (Array.isArray(results) ? results : [])
      .filter((result) => /\.md$/i.test(String(result && result.path || '')))
      .slice(0, MAX_RESULTS)
      .map((result) => ({
        path: String(result.path),
        title: basenameWithoutExtension(result.path)
      }));
  }

  function mountMarkdownLinkPicker(options) {
    const input = options || {};
    const root = input.root;
    const api = input.api;
    const onChoose = typeof input.onChoose === 'function' ? input.onChoose : null;
    const onClose = typeof input.onClose === 'function' ? input.onClose : null;
    if (!root || !api || !api.search || typeof api.search.query !== 'function' || !onChoose) return null;

    const state = {
      requestId: 0,
      results: [],
      message: 'Type a note name or path.',
      query: '',
      visible: false
    };

    root.classList.add('markdown-link-picker');
    root.hidden = true;

    function show() {
      state.visible = true;
      state.requestId += 1;
      state.results = [];
      state.message = 'Type a note name or path.';
      state.query = '';
      root.hidden = false;
      render(true);
    }

    function hide(options) {
      const behavior = options || {};
      state.visible = false;
      state.requestId += 1;
      root.hidden = true;
      root.innerHTML = '';
      if (behavior.restoreFocus !== false && onClose) onClose();
    }

    async function search(query) {
      state.query = String(query || '');
      const value = state.query.trim();
      const requestId = ++state.requestId;
      if (!value) {
        state.results = [];
        state.message = 'Type a note name or path.';
        render(true);
        return;
      }

      state.results = [];
      state.message = 'Searching local note names and paths...';
      render(true);
      try {
        const response = await api.search.query({ query: value, scope: 'files' });
        if (requestId !== state.requestId || !state.visible) return;
        if (!response || response.ok === false) {
          state.message = (response && response.message) || 'Build Vault Indexes in Settings to find link targets.';
        } else {
          state.results = normalizeLinkResults(response.results);
          state.message = state.results.length ? '' : 'No matching Markdown note found.';
        }
      } catch (_error) {
        if (requestId !== state.requestId || !state.visible) return;
        state.results = [];
        state.message = 'Build Vault Indexes in Settings to find link targets.';
      }
      render(true);
    }

    function render(focusInput) {
      if (!state.visible) return;
      root.innerHTML = '';

      const row = document.createElement('div');
      row.className = 'markdown-link-picker-row';
      const searchInput = document.createElement('input');
      searchInput.type = 'search';
      searchInput.value = state.query;
      searchInput.className = 'markdown-link-picker-input';
      searchInput.placeholder = 'Find note by name or path';
      searchInput.setAttribute('aria-label', 'Find a Markdown note to link');
      searchInput.setAttribute('data-link-picker-input', '');
      searchInput.addEventListener('input', () => search(searchInput.value));
      searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          hide();
        }
      });

      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'markdown-link-picker-cancel ui-tool-button';
      cancel.textContent = 'x';
      cancel.title = 'Cancel link picker';
      cancel.setAttribute('aria-label', 'Cancel link picker');
      cancel.addEventListener('click', () => hide());
      row.append(searchInput, cancel);
      root.appendChild(row);

      const results = document.createElement('div');
      results.className = 'markdown-link-picker-results';
      if (state.message) {
        const message = document.createElement('div');
        message.className = 'markdown-link-picker-message';
        message.textContent = state.message;
        results.appendChild(message);
      } else {
        state.results.forEach((result) => results.appendChild(createResultButton(result)));
      }
      root.appendChild(results);

      if (focusInput) {
        searchInput.focus();
        searchInput.setSelectionRange(state.query.length, state.query.length);
      }
    }

    function createResultButton(result) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'markdown-link-picker-result';
      button.title = result.path;

      const title = document.createElement('span');
      title.className = 'markdown-link-picker-result-title';
      title.textContent = result.title;
      const path = document.createElement('span');
      path.className = 'markdown-link-picker-result-path';
      path.textContent = result.path;
      button.append(title, path);
      button.addEventListener('click', () => {
        onChoose(result.path);
        hide({ restoreFocus: false });
      });
      return button;
    }

    return Object.freeze({
      show,
      hide,
      isVisible: () => state.visible
    });
  }

  function basenameWithoutExtension(value) {
    return String(value || '').split('/').pop().replace(/\.md$/i, '');
  }

  const api = Object.freeze({ MAX_RESULTS, normalizeLinkResults, mountMarkdownLinkPicker });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosMarkdownLinkPicker = api;
})();