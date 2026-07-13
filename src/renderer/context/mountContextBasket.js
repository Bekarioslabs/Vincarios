(function() {
  'use strict';

  function mountContextBasket(options) {
    options = options || {};
    const app = options.app;
    const contextState = options.contextState;
    const onActivate = typeof options.onActivate === 'function' ? options.onActivate : null;
    if (!app || !contextState || typeof contextState.snapshot !== 'function') return null;

    const root = app.querySelector('#context-basket');
    const itemsRoot = app.querySelector('#context-basket-items');
    const clearButton = app.querySelector('#context-clear-all');
    const countBadge = app.querySelector('#context-basket-count');
    if (!root || !itemsRoot || !clearButton) return null;

    const unsubscribe = typeof contextState.subscribe === 'function'
      ? contextState.subscribe(render)
      : null;

    clearButton.addEventListener('click', () => {
      if (typeof contextState.clearContextItems === 'function') contextState.clearContextItems();
    });

    render(contextState.snapshot());

    function render(snapshot) {
      const items = Array.isArray(snapshot && snapshot.contextItems) ? snapshot.contextItems : [];
      itemsRoot.innerHTML = '';
      clearButton.disabled = items.length === 0;
      updateCountBadge(countBadge, items);

      if (!items.length) {
        itemsRoot.appendChild(createEmptyState('file', 'No context items.'));
        return;
      }

      items.forEach((item) => itemsRoot.appendChild(createItem(item)));
    }

    function createItem(item) {
      const row = document.createElement('div');
      row.className = 'context-basket-item';
      row.dataset.contextId = item.id;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'context-basket-open';
      button.title = formatItemTitle(item);
      button.setAttribute('aria-label', 'Reveal context item: ' + formatItemTitle(item));

      const icon = document.createElement('span');
      icon.className = 'context-basket-icon';
      renderTargetIcon(icon, item);

      const details = document.createElement('span');
      details.className = 'context-basket-details';

      const label = document.createElement('span');
      label.className = 'context-basket-label';
      label.textContent = formatItemLabel(item);
      details.appendChild(label);

      const pathContext = formatItemPathContext(item);
      if (pathContext) {
        const path = document.createElement('span');
        path.className = 'context-basket-path';
        path.textContent = pathContext;
        details.appendChild(path);
      }

      button.appendChild(icon);
      button.appendChild(details);
      button.addEventListener('click', () => {
        if (onActivate) onActivate(item);
      });

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'context-basket-remove';
      remove.title = 'Remove from context';
      remove.setAttribute('aria-label', 'Remove context item: ' + formatItemTitle(item));
      renderRemoveIcon(remove);
      remove.addEventListener('click', () => {
        if (typeof contextState.removeContextItem === 'function') contextState.removeContextItem(item.id);
      });

      row.appendChild(button);
      row.appendChild(remove);
      return row;
    }

    return Object.freeze({
      destroy() {
        if (typeof unsubscribe === 'function') unsubscribe();
      }
    });
  }



  function createEmptyState(iconName, message) {
    const empty = document.createElement('div');
    empty.className = 'mini-panel-empty mini-panel-empty-rich';
    const renderer = getIconRenderer();
    if (renderer && typeof renderer.createIconElement === 'function') {
      empty.appendChild(renderer.createIconElement(iconName, 'empty-state-icon'));
    }
    const text = document.createElement('span');
    text.textContent = message;
    empty.appendChild(text);
    return empty;
  }
  function updateCountBadge(badge, items) {
    if (!badge) return;
    const count = Array.isArray(items) ? items.length : 0;
    badge.textContent = String(count);
    badge.hidden = count === 0;
  }
  function renderRemoveIcon(button) {
    if (!button) return;
    const renderer = getIconRenderer();
    button.textContent = '';
    if (renderer && typeof renderer.createIconElement === 'function') {
      button.appendChild(renderer.createIconElement('close', 'context-remove-icon'));
      return;
    }
    button.textContent = 'x';
  }

  function getIconRenderer() {
    return (typeof window !== 'undefined' && window.ZeusIconRenderer) ? window.ZeusIconRenderer : null;
  }
  function formatItemLabel(item) {
    return baseName((item && item.path) || '') || formatItemTitle(item);
  }

  function formatItemTitle(item) {
    if (item && item.source === 'dropped_markdown' && item.externalPath) return String(item.externalPath);
    return String((item && item.path) || '');
  }

  function baseName(path) {
    const normalized = String(path || '').replace(/\\/g, '/').replace(/\/+$/g, '');
    const index = normalized.lastIndexOf('/');
    return index >= 0 ? normalized.slice(index + 1) : normalized;
  }

  function renderTargetIcon(element, item) {
    const renderer = getIconRenderer();
    if (renderer && typeof renderer.createIconElement === 'function') {
      element.appendChild(renderer.createIconElement(targetIconFor(item), 'context-basket-icon-svg'));
      return;
    }
    element.textContent = targetIconFallbackLabel(item);
  }

  function targetIconFor(item) {
    if (item && item.kind === 'folder') return 'folder';
    const path = String((item && item.path) || '').toLowerCase();
    if (/\.md$/.test(path)) return 'markdownFile';
    if (/\.(png|jpe?g|gif|webp|bmp|svg)$/.test(path)) return 'image';
    return 'file';
  }

  function targetIconFallbackLabel(item) {
    if (item && item.kind === 'folder') return 'DIR';
    const path = String((item && item.path) || '').toLowerCase();
    if (/\.md$/.test(path)) return 'MD';
    if (/\.(png|jpe?g|gif|webp|bmp|svg)$/.test(path)) return 'IMG';
    return 'FILE';
  }

  function formatItemPathContext(item) {
    const path = formatItemTitle(item).replace(/\\/g, '/').replace(/\/+$/g, '');
    const index = path.lastIndexOf('/');
    if (index <= 0) return '';
    return baseName(path.slice(0, index));
  }

  function fileTypeLabel(path) {
    const value = String(path || '').toLowerCase();
    if (/\.md$/.test(value)) return 'Markdown';
    if (/\.(png|jpe?g|gif|webp|bmp|svg)$/.test(value)) return 'Image';
    return 'File';
  }

  const api = { mountContextBasket, formatItemLabel, formatItemTitle, formatItemPathContext, targetIconFor };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusContextBasket = Object.freeze(api);
})();
