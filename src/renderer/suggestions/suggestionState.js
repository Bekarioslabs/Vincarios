(function() {
  'use strict';

  function createSuggestionState() {
    let groups = [];
    let selected = null;
    const subscribers = new Set();

    function snapshot() {
      const clonedGroups = groups.map(cloneGroup);
      return Object.freeze({
        groups: clonedGroups,
        selectedItem: findSelectedItem(clonedGroups, selected)
      });
    }

    function addGroup(group) {
      const normalized = normalizeGroup(group);
      groups = groups.filter((existing) => existing.id !== normalized.id).concat(normalized);
      if (!selected && normalized.items.length) selected = { groupId: normalized.id, itemId: normalized.items[0].id };
      notify();
      return snapshot();
    }

    function selectItem(groupId, itemId) {
      if (findItem(groups, groupId, itemId)) {
        selected = { groupId: String(groupId), itemId: String(itemId) };
        notify();
      }
      return snapshot();
    }

    function toggleItem(groupId, itemId) {
      groups = groups.map((group) => {
        if (group.id !== String(groupId)) return group;
        return Object.assign({}, group, {
          items: group.items.map((item) => item.id === String(itemId) ? Object.assign({}, item, { checked: item.checked !== true }) : item)
        });
      });
      notify();
      return snapshot();
    }

    function setGroupChecked(groupId, checked) {
      const nextChecked = checked === true;
      groups = groups.map((group) => {
        if (group.id !== String(groupId)) return group;
        return Object.assign({}, group, {
          items: group.items.map((item) => item.dismissed === true ? item : Object.assign({}, item, { checked: nextChecked }))
        });
      });
      notify();
      return snapshot();
    }

    function dismissChecked() {
      groups = groups.map((group) => Object.assign({}, group, {
        items: group.items.map((item) => item.checked === true && item.dismissed !== true ? Object.assign({}, item, { dismissed: true, checked: false }) : item)
      }));
      if (selected) {
        const selectedItem = findItem(groups, selected.groupId, selected.itemId);
        if (!selectedItem || selectedItem.dismissed === true) selected = firstVisibleItem(groups);
      }
      notify();
      return snapshot();
    }

    function dismissItem(groupId, itemId) {
      groups = groups.map((group) => {
        if (group.id !== String(groupId)) return group;
        return Object.assign({}, group, {
          items: group.items.map((item) => item.id === String(itemId) ? Object.assign({}, item, { dismissed: true, checked: false }) : item)
        });
      });
      if (selected && selected.groupId === String(groupId) && selected.itemId === String(itemId)) selected = firstVisibleItem(groups);
      notify();
      return snapshot();
    }

    function clearGroup(groupId) {
      groups = groups.filter((group) => group.id !== String(groupId));
      if (selected && selected.groupId === String(groupId)) selected = firstVisibleItem(groups);
      notify();
      return snapshot();
    }

    function subscribe(listener) {
      if (typeof listener !== 'function') return function noop() {};
      subscribers.add(listener);
      return function unsubscribe() {
        subscribers.delete(listener);
      };
    }

    function notify() {
      const next = snapshot();
      subscribers.forEach((listener) => listener(next));
    }

    return Object.freeze({
      snapshot,
      addGroup,
      selectItem,
      toggleItem,
      setGroupChecked,
      dismissChecked,
      dismissItem,
      clearGroup,
      subscribe
    });
  }

  function normalizeGroup(group) {
    const id = String(group && group.id || 'suggestions');
    const items = Array.isArray(group && group.items) ? group.items : [];
    return Object.freeze({
      id,
      title: String(group && group.title || 'Suggestions'),
      source: String(group && group.source || ''),
      items: items.map((item, index) => normalizeItem(item, index))
    });
  }

  function normalizeItem(item, index) {
    return Object.freeze({
      id: String(item && item.id || 'item-' + index),
      title: String(item && item.title || item && item.path || 'Suggestion'),
      path: String(item && item.path || ''),
      detail: String(item && item.detail || ''),
      scoreLabel: String(item && item.scoreLabel || ''),
      scoreText: String(item && item.scoreText || ''),
      scorePercent: normalizeScorePercent(item && item.scorePercent),
      scoreTone: String(item && item.scoreTone || ''),
      kind: String(item && item.kind || ''),
      checked: item && item.checked === true,
      dismissed: item && item.dismissed === true,
      data: item && item.data ? item.data : null
    });
  }

  function normalizeScorePercent(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return Math.max(0, Math.min(100, Math.round(number)));
  }

  function cloneGroup(group) {
    return Object.freeze(Object.assign({}, group, {
      items: group.items.map((item) => Object.freeze(Object.assign({}, item)))
    }));
  }

  function findSelectedItem(groupList, selectedItem) {
    if (!selectedItem) return null;
    return findItem(groupList, selectedItem.groupId, selectedItem.itemId) || null;
  }

  function findItem(groupList, groupId, itemId) {
    const group = groupList.find((entry) => entry.id === String(groupId));
    if (!group) return null;
    return group.items.find((item) => item.id === String(itemId)) || null;
  }

  function firstVisibleItem(groupList) {
    for (const group of groupList) {
      const item = group.items.find((entry) => entry.dismissed !== true);
      if (item) return { groupId: group.id, itemId: item.id };
    }
    return null;
  }

  const api = { createSuggestionState };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosSuggestionState = Object.freeze(api);
})();
