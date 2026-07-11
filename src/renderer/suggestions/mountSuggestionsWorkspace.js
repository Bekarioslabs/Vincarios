(function() {
  'use strict';

  function mountSuggestionsWorkspace(options) {
    options = options || {};
    const root = options.root;
    const suggestionState = options.suggestionState;
    const reviewBasket = options.reviewBasket || null;
    const status = options.status || null;
    const converters = getSuggestionConverters();
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
        root.appendChild(createEmptyState('search', 'No suggestions yet.', 'Run Find similar notes or Suggest tags from Selection Actions.', 'suggestions-workspace-empty')); 
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
      root.appendChild(renderActionBar(snapshot));
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
        container.appendChild(createEmptyState('file', 'Select a suggestion.', 'Details and preview appear here.', 'suggestions-detail-empty')); 
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
      preview.appendChild(previewTitle);
      renderSuggestionPreview(preview, item);

      container.appendChild(info);
      container.appendChild(preview);
    }

    function renderActionBar(snapshot) {
      const bar = document.createElement('div');
      bar.className = 'suggestions-action-bar';
      const conversion = converters.getConvertibleCheckedSuggestions(snapshot);

      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'chat-message-action-button';
      add.textContent = 'Add selected to Review Basket';
      add.disabled = !conversion.canConvertAll || !reviewBasket || typeof reviewBasket.addProposal !== 'function';
      add.title = conversion.canConvertAll ? 'Add selected metadata suggestions as reviewed update proposals.' : 'Select only convertible metadata_candidate suggestions.';
      add.addEventListener('click', () => convertCheckedSuggestionsToReviewBasket(conversion));
      bar.appendChild(add);

      return bar;
    }

    function convertCheckedSuggestionsToReviewBasket(conversion) {
      if (!conversion || !conversion.canConvertAll || !reviewBasket || typeof reviewBasket.addProposal !== 'function') return;
      const added = [];
      conversion.convertible.forEach((item) => {
        const result = converters.convertSuggestionToReviewProposal(item);
        if (result.ok) added.push(reviewBasket.addProposal(result.proposal));
      });
      setText(status, added.length ? 'Suggestion proposals added to Review Basket: ' + added.length : 'No convertible suggestions selected.');
    }

    function renderSuggestionPreview(preview, item) {
      const diff = converters.buildSuggestionDiffPreview(item);
      if (!diff || !diff.ok) {
        preview.appendChild(createEmptyState('warning', 'No change preview yet.', 'Only actionable suggestions can show a diff.', 'suggestions-preview-empty')); 
        return;
      }
      const body = document.createElement('div');
      body.className = 'suggestions-preview-diff review-diff-body';
      const summary = document.createElement('div');
      summary.className = 'suggestions-preview-summary';
      summary.textContent = 'Diff: ' + diff.summary;
      body.appendChild(summary);
      getDiffLineRenderer().renderDiffLines(body, diff);
      preview.appendChild(body);
    }

    return Object.freeze({
      destroy() {
        if (typeof unsubscribe === 'function') unsubscribe();
      }
    });
  }

  function createEmptyState(iconName, title, detail, className) {
    const empty = document.createElement('div');
    empty.className = ['suggestions-empty-state', className || ''].filter(Boolean).join(' ');
    const renderer = getIconRenderer();
    if (renderer && typeof renderer.createIconElement === 'function') {
      empty.appendChild(renderer.createIconElement(iconName, 'empty-state-icon'));
    }
    const copy = document.createElement('span');
    copy.className = 'suggestions-empty-copy';
    const titleNode = document.createElement('span');
    titleNode.className = 'suggestions-empty-title';
    titleNode.textContent = title;
    copy.appendChild(titleNode);
    if (detail) {
      const detailNode = document.createElement('span');
      detailNode.className = 'suggestions-empty-detail';
      detailNode.textContent = detail;
      copy.appendChild(detailNode);
    }
    empty.appendChild(copy);
    return empty;
  }

  function getIconRenderer() {
    return (typeof window !== 'undefined' && window.ZeusIconRenderer) ? window.ZeusIconRenderer : null;
  }
  function getDiffLineRenderer() {
    if (typeof window !== 'undefined' && window.ZeusDiffLineRenderer) return window.ZeusDiffLineRenderer;
    if (typeof require === 'function') {
      try {
        return require('../diff/diffLineRenderer');
      } catch (error) {
        // Fall through to the inert renderer below.
      }
    }
    return { renderDiffLines() {} };
  }

  function getSuggestionConverters() {
    if (typeof window !== 'undefined' && window.ZeusSuggestionConverters) return window.ZeusSuggestionConverters;
    if (typeof require === 'function') {
      try {
        return require('./suggestionConverters');
      } catch (error) {
        // Fall through to the inert converter below.
      }
    }
    return {
      getConvertibleCheckedSuggestions() { return { checked: [], convertible: [], canConvertAll: false }; },
      convertSuggestionToReviewProposal() { return { ok: false, code: 'converter_unavailable', message: 'Suggestion converter unavailable.' }; },
      buildSuggestionDiffPreview() { return { ok: false, code: 'converter_unavailable', message: 'Suggestion converter unavailable.' }; }
    };
  }

  function setText(node, text) {
    if (node) node.textContent = text;
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

  const api = { mountSuggestionsWorkspace, formatSuggestionName, formatSuggestionParent, scoreToneClass, getSuggestionConverters };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusSuggestionsWorkspace = Object.freeze(api);
})();
