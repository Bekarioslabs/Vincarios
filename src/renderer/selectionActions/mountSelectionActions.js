(function() {
  'use strict';

  function mountSelectionActions(options) {
    options = options || {};
    const app = options.app;
    const contextState = options.contextState;
    const status = options.status || null;
    if (!app || !contextState || typeof contextState.snapshot !== 'function') return null;

    const root = app.querySelector('.selection-actions-pane');
    if (!root) return null;

    const unsubscribe = typeof contextState.subscribe === 'function'
      ? contextState.subscribe(render)
      : null;

    render(contextState.snapshot());

    function render(snapshot) {
      root.innerHTML = '';
      const header = document.createElement('div');
      header.className = 'selection-actions-header';
      header.textContent = 'Selection Actions';
      root.appendChild(header);

      if (!snapshot || snapshot.kind === 'none') {
        const empty = document.createElement('div');
        empty.className = 'selection-actions-empty';
        empty.textContent = 'Select a file or folder.';
        root.appendChild(empty);
        return;
      }

      const target = document.createElement('div');
      target.className = 'selection-actions-target';
      target.textContent = snapshot.path;
      root.appendChild(target);

      const actions = getRegistry().getSelectionActions(snapshot);
      if (!actions.length) {
        const empty = document.createElement('div');
        empty.className = 'selection-actions-empty';
        empty.textContent = 'No actions for this target yet.';
        root.appendChild(empty);
        return;
      }

      actions.forEach((action) => root.appendChild(createActionButton(action, snapshot)));
    }

    function createActionButton(action, snapshot) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'selection-action-button is-' + action.category;
      button.dataset.actionId = action.id;
      button.dataset.actionCategory = action.category;
      if (action.future) button.dataset.futureSlot = action.id;
      button.disabled = action.enabled !== true;
      button.title = action.reason || (action.future ? 'Planned V1 action.' : action.label);

      const category = getCategories().getActionCategory(action.category);
      const tag = document.createElement('span');
      tag.className = 'selection-action-category';
      tag.textContent = category.label;

      const label = document.createElement('span');
      label.className = 'selection-action-label';
      label.textContent = action.label;

      button.appendChild(tag);
      button.appendChild(label);
      button.addEventListener('click', () => runAction(action, snapshot));
      return button;
    }

    function runAction(action, snapshot) {
      if (!action || action.enabled !== true) return;
      if (action.id === 'file.useAsContext') {
        contextState.addContextItem({ kind: 'file', path: snapshot.path, content: snapshot.content });
        setText(status, 'Added to Context Basket: ' + snapshot.path);
        return;
      }
      if (action.id === 'folder.useAsContext') {
        contextState.addContextItem({ kind: 'folder', path: snapshot.path });
        setText(status, 'Added folder to Context Basket: ' + snapshot.path);
      }
    }

    return Object.freeze({
      destroy() {
        if (typeof unsubscribe === 'function') unsubscribe();
      }
    });
  }

  function getRegistry() {
    if (typeof window !== 'undefined' && window.ZeusSelectionActionRegistry) return window.ZeusSelectionActionRegistry;
    if (typeof module !== 'undefined' && module.exports) return require('./actionRegistry');
    throw new Error('ZEUS selection action registry is not available.');
  }

  function getCategories() {
    if (typeof window !== 'undefined' && window.ZeusSelectionActionCategories) return window.ZeusSelectionActionCategories;
    if (typeof module !== 'undefined' && module.exports) return require('./actionCategories');
    throw new Error('ZEUS selection action categories are not available.');
  }

  function setText(node, value) {
    if (node) node.textContent = value;
  }

  const api = { mountSelectionActions };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusSelectionActions = Object.freeze(api);
})();