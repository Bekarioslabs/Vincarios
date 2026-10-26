(function() {
  'use strict';

  function mountMarkdownPreview(options) {
    options = options || {};
    const app = options.app;
    const api = options.api || null;
    const status = options.status || null;
    const resourcePolicy = getPreviewResourcePolicy(options.previewResourcePolicy);
    if (!app || !resourcePolicy) return null;
    const lineEndings = getLineEndingsApi();

    const preview = app.querySelector('#markdown-preview');
    const editor = app.querySelector('#markdown-source-editor');
    const editorToolbar = app.querySelector('#markdown-editor-toolbar');
    const linkPickerRoot = app.querySelector('#markdown-link-picker');
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
    const onResolveUnsavedNavigation = typeof options.onResolveUnsavedNavigation === 'function' ? options.onResolveUnsavedNavigation : null;
    const onPreviewFeedback = typeof options.onPreviewFeedback === 'function' ? options.onPreviewFeedback : null;
    let currentSource = '';
    let loadedSource = '';
    let currentPath = '';
    let mode = 'preview';
    const previewHistory = resourcePolicy.createBoundedPreviewHistory();
    const imageTaskPool = resourcePolicy.createPreviewTaskPool();
    let pendingUnsavedNavigation = null;
    let activeLinkSelection = null;
    let linkPicker = null;

    if (!preview || !editor || !editButton) return null;

    const linkPickerApi = typeof window !== 'undefined' ? window.VincariosMarkdownLinkPicker : null;
    if (linkPickerApi && typeof linkPickerApi.mountMarkdownLinkPicker === 'function') {
      linkPicker = linkPickerApi.mountMarkdownLinkPicker({
        root: linkPickerRoot,
        api,
        onChoose: applyInternalLink,
        onClose: () => {
          activeLinkSelection = null;
          focusEditorWithoutScroll();
        }
      });
    }

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
    if (editorToolbar) editorToolbar.addEventListener('mousedown', preserveEditorSelection);
    if (editorToolbar) editorToolbar.addEventListener('click', handleEditorToolbarClick);
    if (typeof window.addEventListener === 'function') {
      window.addEventListener('beforeunload', (event) => {
        if (!hasLocalChanges()) return;
        event.preventDefault();
        event.returnValue = '';
      });
    }

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
      previewHistory.reset();
      imageTaskPool.invalidate();
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
      previewHistory.reset();
      imageTaskPool.invalidate();
      if (title) title.textContent = targetPath || 'Image Preview';
      if (revealButton) revealButton.disabled = !targetPath;
      imageTaskPool.invalidate();
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
      if (result && result.ok === false) showLinkFeedback(getUserFeedback(result, 'Linked note not found.'));
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
        if (!result || result.ok === false) showPreviewStatus((result && result.message) || 'Could not open external link.', { type: 'error', action: 'External link' });
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
        Promise.resolve(onClick()).catch(() => showPreviewStatus('External link action failed.', { type: 'error', action: 'External link' }));
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
      const changed = hasLocalChanges();
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

    function handleEditorToolbarClick(event) {
      const button = event.target && event.target.closest ? event.target.closest('[data-editor-format], [data-editor-link-picker]') : null;
      if (!button || !editorToolbar || !editorToolbar.contains(button)) return;
      if (button.hasAttribute('data-editor-link-picker')) {
        openInternalLinkPicker();
        return;
      }
      const formatter = typeof window !== 'undefined' ? window.VincariosEditorFormatting : null;
      if (!formatter || typeof formatter.applyEditorFormat !== 'function') return;
      const viewport = captureEditorViewport();
      const result = formatter.applyEditorFormat({
        source: editor.value,
        selectionStart: editor.selectionStart,
        selectionEnd: editor.selectionEnd,
        action: button.dataset.editorFormat
      });
      if (!result || typeof result.source !== 'string') return;
      editor.value = result.source;
      focusEditorWithoutScroll();
      editor.setSelectionRange(result.selectionStart, result.selectionEnd);
      restoreEditorViewport(viewport);
      handleEditorInput();
    }

    function openInternalLinkPicker() {
      if (mode !== 'source' || !linkPicker) return;
      activeLinkSelection = {
        start: editor.selectionStart,
        end: editor.selectionEnd,
        viewport: captureEditorViewport()
      };
      linkPicker.show();
    }

    function applyInternalLink(targetPath) {
      const formatter = typeof window !== 'undefined' ? window.VincariosEditorFormatting : null;
      if (!formatter || typeof formatter.insertInternalWikilink !== 'function' || !activeLinkSelection) return;
      const result = formatter.insertInternalWikilink({
        source: editor.value,
        selectionStart: activeLinkSelection.start,
        selectionEnd: activeLinkSelection.end,
        targetPath
      });
      if (!result || typeof result.source !== 'string') return;
      const viewport = activeLinkSelection.viewport;
      activeLinkSelection = null;
      editor.value = result.source;
      focusEditorWithoutScroll();
      editor.setSelectionRange(result.selectionStart, result.selectionEnd);
      restoreEditorViewport(viewport);
      handleEditorInput();
    }

    function preserveEditorSelection(event) {
      const button = event.target && event.target.closest ? event.target.closest('[data-editor-format], [data-editor-link-picker]') : null;
      if (button && editorToolbar && editorToolbar.contains(button)) event.preventDefault();
    }

    function captureEditorViewport() {
      return { top: editor.scrollTop, left: editor.scrollLeft };
    }

    function restoreEditorViewport(viewport) {
      if (!viewport) return;
      editor.scrollTop = viewport.top;
      editor.scrollLeft = viewport.left;
    }

    function focusEditorWithoutScroll() {
      try {
        editor.focus({ preventScroll: true });
      } catch (_error) {
        editor.focus();
      }
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
      const result = addLocalUpdateProposal();
      if (!result.ok) return;
      const message = result.refreshed ? 'Manual edit proposal refreshed in Review Basket.' : 'Manual edit proposal added to Review Basket.';
      showPreviewStatus(message);
      setStatus(message);
    }

    function addLocalUpdateProposal() {
      if (!currentPath || !hasLocalChanges()) return { ok: false, message: 'No local Markdown changes to review.' };
      if (!onProposeUpdate) {
        showPreviewStatus('Review Basket unavailable.', { type: 'error', action: 'Review Basket' });
        return { ok: false, message: 'Review Basket unavailable.' };
      }
      clearLinkFeedback();
      const result = onProposeUpdate({
        type: 'update_note',
        title: 'Manual source edit',
        targetPath: currentPath,
        currentContent: loadedSource,
        proposedContent: lineEndings.preserveLineEndings(getEditorSource(), loadedSource),
        reason: 'Manual Markdown source edit from preview editor.',
        risk: 'medium',
        updateMode: 'whole_note'
      });
      if (result && result.ok === false) {
        showPreviewStatus(result.message || 'Could not add update proposal.', { type: 'error', action: 'Review Basket' });
        return result;
      }
      return { ok: true };
    }

    async function requestNavigation(nextPath) {
      const targetPath = String(nextPath || '').replace(/\\/g, '/');
      if (!currentPath || !hasLocalChanges() || !targetPath || targetPath === currentPath) return { ok: true };
      const request = { currentPath, targetPath };
      const decision = await resolveUnsavedNavigation(request);
      if (decision === 'review') {
        const proposal = addLocalUpdateProposal();
        if (!proposal.ok) return { ok: false, reason: 'review_failed', message: proposal.message };
        setStatus(proposal.refreshed ? 'Manual edit proposal refreshed in Review Basket.' : 'Manual edit proposal added to Review Basket.');
        return { ok: true, reason: 'review' };
      }
      if (decision === 'discard') return { ok: true, reason: 'discard' };
      return { ok: false, reason: 'stay' };
    }

    async function resolveUnsavedNavigation(request) {
      if (onResolveUnsavedNavigation) return onResolveUnsavedNavigation(request);
      if (!pendingUnsavedNavigation) {
        pendingUnsavedNavigation = showUnsavedNavigationDialog(request)
          .finally(() => { pendingUnsavedNavigation = null; });
      }
      return pendingUnsavedNavigation;
    }

    function showUnsavedNavigationDialog(request) {
      if (typeof document === 'undefined' || !app || typeof app.appendChild !== 'function') return Promise.resolve('stay');
      const existing = app.querySelector ? app.querySelector('.markdown-unsaved-navigation-overlay') : null;
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

      return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'review-modal-overlay markdown-unsaved-navigation-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'markdown-unsaved-navigation-title');

        const dialog = document.createElement('section');
        dialog.className = 'review-modal markdown-unsaved-navigation-dialog';
        const heading = document.createElement('h2');
        heading.id = 'markdown-unsaved-navigation-title';
        heading.textContent = 'Unsaved local changes';
        const message = document.createElement('p');
        message.className = 'markdown-unsaved-navigation-message';
        message.textContent = 'Your changes to the current note are not saved to the vault.';
        const target = document.createElement('div');
        target.className = 'markdown-unsaved-navigation-target';
        target.textContent = request.currentPath;
        const actions = document.createElement('div');
        actions.className = 'review-modal-actions markdown-unsaved-navigation-actions';
        const stay = createUnsavedNavigationButton('Stay', 'review-modal-cancel', 'stay', resolve, overlay);
        const review = createUnsavedNavigationButton('Add to Review', 'review-modal-confirm', 'review', resolve, overlay);
        const discard = createUnsavedNavigationButton('Discard changes', 'markdown-unsaved-navigation-discard', 'discard', resolve, overlay);
        actions.append(stay, review, discard);
        dialog.append(heading, message, target, actions);
        overlay.appendChild(dialog);
        app.appendChild(overlay);
        if (stay && typeof stay.focus === 'function') stay.focus();
      });
    }

    function createUnsavedNavigationButton(label, className, decision, resolve, overlay) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = className;
      button.textContent = label;
      button.addEventListener('click', () => {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        resolve(decision);
      });
      return button;
    }

    function hasLocalChanges() {
      return Boolean(currentPath && lineEndings.normalizeLineEndings(getEditorSource()) !== lineEndings.normalizeLineEndings(loadedSource));
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
      previewHistory.push({ source, path });
    }

    async function moveHistory(offset) {
      const entry = previewHistory.move(offset);
      if (!entry) return;
      setSource(entry.source, entry.path, { recordHistory: false });
      if (onOpenHistoryPath) {
        const result = await onOpenHistoryPath(entry.path);
        if (result && result.ok === false) setStatus(result.message || 'Could not open preview history.');
      }
      updateHistoryButtons();
    }

    function updateCurrentHistorySource(source) {
      previewHistory.replaceCurrent(source);
    }

    function updateHistoryButtons() {
      if (backButton) backButton.disabled = !previewHistory.canMove(-1);
      if (forwardButton) forwardButton.disabled = !previewHistory.canMove(1);
    }

    function showLinkFeedback(message) {
      const nextMessage = message || 'Linked note not found.';
      showPreviewStatus(nextMessage, { type: 'warning', action: 'Preview link' });
    }

    function getUserFeedback(result, fallback) {
      const formatter = typeof window !== 'undefined' ? window.VincariosUserFeedbackMessages : null;
      return formatter && typeof formatter.formatUserFeedback === 'function'
        ? formatter.formatUserFeedback(result, fallback)
        : String(result && (result.message || result.error) || fallback || 'Something went wrong.');
    }

    function clearLinkFeedback() {
      clearPreviewStatus();
    }
    function renderPreview(source) {
      imageTaskPool.invalidate();
      if (!window.VincariosMarkdownRenderer || !window.VincariosMarkdownRenderer.renderMarkdown) {
        preview.textContent = String(source || '');
        return;
      }
      preview.innerHTML = window.VincariosMarkdownRenderer.renderMarkdown(source);
      resolveMarkdownImages();
    }

    function resolveMarkdownImages() {
      if (!api || !api.vault || typeof api.vault.readImageAsset !== 'function') return;
      const images = Array.from(preview.querySelectorAll('img.markdown-image-embed[data-image-target]'));
      images.forEach((image) => scheduleMarkdownImage(image));
    }

    function scheduleMarkdownImage(image) {
      const targetPath = image.dataset.imageTarget || '';
      if (!targetPath) return;
      const sourcePath = currentPath;
      image.dataset.imageState = 'loading';
      const scheduled = imageTaskPool.run(() => api.vault.readImageAsset({ targetPath, currentPath: sourcePath }));
      scheduled.promise
        .then((result) => {
          if (!imageTaskPool.isCurrent(scheduled.generation) || !preview.contains(image)) return;
          applyMarkdownImageResult(image, targetPath, result);
        })
        .catch(() => {
          if (!imageTaskPool.isCurrent(scheduled.generation) || !preview.contains(image)) return;
          applyMarkdownImageResult(image, targetPath, null);
        });
    }

    function applyMarkdownImageResult(image, targetPath, result) {
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
      if (editorToolbar) editorToolbar.hidden = !sourceMode;
      if (!sourceMode && linkPicker) {
        activeLinkSelection = null;
        linkPicker.hide({ restoreFocus: false });
      }
      setEditModeControl(sourceMode);
      updateProposeButton();
    }

    function setEditModeControl(sourceMode) {
      if (!editButton) return;
      const label = sourceMode ? 'Show rendered Markdown preview' : 'Edit Markdown source';
      editButton.setAttribute('aria-label', label);
      editButton.setAttribute('title', label);
    }

    function showPreviewStatus(message, activity) {
      if (!previewStatus) return;
      const hasMessage = Boolean(message);
      previewStatus.textContent = String(message || '');
      if (previewStatus.removeAttribute) previewStatus.removeAttribute('hidden');
      if (previewStatus.classList) previewStatus.classList.toggle('is-empty', !hasMessage);
      if (hasMessage && activity && onPreviewFeedback) {
        onPreviewFeedback({
          message: String(message),
          targetPath: currentPath,
          type: String(activity.type || 'info'),
          action: String(activity.action || 'Preview')
        });
      }
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
      getCurrentSource: () => currentSource,
      requestNavigation
    };
  }

  function getLineEndingsApi() {
    if (typeof window !== 'undefined' && window.VincariosLineEndings) return window.VincariosLineEndings;
    if (typeof require === 'function') return require('../../shared/text/lineEndings');
    throw new Error('Line endings API unavailable.');
  }

  function getPreviewResourcePolicy(override) {
    if (override && typeof override.createBoundedPreviewHistory === 'function' && typeof override.createPreviewTaskPool === 'function') return override;
    if (typeof window !== 'undefined' && window.VincariosPreviewResourcePolicy) return window.VincariosPreviewResourcePolicy;
    if (typeof require === 'function') {
      try {
        return require('./previewResourcePolicy');
      } catch (_error) {
        return null;
      }
    }
    return null;
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
    return (typeof window !== 'undefined' && window.VincariosIconRenderer) ? window.VincariosIconRenderer : null;
  }
  const api = { mountMarkdownPreview };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosMarkdownPreview = Object.freeze(api);
})();
