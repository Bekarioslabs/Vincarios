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

      const visibleGroups = snapshot && Array.isArray(snapshot.groups)
        ? snapshot.groups.filter((group) => group.items.some((item) => item.dismissed !== true))
        : [];
      if (!visibleGroups.length) {
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
      visibleGroups.forEach((group) => list.appendChild(renderGroup(group, snapshot.selectedItem)));

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

      row.title = item.path || item.title;

      const text = document.createElement('span');
      text.className = 'suggestions-item-text';
      const name = document.createElement('span');
      name.className = 'suggestions-item-name';
      name.textContent = formatSuggestionName(item);
      const parent = document.createElement('span');
      parent.className = 'suggestions-item-parent';
      parent.textContent = formatSuggestionParent(item);
      text.appendChild(name);
      if (parent.textContent) text.appendChild(parent);
      row.appendChild(text);

      const score = document.createElement('span');
      score.className = 'suggestions-item-score ' + scoreToneClass(item);
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
      container.classList.add('suggestions-detail-grid');
      if (!item) {
        const empty = document.createElement('div');
        empty.className = 'suggestions-detail-empty';
        empty.textContent = 'Select a suggestion to preview details.';
        container.appendChild(empty);
        return;
      }

      const info = document.createElement('section');
      info.className = 'suggestions-detail-info';

      const title = document.createElement('div');
      title.className = 'suggestions-detail-title';
      title.textContent = item.title;
      info.appendChild(title);

      const body = document.createElement('pre');
      body.className = 'suggestions-detail-body';
      body.textContent = item.detail || item.path || 'No detail available.';
      info.appendChild(body);

      const preview = document.createElement('section');
      preview.className = 'suggestions-preview-slot';
      const previewTitle = document.createElement('div');
      previewTitle.className = 'suggestions-preview-title';
      previewTitle.textContent = 'Preview';
      const previewBody = document.createElement('div');
      previewBody.className = 'suggestions-preview-empty';
      previewBody.textContent = 'No change preview yet. Convert this suggestion to a Review Basket action first.';
      preview.appendChild(previewTitle);
      preview.appendChild(previewBody);

      container.appendChild(info);
      container.appendChild(preview);
    }

    function renderActionBar() {
      const bar = document.createElement('div');
      bar.className = 'suggestions-action-bar';

      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'chat-message-action-button';
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

  function formatSuggestionName(item) {
    const value = String(item && (item.path || item.title) || 'Suggestion').replace(/\\/g, '/');
    const parts = value.split('/').filter(Boolean);
    return parts.length ? parts[parts.length - 1] : value;
  }

  function formatSuggestionParent(item) {
    const value = String(item && item.path || '').replace(/\\/g, '/');
    const parts = value.split('/').filter(Boolean);
    if (parts.length <= 1) return '';
    return parts.slice(0, -1).join('/');
  }

  function scoreToneClass(item) {
    const tone = String(item && item.scoreTone || 'neutral');
    if (tone === 'green') return 'is-score-green';
    if (tone === 'yellow') return 'is-score-yellow';
    if (tone === 'orange') return 'is-score-orange';
    if (tone === 'red') return 'is-score-red';
    return 'is-score-neutral';
  }

  const api = { mountSuggestionsWorkspace, formatSuggestionName, formatSuggestionParent, scoreToneClass };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusSuggestionsWorkspace = Object.freeze(api);
})();
