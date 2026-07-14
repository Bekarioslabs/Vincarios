(function() {
  'use strict';

  const WORKSPACES = Object.freeze(['chat', 'suggestions', 'sessionLog']);
  const DEFAULT_WORKSPACE = 'chat';

  function createWorkspaceState(initialState) {
    let activeWorkspace = normalizeWorkspace(initialState && initialState.activeWorkspace);
    const subscribers = new Set();

    function snapshot() {
      return Object.freeze({ activeWorkspace });
    }

    function setActiveWorkspace(nextWorkspace) {
      const normalized = normalizeWorkspace(nextWorkspace);
      if (normalized === activeWorkspace) return snapshot();
      activeWorkspace = normalized;
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
      const nextSnapshot = snapshot();
      subscribers.forEach((listener) => listener(nextSnapshot));
    }

    return Object.freeze({
      snapshot,
      setActiveWorkspace,
      subscribe
    });
  }

  function normalizeWorkspace(value) {
    return WORKSPACES.includes(value) ? value : DEFAULT_WORKSPACE;
  }

  const api = {
    WORKSPACES,
    DEFAULT_WORKSPACE,
    createWorkspaceState,
    normalizeWorkspace
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosWorkspaceState = Object.freeze(api);
})();
