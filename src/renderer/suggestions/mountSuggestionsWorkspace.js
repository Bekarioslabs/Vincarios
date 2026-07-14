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

      const visibleItems = group.items.filter((item) => item.dismissed !== true);
      const checkedCount = visibleItems.filter((item) => item.checked === true).length;

      const title = document.createElement('div');
      title.className = 'suggestions-group-title';
      title.title = group.title;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'suggestions-group-check';
      checkbox.checked = visibleItems.length > 0 && checkedCount === visibleItems.length;
      checkbox.indeterminate = checkedCount > 0 && checkedCount < visibleItems.length;
      checkbox.setAttribute('aria-label', 'Select visible suggestions in ' + group.title);
      checkbox.addEventListener('click', (event) => {
        event.stopPropagation();
        if (typeof suggestionState.setGroupChecked === 'function') {
          suggestionState.setGroupChecked(group.id, checkbox.checked);
        }
      });

      const icon = renderGroupIcon(group);
      const label = document.createElement('span');
      label.className = 'suggestions-group-label';
      label.appendChild(renderGroupPrefix(group));
      label.appendChild(document.createTextNode(' - ' + formatGroupTargetName(group)));

      title.appendChild(checkbox);
      if (icon) title.appendChild(icon);
      title.appendChild(label);
      section.appendChild(title);

      visibleItems.forEach((item) => {
        section.appendChild(renderItem(group, item, selectedItem));
      });

      return section;
    }

    function renderGroupIcon(group) {
      const renderer = getIconRenderer();
      if (!renderer || typeof renderer.createIconElement !== 'function') return null;
      return renderer.createIconElement(groupIconName(group), 'suggestions-group-icon');
    }

    function groupIconName(group) {
      const type = groupType(group);
      if (type === 'metadata') return 'metadata';
      if (type === 'similar') return 'search';
      return 'file';
    }

    function renderGroupPrefix(group) {
      const prefix = document.createElement('span');
      prefix.className = 'suggestions-group-prefix';
      const type = groupType(group);
      if (type === 'metadata') prefix.textContent = 'TAG CANDIDATES';
      else if (type === 'similar') prefix.textContent = 'SIMILAR NOTES';
      else prefix.textContent = 'SUGGESTIONS';
      return prefix;
    }

    function groupType(group) {
      const source = String(group && group.source || '').toLowerCase();
      const title = String(group && group.title || '').toLowerCase();
      if (source.includes('tag') || source.includes('metadata') || title.includes('tag candidate')) return 'metadata';
      if (source.includes('similar') || title.includes('similar note')) return 'similar';
      return 'generic';
    }

    function formatGroupTargetName(group) {
      const title = String(group && group.title || 'Suggestions');
      const markerIndex = title.indexOf(':');
      const value = markerIndex > -1 ? title.slice(markerIndex + 1).trim() : title;
      return basename(value) || title;
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
      row.appendChild(renderSuggestionSignal(item, 'list'));
      row.appendChild(renderDismissButton(group, item));

      return row;
    }

    function renderSuggestionSignal(item, variant) {
      if (hasSimilarityScore(item)) return renderScoreRing(item, variant);
      return renderTypeBadge(item, variant);
    }

    function hasSimilarityScore(item) {
      if (String(item && item.kind || '') !== 'similar_note') return false;
      return normalizeScorePercent(item && item.scorePercent) !== null;
    }

    function renderTypeBadge(item, variant) {
      const badge = document.createElement('span');
      badge.className = 'suggestions-type-badge suggestions-type-badge-' + (variant || 'list');
      badge.textContent = formatTypeBadgeLabel(item);
      badge.title = formatTypeBadgeTitle(item);
      return badge;
    }

    function formatTypeBadgeLabel(item) {
      const kind = String(item && item.kind || 'suggestion');
      if (kind === 'metadata_candidate') return 'TAG';
      return 'INFO';
    }

    function formatTypeBadgeTitle(item) {
      const text = [item && item.scoreText, item && item.scoreLabel].filter(Boolean).join(' ');
      return text || 'Suggestion';
    }

    function renderDismissButton(group, item) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'suggestions-item-dismiss review-basket-remove';
      button.title = 'Dismiss';
      button.setAttribute('aria-label', 'Dismiss suggestion: ' + (item.title || item.path || 'suggestion'));
      const renderer = getIconRenderer();
      if (renderer && typeof renderer.createIconElement === 'function') {
        button.appendChild(renderer.createIconElement('close', 'review-remove-icon'));
      } else {
        button.textContent = 'x';
      }
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        suggestionState.dismissItem(group.id, item.id);
      });
      return button;
    }

    function renderScoreRing(item, variant) {
      const percent = normalizeScorePercent(item && item.scorePercent);
      const wrap = document.createElement('span');
      wrap.className = 'suggestions-score-ring-wrap suggestions-score-ring-wrap-' + (variant || 'list') + ' ' + scoreToneClass(item);
      if (percent === null) {
        wrap.textContent = 'n/a';
        return wrap;
      }

      const circumference = 100.531;
      const fill = Math.max(0, Math.min(circumference, circumference * percent / 100));
      const label = scoreMatchLabel(item) + ': ' + String(percent) + '%';

      const ring = document.createElement('span');
      ring.className = 'suggestions-score-ring';
      ring.setAttribute('aria-label', label);
      ring.title = label;

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 40 40');
      svg.setAttribute('aria-hidden', 'true');
      svg.classList.add('suggestions-score-ring-svg');

      const track = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      track.classList.add('suggestions-score-ring-track');
      track.setAttribute('cx', '20');
      track.setAttribute('cy', '20');
      track.setAttribute('r', '16');

      const progress = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      progress.classList.add('suggestions-score-ring-fill');
      progress.setAttribute('cx', '20');
      progress.setAttribute('cy', '20');
      progress.setAttribute('r', '16');
      progress.style.strokeDasharray = fill.toFixed(4) + ' ' + circumference;

      svg.appendChild(track);
      svg.appendChild(progress);
      ring.appendChild(svg);

      const value = document.createElement('span');
      value.className = 'suggestions-score-ring-value';
      value.textContent = String(percent) + '%';
      ring.appendChild(value);
      wrap.appendChild(ring);

      if (variant === 'detail') {
        const copy = document.createElement('span');
        copy.className = 'suggestions-score-ring-copy';
        const title = document.createElement('span');
        title.className = 'suggestions-score-ring-label';
        title.textContent = scoreMatchLabel(item);
        const detail = document.createElement('span');
        detail.className = 'suggestions-score-ring-detail';
        detail.textContent = [item.scoreText, item.scoreLabel].filter(Boolean).join(' ');
        copy.appendChild(title);
        if (detail.textContent) copy.appendChild(detail);
        wrap.appendChild(copy);
      }

      return wrap;
    }


    function scoreMatchLabel(item) {
      const tone = String(item && item.scoreTone || 'neutral');
      if (tone === 'green') return 'Strong match';
      if (tone === 'yellow') return 'Medium match';
      if (tone === 'orange') return 'Possible match';
      if (tone === 'red') return 'Weak match';
      return 'Match';
    }

    function normalizeScorePercent(value) {
      const score = Number(value);
      if (!Number.isFinite(score)) return null;
      return Math.max(0, Math.min(100, Math.round(score)));
    }

    function renderDetail(container, item) {
      container.classList.add('suggestions-detail-grid');
      if (!item) {
        container.appendChild(createEmptyState('file', 'Select a suggestion.', 'Details and preview appear here.', 'suggestions-detail-empty')); 
        return;
      }

      const info = document.createElement('section');
      info.className = 'suggestions-detail-info';

      const scoreSummary = renderSuggestionSignal(item, 'detail');
      if (scoreSummary) info.appendChild(scoreSummary);

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
      const checkedCount = countCheckedSuggestions(snapshot);

      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'chat-message-action-button';
      add.textContent = 'Add selected to Review Basket';
      add.disabled = !conversion.canConvertAll || !reviewBasket || typeof reviewBasket.addProposal !== 'function';
      add.title = conversion.canConvertAll ? 'Add selected metadata suggestions as reviewed update proposals.' : 'Select only convertible metadata_candidate suggestions.';
      add.addEventListener('click', () => convertCheckedSuggestionsToReviewBasket(conversion));
      bar.appendChild(add);

      const clear = document.createElement('button');
      clear.type = 'button';
      clear.className = 'chat-message-action-button suggestions-clear-selected';
      clear.textContent = checkedCount > 0 ? 'Clear selected (' + checkedCount + ')' : 'Clear selected';
      clear.disabled = checkedCount === 0 || !suggestionState || typeof suggestionState.dismissChecked !== 'function';
      clear.title = 'Hide selected suggestions from this session.';
      clear.addEventListener('click', () => {
        if (typeof suggestionState.dismissChecked === 'function') suggestionState.dismissChecked();
      });
      bar.appendChild(clear);

      return bar;
    }

    function countCheckedSuggestions(snapshot) {
      if (!snapshot || !Array.isArray(snapshot.groups)) return 0;
      return snapshot.groups.reduce((total, group) => {
        const items = Array.isArray(group.items) ? group.items : [];
        return total + items.filter((item) => item && item.checked === true && item.dismissed !== true).length;
      }, 0);
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
    return (typeof window !== 'undefined' && window.VitruviosIconRenderer) ? window.VitruviosIconRenderer : null;
  }
  function getDiffLineRenderer() {
    if (typeof window !== 'undefined' && window.VitruviosDiffLineRenderer) return window.VitruviosDiffLineRenderer;
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
    if (typeof window !== 'undefined' && window.VitruviosSuggestionConverters) return window.VitruviosSuggestionConverters;
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
    return basename(value);
  }

  function basename(value) {
    value = String(value || '').replace(/\\/g, '/');
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
  if (typeof window !== 'undefined') window.VitruviosSuggestionsWorkspace = Object.freeze(api);
})();
