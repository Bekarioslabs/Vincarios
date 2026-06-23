(function() {
  'use strict';

  function mountMarkdownPreview(options) {
    options = options || {};
    const app = options.app;
    const status = options.status || null;
    if (!app) return null;

    const preview = app.querySelector('#markdown-preview');
    const editor = app.querySelector('#markdown-source-editor');
    const editButton = app.querySelector('#markdown-edit-toggle');
    const title = app.querySelector('#markdown-preview-title');
    let currentSource = '';
    let currentPath = '';
    let mode = 'preview';

    if (!preview || !editor || !editButton) return null;

    editButton.addEventListener('click', () => {
      if (!currentSource) return;
      if (mode === 'preview') showEditor();
      else showPreviewFromEditor();
    });

    function setSource(source, path) {
      currentSource = String(source || '');
      currentPath = String(path || '');
      if (title) title.textContent = currentPath || 'Markdown Preview';
      editButton.disabled = false;
      mode = 'preview';
      editor.value = currentSource;
      renderPreview(currentSource);
      setVisibleMode();
    }

    function setMessage(message) {
      currentSource = '';
      currentPath = '';
      if (title) title.textContent = 'Markdown Preview';
      editButton.disabled = true;
      mode = 'preview';
      editor.value = '';
      preview.textContent = String(message || 'No file selected.');
      setVisibleMode();
    }

    function showEditor() {
      mode = 'source';
      editor.value = currentSource;
      editButton.textContent = 'Preview';
      setVisibleMode();
      editor.focus();
      setStatus('Source editor is local only. Saving will use Review/Write later.');
    }

    function showPreviewFromEditor() {
      mode = 'preview';
      currentSource = editor.value;
      renderPreview(currentSource);
      editButton.textContent = 'Edit';
      setVisibleMode();
      setStatus('Preview updated from local source editor. Not saved to vault.');
    }

    function renderPreview(source) {
      if (!window.ZeusMarkdownRenderer || !window.ZeusMarkdownRenderer.renderMarkdown) {
        preview.textContent = String(source || '');
        return;
      }
      preview.innerHTML = window.ZeusMarkdownRenderer.renderMarkdown(source);
    }

    function setVisibleMode() {
      const sourceMode = mode === 'source';
      preview.hidden = sourceMode;
      editor.hidden = !sourceMode;
      editButton.textContent = sourceMode ? 'Preview' : 'Edit';
    }

    function setStatus(value) {
      if (status) status.textContent = value;
    }

    setMessage('No file selected.');

    return {
      setSource,
      setMessage,
      getMode: () => mode,
      getCurrentPath: () => currentPath
    };
  }

  const api = { mountMarkdownPreview };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusMarkdownPreview = Object.freeze(api);
})();