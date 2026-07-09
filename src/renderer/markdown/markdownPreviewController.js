(function() {
  'use strict';

  function mountMarkdownPreview(options) {
    options = options || {};
    const app = options.app;
    const api = options.api || null;
    const status = options.status || null;
    if (!app) return null;

    const preview = app.querySelector('#markdown-preview');
    const editor = app.querySelector('#markdown-source-editor');
    const editButton = app.querySelector('#markdown-edit-toggle');
    const proposeButton = app.querySelector('#markdown-propose-update');
    const revealButton = app.querySelector('#markdown-reveal-current');
    const backButton = app.querySelector('#markdown-history-back');
    const forwardButton = app.querySelector('#markdown-history-forward');
    const title = app.querySelector('#markdown-preview-title');
    const linkFeedback = app.querySelector('#markdown-link-feedback');
    const previewStatus = app.querySelector('#markdown-preview-status');
    const onOpenLink = typeof options.onOpenLink === 'function' ? options.onOpenLink : null;
    const onRevealCurrentPath = typeof options.onRevealCurrentPath === 'function' ? options.onRevealCurrentPath : null;
    const onOpenHistoryPath = typeof options.onOpenHistoryPath === 'function' ? options.onOpenHistoryPath : null;
    const onProposeUpdate = typeof options.onProposeUpdate === 'function' ? options.onProposeUpdate : null;
    let currentSource = '';
    let loadedSource = '';
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
    if (proposeButton) proposeButton.addEventListener('click', handleProposeUpdate);
    if (editor) editor.addEventListener('input', handleEditorInput);

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
      clearPreviewStatus();
      if (shouldRecordHistory) recordHistory(nextSource, nextPath);
      updateHistoryButtons();
    }

    function setMessage(message) {
      currentSource = '';
      loadedSource = '';
      currentPath = '';
      history = [];
      historyIndex = -1;
      if (title) title.textContent = 'Markdown Preview';
      editButton.disabled = true;
      if (revealButton) revealButton.disabled = true;
      if (proposeButton) proposeButton.disabled = true;
      mode = 'preview';
      editor.value = '';
      preview.textContent = String(message || 'No file selected.');
      clearPreviewStatus();
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
      clearPreviewStatus();
    }

    function showPreviewFromEditor() {
      const changed = String(editor.value || '') !== loadedSource;
      mode = 'preview';
      currentSource = editor.value;
      updateCurrentHistorySource(currentSource);
      renderPreview(currentSource);
      editButton.textContent = 'Edit';
      setVisibleMode();
      updateProposeButton();
      if (changed) showPreviewStatus('Preview updated from local source editor. Not saved to vault.');
      else clearPreviewStatus();
    }

    function handleEditorInput() {
      updateProposeButton();
      if (hasLocalChanges()) showPreviewStatus('Local changes are not saved. Use Update to send them to Review Basket.');
      else clearPreviewStatus();
    }

    function setSourceInternal(source, path) {
      currentSource = source;
      loadedSource = source;
      currentPath = path;
      if (title) title.textContent = currentPath || 'Markdown Preview';
      editButton.disabled = false;
      if (revealButton) revealButton.disabled = !currentPath;
      updateProposeButton();
      mode = 'preview';
      editor.value = currentSource;
      renderPreview(currentSource);
      setVisibleMode();
    }

    function handleProposeUpdate() {
      if (!currentPath || !hasLocalChanges()) return;
      if (!onProposeUpdate) {
        showLinkFeedback('Review Basket unavailable.');
        return;
      }
      clearLinkFeedback();
      const proposedContent = getEditorSource();
      const result = onProposeUpdate({
        type: 'update_note',
        title: 'Manual source edit',
        targetPath: currentPath,
        currentContent: loadedSource,
        proposedContent,
        reason: 'Manual Markdown source edit from preview editor.',
        risk: 'medium',
        updateMode: 'whole_note'
      });
      if (result && result.ok === false) {
        showPreviewStatus(result.message || 'Could not add update proposal.');
        return;
      }
      showPreviewStatus('Manual edit proposal added to Review Basket.');
      setStatus('Manual edit proposal added to Review Basket.');
    }

    function hasLocalChanges() {
      return Boolean(currentPath && getEditorSource() !== loadedSource);
    }

    function getEditorSource() {
      return mode === 'source' ? String(editor.value || '') : currentSource;
    }

    function updateProposeButton() {
      if (proposeButton) proposeButton.disabled = !hasLocalChanges();
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
      resolveMarkdownImages();
    }

    function resolveMarkdownImages() {
      if (!api || !api.vault || typeof api.vault.readImageAsset !== 'function') return;
      const images = Array.from(preview.querySelectorAll('img.markdown-image-embed[data-image-target]'));
      images.forEach((image) => resolveMarkdownImage(image));
    }

    async function resolveMarkdownImage(image) {
      const targetPath = image.dataset.imageTarget || '';
      if (!targetPath) return;
      image.dataset.imageState = 'loading';
      const result = await api.vault.readImageAsset({ targetPath, currentPath });
      if (!result || !result.ok || !result.dataUrl) {
        image.dataset.imageState = 'missing';
        image.removeAttribute('src');
        image.setAttribute('title', (result && result.message) || 'Image not available.');
        return;
      }
      image.src = result.dataUrl;
      image.dataset.imageState = 'loaded';
      image.setAttribute('data-image-path', result.path || targetPath);
    }
    function setVisibleMode() {
      const sourceMode = mode === 'source';
      preview.hidden = sourceMode;
      editor.hidden = !sourceMode;
      editButton.textContent = sourceMode ? 'Preview' : 'Edit';
      updateProposeButton();
    }

    function showPreviewStatus(message) {
      if (previewStatus) {
        previewStatus.textContent = String(message || '');
        previewStatus.hidden = !message;
      }
      if (message) setStatus(message);
    }

    function clearPreviewStatus() {
      if (!previewStatus) return;
      previewStatus.textContent = '';
      previewStatus.hidden = true;
    }

    function setStatus(value) {
      if (status) status.textContent = value;
    }

    setMessage('No file selected.');

    return {
      setSource,
      setMessage,
      getMode: () => mode,
      getCurrentPath: () => currentPath,
      getCurrentSource: () => currentSource
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
