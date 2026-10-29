(function() {
  'use strict';

  const MAX_RESULTS = 8;
  const fileTypes = getFileTypesApi();

  function normalizeLinkResults(results) {
    return (Array.isArray(results) ? results : [])
      .filter((result) => fileTypes.isMarkdownPath(result && result.path))
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
      messageTone: 'neutral',
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
      state.messageTone = 'neutral';
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
        state.messageTone = 'neutral';
        render(true);
        return;
      }

      state.results = [];
      state.message = 'Searching local note names and paths...';
      state.messageTone = 'neutral';
      render(true);
      try {
        const response = await api.search.query({ query: value, scope: 'files' });
        if (requestId !== state.requestId || !state.visible) return;
        if (!response || response.ok === false) {
          state.message = getUserFeedback(response, 'Build Vault Indexes in Settings to find link targets.');
          state.messageTone = getUserFeedbackTone(response);
        } else {
          state.results = normalizeLinkResults(response.results);
          state.message = state.results.length ? '' : 'No matching Markdown note found.';
          state.messageTone = 'neutral';
        }
      } catch (_error) {
        if (requestId !== state.requestId || !state.visible) return;
        state.results = [];
        state.message = 'Build Vault Indexes in Settings to find link targets.';
        state.messageTone = 'error';
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
        message.dataset.tone = state.messageTone;
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
    return fileTypes.stripMarkdownExtension(String(value || '').split('/').pop());
  }

  function getUserFeedback(result, fallback) {
    const formatter = typeof window !== 'undefined' ? window.VincariosUserFeedbackMessages : null;
    return formatter && typeof formatter.formatUserFeedback === 'function'
      ? formatter.formatUserFeedback(result, fallback)
      : String(result && (result.message || result.error) || fallback || 'Something went wrong.');
  }

  function getUserFeedbackTone(result) {
    const formatter = typeof window !== 'undefined' ? window.VincariosUserFeedbackMessages : null;
    return formatter && typeof formatter.getUserFeedbackTone === 'function'
      ? formatter.getUserFeedbackTone(result)
      : 'neutral';
  }

  function getFileTypesApi() {
    if (typeof window !== 'undefined' && window.VincariosFileTypes) return window.VincariosFileTypes;
    if (typeof require === 'function') return require('../../shared/fileTypes');
    throw new Error('File types API unavailable.');
  }

  const api = Object.freeze({ MAX_RESULTS, normalizeLinkResults, mountMarkdownLinkPicker });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosMarkdownLinkPicker = api;
})();
