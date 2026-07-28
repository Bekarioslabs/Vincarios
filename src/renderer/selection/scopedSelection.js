(function() {
  'use strict';

  const REGION_DEFINITIONS = Object.freeze([
    {
      id: 'chat-message',
      match: '.chat-message-body',
      select: '.chat-message-body',
      menuActions: ['copy', 'select-area']
    },
    {
      id: 'markdown-preview',
      match: '.markdown-preview',
      select: '.markdown-preview',
      menuActions: ['copy', 'select-area']
    },
    {
      id: 'file-tree',
      match: '.file-row',
      select: '.file-tree',
      menuActions: []
    },
    {
      id: 'review-basket',
      match: '.review-basket-item',
      select: '#review-basket-items',
      menuActions: ['copy', 'select-area']
    },
    {
      id: 'context-basket',
      match: '.context-basket-item',
      select: '#context-basket-items',
      menuActions: ['copy', 'select-area']
    },
    {
      id: 'chat-input',
      match: '.chat-input-shell',
      select: '.chat-input-shell',
      nativeInput: true,
      menuActions: ['cut', 'copy', 'paste', 'select-area']
    },
    {
      id: 'markdown-editor',
      match: '.markdown-source-editor',
      select: '.markdown-source-editor',
      nativeInput: true,
      menuActions: ['cut', 'copy', 'paste', 'select-area']
    }
  ]);

  function mountScopedSelection(options) {
    options = options || {};
    const app = options.app;
    if (!app || typeof document === 'undefined') return null;

    let hoveredRegion = null;
    let pointerInsideApp = false;
    let menu = null;

    app.addEventListener('mousemove', (event) => {
      pointerInsideApp = true;
      hoveredRegion = findScopedSelectionRegion(event.target);
    });

    document.addEventListener('mousemove', handleDocumentMousemove, true);
    document.addEventListener('keydown', handleDocumentKeydown, true);

    app.addEventListener('contextmenu', (event) => {
      const region = findScopedSelectionRegion(event.target);
      const actions = getContextMenuActionsForRegion(region);
      if (!region || !region.element || actions.length === 0) return;

      event.preventDefault();
      hoveredRegion = region;
      closeMenu();
      menu = createContextMenu({
        actions,
        x: event.clientX,
        y: event.clientY,
        onSelect: () => selectRegion(region.element),
        onCopyLink: () => copyPreviewLink(region.element),
        onCopy: () => copyRegion(region.element),
        onCut: () => cutEditableRegion(region.element),
        onPaste: () => pasteEditableRegion(region.element)
      });
      document.body.appendChild(menu);
    });

    document.addEventListener('click', closeMenu);

    return Object.freeze({
      destroy() {
        closeMenu();
        document.removeEventListener('mousemove', handleDocumentMousemove, true);
        document.removeEventListener('keydown', handleDocumentKeydown, true);
        document.removeEventListener('click', closeMenu);
      }
    });

    function handleDocumentMousemove(event) {
      pointerInsideApp = app.contains(event.target);
      if (!pointerInsideApp) hoveredRegion = null;
    }

    function handleDocumentKeydown(event) {
      if (event.key === 'Escape') {
        closeMenu();
        return;
      }

      if (!isSelectAllShortcut(event)) return;
      if (shouldPreserveNativeInputShortcut(event)) return;

      const focusedRegion = findScopedSelectionRegion(event.target);
      const region = focusedRegion || hoveredRegion;
      const eventInsideApp = pointerInsideApp || app.contains(event.target);
      if (!eventInsideApp && !region) return;

      if (!region || !region.element) {
        event.preventDefault();
        return;
      }
      if (region.nativeInput) return;

      event.preventDefault();
      selectRegion(region.element);
    }

    function closeMenu() {
      if (menu && menu.parentNode) menu.parentNode.removeChild(menu);
      menu = null;
    }
  }

  function createContextMenu(options) {
    const root = document.createElement('div');
    root.className = 'scoped-selection-menu';
    root.style.left = Math.max(0, options.x) + 'px';
    root.style.top = Math.max(0, options.y) + 'px';

    if (options.actions.includes('copy-link')) root.appendChild(createMenuButton('Copy as link', options.onCopyLink));
    if (options.actions.includes('cut')) root.appendChild(createMenuButton('Cut', options.onCut));
    if (options.actions.includes('copy')) root.appendChild(createMenuButton('Copy', options.onCopy));
    if (options.actions.includes('paste')) root.appendChild(createMenuButton('Paste', options.onPaste));
    if (options.actions.includes('select-area')) root.appendChild(createMenuButton('Select area', options.onSelect));
    return root;
  }

  function createMenuButton(label, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'scoped-selection-menu-button';
    button.textContent = label;
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      if (typeof onClick === 'function') onClick();
      const menu = button.closest('.scoped-selection-menu');
      if (menu && menu.parentNode) menu.parentNode.removeChild(menu);
    });
    return button;
  }

  function findScopedSelectionRegion(target) {
    if (!target || typeof target.closest !== 'function') return null;

    for (const definition of REGION_DEFINITIONS) {
      const matched = target.closest(definition.match);
      if (!matched) continue;
      const element = definition.nativeInput
        ? matched
        : (definition.select === definition.match ? matched : matched.closest(definition.select) || matched);
      return Object.assign({}, definition, { element });
    }

    return null;
  }

  function selectRegion(element) {
    if (!element) return false;
    if (isSelectableInput(element)) {
      element.select();
      return true;
    }

    const selection = window.getSelection && window.getSelection();
    if (!selection || !document.createRange) return false;
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  }

  async function copyRegion(element) {
    if (!element) return false;
    if (isSelectableInput(element)) {
      const selected = getInputSelectedText(element);
      return writeClipboard(selected || String(element.value || ''));
    }
    const text = getCopyTextForRegion({
      selectedText: getSelectedTextInside(element),
      regionText: getElementText(element)
    });
    if (!text) return false;
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
    if (document.execCommand) {
      const cleanup = selectTextForLegacyCopy(text);
      try {
        return cleanup ? document.execCommand('copy') : false;
      } finally {
        if (typeof cleanup === 'function') cleanup();
      }
    }
    return false;
  }

  async function copyPreviewLink(element) {
    const link = getPreviewLinkForPath(element && element.dataset ? element.dataset.previewCurrentPath : '');
    if (!link) return false;
    return writeClipboard(link);
  }

  async function cutEditableRegion(element) {
    if (!isEditableInput(element)) return false;
    const selected = getInputSelectedText(element);
    if (!selected) return false;
    const copied = await writeClipboard(selected);
    if (!copied) return false;
    replaceInputSelection(element, '');
    return true;
  }

  async function pasteEditableRegion(element) {
    if (!isEditableInput(element)) return false;
    if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
      const text = await navigator.clipboard.readText();
      replaceInputSelection(element, text);
      return true;
    }
    element.focus();
    return !!(document.execCommand && document.execCommand('paste'));
  }

  async function writeClipboard(text) {
    if (!text) return false;
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
    if (document.execCommand) {
      const cleanup = selectTextForLegacyCopy(text);
      try {
        return cleanup ? document.execCommand('copy') : false;
      } finally {
        if (typeof cleanup === 'function') cleanup();
      }
    }
    return false;
  }

  function getInputSelectedText(element) {
    if (!isSelectableInput(element)) return '';
    const start = Number.isInteger(element.selectionStart) ? element.selectionStart : 0;
    const end = Number.isInteger(element.selectionEnd) ? element.selectionEnd : start;
    if (end <= start) return '';
    return String(element.value || '').slice(start, end);
  }

  function replaceInputSelection(element, text) {
    if (!isEditableInput(element)) return false;
    const value = String(element.value || '');
    const start = Number.isInteger(element.selectionStart) ? element.selectionStart : value.length;
    const end = Number.isInteger(element.selectionEnd) ? element.selectionEnd : start;
    const next = value.slice(0, start) + String(text || '') + value.slice(end);
    element.value = next;
    const cursor = start + String(text || '').length;
    element.selectionStart = cursor;
    element.selectionEnd = cursor;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.focus();
    return true;
  }
  function selectTextForLegacyCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    return () => textarea.remove();
  }

  function getSelectedTextInside(element) {
    const selection = window.getSelection && window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return '';
    const range = selection.getRangeAt(0);
    const node = range.commonAncestorContainer;
    const container = node && node.nodeType === 1 ? node : node && node.parentElement;
    if (!container || (container !== element && !element.contains(container))) return '';
    return String(selection.toString() || '');
  }

  function getElementText(element) {
    return String((element && (element.innerText || element.textContent)) || '');
  }

  function getPreviewLinkForPath(filePath) {
    const normalized = normalizePreviewPath(filePath);
    if (!normalized) return '';
    if (isImagePreviewPath(normalized)) return '![[' + normalized + ']]';
    if (isMarkdownPreviewPath(normalized)) return '[[' + normalized.replace(/\.(md|markdown)$/i, '') + ']]';
    return '[[' + normalized + ']]';
  }

  function normalizePreviewPath(filePath) {
    return String(filePath || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').trim();
  }

  function isMarkdownPreviewPath(filePath) {
    return /\.(md|markdown)$/i.test(String(filePath || ''));
  }

  function isImagePreviewPath(filePath) {
    return /\.(png|jpe?g|webp|gif|svg|bmp|ico)$/i.test(String(filePath || ''));
  }

  function getCopyTextForRegion(options) {
    options = options || {};
    const selected = String(options.selectedText || '').trim();
    if (selected) return String(options.selectedText || '');
    return String(options.regionText || '');
  }

  function isSelectableInput(element) {
    const tag = String((element && element.tagName) || '').toLowerCase();
    return tag === 'textarea' || tag === 'input';
  }

  function isEditableInput(element) {
    return isSelectableInput(element) && element.disabled !== true && element.readOnly !== true;
  }

  function getContextMenuActionsForRegion(region) {
    if (!region) return [];
    const definition = REGION_DEFINITIONS.find((item) => item.id === region.id);
    const actions = definition && Array.isArray(definition.menuActions) ? definition.menuActions.slice() : [];
    if (region.id === 'markdown-preview' && hasPreviewLinkPath(region.element)) actions.unshift('copy-link');
    if (region.nativeInput && !isEditableInput(region.element)) return actions.filter((action) => action === 'copy' || action === 'select-area');
    return actions;
  }

  function hasPreviewLinkPath(element) {
    return Boolean(element && element.dataset && normalizePreviewPath(element.dataset.previewCurrentPath));
  }

  function getScopedSelectionRegionForClassNames(classNames) {
    const values = Array.isArray(classNames) ? classNames : [];
    for (const definition of REGION_DEFINITIONS) {
      const className = definition.match.slice(1);
      if (values.includes(className)) return {
        id: definition.id,
        match: definition.match,
        select: definition.select
      };
    }
    return null;
  }

  function shouldPreserveNativeInputShortcut(event) {
    return isEditableInput(event && event.target);
  }

  function isSelectAllShortcut(event) {
    if (!event) return false;
    return String(event.key || '').toLowerCase() === 'a' && !!(event.ctrlKey || event.metaKey);
  }

  function isCopyShortcut(event) {
    if (!event) return false;
    return String(event.key || '').toLowerCase() === 'c' && !!(event.ctrlKey || event.metaKey);
  }

  const api = {
    mountScopedSelection,
    findScopedSelectionRegion,
    getContextMenuActionsForRegion,
    getCopyTextForRegion,
    getPreviewLinkForPath,
    getScopedSelectionRegionForClassNames,
    isCopyShortcut,
    isSelectAllShortcut,
    shouldPreserveNativeInputShortcut
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosScopedSelection = Object.freeze(api);
})();
