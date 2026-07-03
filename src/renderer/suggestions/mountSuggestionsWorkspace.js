(function() {
  'use strict';

  function mountSuggestionsWorkspace(options) {
    options = options || {};
    const root = options.root;
    const suggestionState = options.suggestionState;
    if (!root || !suggestionState || typeof suggestionState.snapshot !== 'function') return null;

    const unsubscribe = typeof suggestionState.subscribe === 'function'
      ? suggestionState.subscribe(render)
      : null;

    render(suggestionState.snapshot());

    function render(snapshot) {
      root.innerHTML = '';
      root.classList.add('suggestions-workspace');

      const header = document.createElement('div');
      header.className = 'suggestions-header';
      header.textContent = 'Suggestions';
      root.appendChild(header);

      if (!snapshot || !Array.isArray(snapshot.groups) || snapshot.groups.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'suggestions-workspace-empty';
        empty.textContent = 'No suggestions yet.';
        root.appendChild(empty);
        return;
      }

      const body = document.createElement('div');
      body.className = 'suggestions-body';

      const list = document.createElement('div');
      list.className = 'suggestions-list';
      snapshot.groups.forEach((group) => list.appendChild(renderGroup(group, snapshot.selectedItem)));

      const detail = document.createElement('div');
      detail.className = 'suggestions-detail';
      renderDetail(detail, snapshot.selectedItem);

      body.appendChild(list);
      body.appendChild(detail);
      root.appendChild(body);
      root.appendChild(renderActionBar());
    }

    function renderGroup(group, selectedItem) {
      const section = document.createElement('section');
      section.className = 'suggestions-group';

      const title = document.createElement('div');
      title.className = 'suggestions-group-title';
      title.textContent = group.title;
      section.appendChild(title);

      group.items.filter((item) => item.dismissed !== true).forEach((item) => {
        section.appendChild(renderItem(group, item, selectedItem));
      });

      return section;
    }

    function renderItem(group, item, selectedItem) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'suggestions-item';
      if (selectedItem && selectedItem.id === item.id) row.classList.add('is-selected');
      row.addEventListener('click', () => suggestionState.selectItem(group.id, item.id));

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = item.checked === true;
      checkbox.addEventListener('click', (event) => {
        event.stopPropagation();
        suggestionState.toggleItem(group.id, item.id);
      });
      row.appendChild(checkbox);

      const text = document.createElement('span');
      text.className = 'suggestions-item-text';
      text.textContent = item.title;
      row.appendChild(text);

      const score = document.createElement('span');
      score.className = 'suggestions-item-score';
      score.textContent = [item.scoreText, item.scoreLabel].filter(Boolean).join(' ');
      row.appendChild(score);

      const dismiss = document.createElement('span');
      dismiss.className = 'suggestions-item-dismiss';
      dismiss.textContent = 'Dismiss';
      dismiss.addEventListener('click', (event) => {
        event.stopPropagation();
        suggestionState.dismissItem(group.id, item.id);
      });
      row.appendChild(dismiss);

      return row;
    }

    function renderDetail(container, item) {
      if (!item) {
        container.textContent = 'Select a suggestion to preview details.';
        return;
      }
      const title = document.createElement('div');
      title.className = 'suggestions-detail-title';
      title.textContent = item.title;
      container.appendChild(title);

      const body = document.createElement('pre');
      body.className = 'suggestions-detail-body';
      body.textContent = item.detail || item.path || 'No detail preview available.';
      container.appendChild(body);
    }

    function renderActionBar() {
      const bar = document.createElement('div');
      bar.className = 'suggestions-action-bar';

      const add = document.createElement('button');
      add.type = 'button';
      add.textContent = 'Add selected to Review Basket';
      add.disabled = true;
      add.title = 'No converter exists for these suggestions yet.';
      bar.appendChild(add);

      return bar;
    }

    return Object.freeze({
      destroy() {
        if (typeof unsubscribe === 'function') unsubscribe();
      }
    });
  }

  const api = { mountSuggestionsWorkspace };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusSuggestionsWorkspace = Object.freeze(api);
})();
