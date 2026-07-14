(function() {
  'use strict';

  const PANEL_IDS = Object.freeze(['leftNav', 'files', 'selectionActions', 'contextBasket']);

  function createPanelLayoutState(initialState) {
    let layout = normalizePanelLayout(initialState);
    const subscribers = new Set();

    function snapshot() {
      return Object.freeze(Object.assign({}, layout));
    }

    function setPanelCollapsed(panelId, collapsed) {
      const key = panelKey(panelId);
      if (!key) return snapshot();
      const next = Boolean(collapsed);
      if (layout[key] === next) return snapshot();
      layout = Object.freeze(Object.assign({}, layout, { [key]: next }));
      notify();
      return snapshot();
    }

    function replace(nextLayout) {
      const next = normalizePanelLayout(nextLayout);
      if (sameLayout(layout, next)) return snapshot();
      layout = next;
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

    return Object.freeze({ snapshot, setPanelCollapsed, replace, subscribe });
  }

  function normalizePanelLayout(value) {
    const input = value || {};
    return Object.freeze({
      leftNavCollapsed: input.leftNavCollapsed === true,
      filesCollapsed: input.filesCollapsed === true,
      selectionActionsCollapsed: input.selectionActionsCollapsed === true,
      contextBasketCollapsed: input.contextBasketCollapsed === true
    });
  }

  function panelKey(panelId) {
    return PANEL_IDS.includes(panelId) ? panelId + 'Collapsed' : '';
  }

  function sameLayout(left, right) {
    return PANEL_IDS.every((panelId) => left[panelKey(panelId)] === right[panelKey(panelId)]);
  }

  const api = { PANEL_IDS, createPanelLayoutState, normalizePanelLayout };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosPanelLayoutState = Object.freeze(api);
})();