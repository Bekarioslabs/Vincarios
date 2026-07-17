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
    setButtonIcon(revealButton, 'folder', 'markdown-command-icon');
    setButtonIcon(editButton, 'edit', 'markdown-command-icon');
    setButtonIcon(proposeButton, 'save', 'markdown-command-icon');
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
      clearLoadedPreviewState();
      setCurrentPath('');
      history = [];
      historyIndex = -1;
      if (title) title.textContent = '';
      if (revealButton) revealButton.disabled = true;
      preview.textContent = String(message || 'No file selected.');
      clearPreviewStatus();
      setVisibleMode();
      updateHistoryButtons();
    }

    function setImageAsset(path) {
      const targetPath = String(path || '');
      clearLoadedPreviewState();
      setCurrentPath(targetPath);
      history = [];
      historyIndex = -1;
      if (title) title.textContent = targetPath || 'Image Preview';
      if (revealButton) revealButton.disabled = !targetPath;
      preview.innerHTML = '<figure class="markdown-standalone-image"><img class="markdown-image-embed" data-image-target="' + escapeHtml(targetPath) + '" alt="" data-image-state="pending"></figure>';
      resolveMarkdownImages();
      clearPreviewStatus();
      setVisibleMode();
      updateHistoryButtons();
    }

    function clearLoadedPreviewState() {
      currentSource = '';
      loadedSource = '';
      editButton.disabled = true;
      if (proposeButton) proposeButton.disabled = true;
      mode = 'preview';
      editor.value = '';
    }

    async function handlePreviewClick(event) {
      const link = event.target && event.target.closest
        ? event.target.closest('.markdown-link, .markdown-wikilink')
        : null;
      if (!link || !preview.contains(link)) return;

      const target = link.dataset.linkTarget || '';
      if (!target) return;

      event.preventDefault();
      clearLinkFeedback();
      if (isExternalLinkTarget(target)) {
        showExternalLinkDialog(target);
        return;
      }
      if (!onOpenLink) return;
      const result = await onOpenLink({ target, currentPath });
      if (result && result.ok === false) showLinkFeedback(result.message || 'Linked note not found.');
    }

    function showExternalLinkDialog(url) {
      const normalizedUrl = String(url || '').trim();
      if (!normalizedUrl || typeof document === 'undefined') {
        showLinkFeedback('External link blocked.');
        return;
      }
      const existing = document.querySelector('.markdown-external-link-dialog');
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

      const dialog = document.createElement('div');
      dialog.className = 'markdown-external-link-dialog';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-label', 'Open external link');

      const label = document.createElement('div');
      label.className = 'markdown-external-link-label';
      label.textContent = 'External link';
      const value = document.createElement('div');
      value.className = 'markdown-external-link-value';
      value.textContent = normalizedUrl;

      const actions = document.createElement('div');
      actions.className = 'markdown-external-link-actions';
      const open = createExternalLinkButton('Open in browser', async () => {
        const result = api && typeof api.openExternal === 'function'
          ? await api.openExternal(normalizedUrl)
          : { ok: false, message: 'External browser service unavailable.' };
        if (!result || result.ok === false) showPreviewStatus((result && result.message) || 'Could not open external link.');
        closeExternalDialog(dialog);
      });
      const copy = createExternalLinkButton('Copy link', async () => {
        await writeClipboard(normalizedUrl);
        showPreviewStatus('External link copied.');
        closeExternalDialog(dialog);
      });
      const cancel = createExternalLinkButton('Cancel', () => closeExternalDialog(dialog));
      actions.appendChild(open);
      actions.appendChild(copy);
      actions.appendChild(cancel);

      dialog.appendChild(label);
      dialog.appendChild(value);
      dialog.appendChild(actions);
      app.appendChild(dialog);
      showPreviewStatus('External link requires confirmation.');
    }

    function createExternalLinkButton(label, onClick) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', (event) => {
        event.preventDefault();
        Promise.resolve(onClick()).catch(() => showPreviewStatus('External link action failed.'));
      });
      return button;
    }

    function closeExternalDialog(dialog) {
      if (dialog && dialog.parentNode) dialog.parentNode.removeChild(dialog);
    }

    async function writeClipboard(value) {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(value);
        return true;
      }
      return false;
    }

    function isExternalLinkTarget(target) {
      return /^https?:\/\//i.test(String(target || '').trim());
    }

    async function handleRevealClick() {
      if (!currentPath || !onRevealCurrentPath) return;
      const result = await onRevealCurrentPath(currentPath);
      if (result && result.ok === false) setStatus(result.message || 'Could not reveal file.');
    }

    function showEditor() {
      mode = 'source';
      editor.value = currentSource;
      setEditModeControl(true);
      setVisibleMode();
      editor.focus();
      clearPreviewStatus();
    }

    function openSource(expectedPath) {
      const targetPath = String(expectedPath || '').replace(/\\/g, '/');
      if (!currentPath || (targetPath && currentPath !== targetPath)) return false;
      showEditor();
      return true;
    }

    function showPreviewFromEditor() {
      const changed = String(editor.value || '') !== loadedSource;
      mode = 'preview';
      currentSource = editor.value;
      updateCurrentHistorySource(currentSource);
      renderPreview(currentSource);
      setEditModeControl(false);
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
      setCurrentPath(path);
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

    function setCurrentPath(path) {
      currentPath = String(path || '');
      if (!preview || !preview.dataset) return;
      if (currentPath) preview.dataset.previewCurrentPath = currentPath;
      else delete preview.dataset.previewCurrentPath;
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
      const nextMessage = message || 'Linked note not found.';
      showPreviewStatus(nextMessage);
    }

    function clearLinkFeedback() {
      clearPreviewStatus();
    }
    function renderPreview(source) {
      if (!window.VitruviosMarkdownRenderer || !window.VitruviosMarkdownRenderer.renderMarkdown) {
        preview.textContent = String(source || '');
        return;
      }
      preview.innerHTML = window.VitruviosMarkdownRenderer.renderMarkdown(source);
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
      setEditModeControl(sourceMode);
      updateProposeButton();
    }

    function setEditModeControl(sourceMode) {
      if (!editButton) return;
      const label = sourceMode ? 'Show rendered Markdown preview' : 'Edit Markdown source';
      editButton.setAttribute('aria-label', label);
      editButton.setAttribute('title', label);
    }

    function showPreviewStatus(message) {
      if (!previewStatus) return;
      const hasMessage = Boolean(message);
      previewStatus.textContent = String(message || '');
      if (previewStatus.removeAttribute) previewStatus.removeAttribute('hidden');
      if (previewStatus.classList) previewStatus.classList.toggle('is-empty', !hasMessage);
    }

    function clearPreviewStatus() {
      if (!previewStatus) return;
      previewStatus.textContent = '';
      if (previewStatus.removeAttribute) previewStatus.removeAttribute('hidden');
      if (previewStatus.classList) previewStatus.classList.add('is-empty');
    }

    function setStatus(value) {
      if (!status) return;
      const globalStatus = status.querySelector ? status.querySelector('#status-bar-global') : null;
      if (globalStatus) globalStatus.textContent = value;
      else status.textContent = value;
    }

    setMessage('No file selected.');

    return {
      setSource,
      setMessage,
      setImageAsset,
      openSource,
      getMode: () => mode,
      getCurrentPath: () => currentPath,
      getCurrentSource: () => currentSource
    };
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function setButtonIcon(button, iconName, className) {
    if (!button) return;
    const renderer = getIconRenderer();
    button.textContent = '';
    if (renderer && typeof renderer.createIconElement === 'function' && typeof button.appendChild === 'function') {
      button.appendChild(renderer.createIconElement(iconName, className || 'markdown-history-icon'));
      return;
    }
    button.textContent = iconName === 'chevronLeft' ? '<' : iconName === 'chevronRight' ? '>' : '';
  }

  function getIconRenderer() {
    return (typeof window !== 'undefined' && window.VitruviosIconRenderer) ? window.VitruviosIconRenderer : null;
  }
  const api = { mountMarkdownPreview };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosMarkdownPreview = Object.freeze(api);
})();
