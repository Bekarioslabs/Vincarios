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
    const revealButton = app.querySelector('#markdown-reveal-current');
    const backButton = app.querySelector('#markdown-history-back');
    const forwardButton = app.querySelector('#markdown-history-forward');
    const title = app.querySelector('#markdown-preview-title');
    const linkFeedback = app.querySelector('#markdown-link-feedback');
    const onOpenLink = typeof options.onOpenLink === 'function' ? options.onOpenLink : null;
    const onRevealCurrentPath = typeof options.onRevealCurrentPath === 'function' ? options.onRevealCurrentPath : null;
    const onOpenHistoryPath = typeof options.onOpenHistoryPath === 'function' ? options.onOpenHistoryPath : null;
    let currentSource = '';
    let currentPath = '';
    let mode = 'preview';
    let history = [];
    let historyIndex = -1;

    if (!preview || !editor || !editButton) return null;

    preview.addEventListener('click', handlePreviewClick);
    setButtonIcon(backButton, 'chevronLeft');
    setButtonIcon(forwardButton, 'chevronRight');
    if (revealButton) revealButton.addEventListener('click', handleRevealClick);
    if (backButton) backButton.addEventListener('click', () => moveHistory(-1));
    if (forwardButton) forwardButton.addEventListener('click', () => moveHistory(1));

    editButton.addEventListener('click', () => {
      if (!currentSource) return;
      if (mode === 'preview') showEditor();
      else showPreviewFromEditor();
    });

    function setSource(source, path, behavior) {
      const nextSource = String(source || '');
      const nextPath = String(path || '');
      const shouldRecordHistory = !behavior || behavior.recordHistory !== false;
      setSourceInternal(nextSource, nextPath);
      clearLinkFeedback();
      if (shouldRecordHistory) recordHistory(nextSource, nextPath);
      updateHistoryButtons();
    }

    function setMessage(message) {
      currentSource = '';
      currentPath = '';
      history = [];
      historyIndex = -1;
      if (title) title.textContent = 'Markdown Preview';
      editButton.disabled = true;
      if (revealButton) revealButton.disabled = true;
      mode = 'preview';
      editor.value = '';
      preview.textContent = String(message || 'No file selected.');
      setVisibleMode();
      updateHistoryButtons();
    }

    async function handlePreviewClick(event) {
      const link = event.target && event.target.closest
        ? event.target.closest('.markdown-link, .markdown-wikilink')
        : null;
      if (!link || !preview.contains(link)) return;

      const target = link.dataset.linkTarget || '';
      if (!target || !onOpenLink) return;

      event.preventDefault();
      clearLinkFeedback();
      const result = await onOpenLink({ target, currentPath });
      if (result && result.ok === false) showLinkFeedback(result.message || 'Linked note not found.');
    }

    async function handleRevealClick() {
      if (!currentPath || !onRevealCurrentPath) return;
      const result = await onRevealCurrentPath(currentPath);
      if (result && result.ok === false) setStatus(result.message || 'Could not reveal file.');
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
      updateCurrentHistorySource(currentSource);
      renderPreview(currentSource);
      editButton.textContent = 'Edit';
      setVisibleMode();
      setStatus('Preview updated from local source editor. Not saved to vault.');
    }

    function setSourceInternal(source, path) {
      currentSource = source;
      currentPath = path;
      if (title) title.textContent = currentPath || 'Markdown Preview';
      editButton.disabled = false;
      if (revealButton) revealButton.disabled = !currentPath;
      mode = 'preview';
      editor.value = currentSource;
      renderPreview(currentSource);
      setVisibleMode();
    }

    function recordHistory(source, path) {
      if (!path) return;
      const currentEntry = history[historyIndex];
      if (currentEntry && currentEntry.path === path && currentEntry.source === source) return;
      history = history.slice(0, historyIndex + 1);
      history.push({ source, path });
      historyIndex = history.length - 1;
    }

    async function moveHistory(offset) {
      const nextIndex = historyIndex + offset;
      if (nextIndex < 0 || nextIndex >= history.length) return;
      historyIndex = nextIndex;
      const entry = history[historyIndex];
      setSource(entry.source, entry.path, { recordHistory: false });
      if (onOpenHistoryPath) {
        const result = await onOpenHistoryPath(entry.path);
        if (result && result.ok === false) setStatus(result.message || 'Could not open preview history.');
      }
      updateHistoryButtons();
    }

    function updateCurrentHistorySource(source) {
      if (historyIndex < 0 || !history[historyIndex]) return;
      history[historyIndex] = {
        path: history[historyIndex].path,
        source
      };
    }

    function updateHistoryButtons() {
      if (backButton) backButton.disabled = historyIndex <= 0;
      if (forwardButton) forwardButton.disabled = historyIndex < 0 || historyIndex >= history.length - 1;
    }

    function showLinkFeedback(message) {
      if (linkFeedback) {
        linkFeedback.textContent = String(message || 'Linked note not found.');
        linkFeedback.hidden = false;
      }
      setStatus(message || 'Linked note not found.');
    }

    function clearLinkFeedback() {
      if (!linkFeedback) return;
      linkFeedback.textContent = '';
      linkFeedback.hidden = true;
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
  function setButtonIcon(button, iconName) {
    if (!button) return;
    const renderer = getIconRenderer();
    button.textContent = '';
    if (renderer && typeof renderer.createIconElement === 'function' && typeof button.appendChild === 'function') {
      button.appendChild(renderer.createIconElement(iconName, 'markdown-history-icon'));
      return;
    }
    button.textContent = iconName === 'chevronLeft' ? '<' : '>';
  }

  function getIconRenderer() {
    return (typeof window !== 'undefined' && window.ZeusIconRenderer) ? window.ZeusIconRenderer : null;
  }
  const api = { mountMarkdownPreview };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusMarkdownPreview = Object.freeze(api);
})();