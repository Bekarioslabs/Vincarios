(function() {
  'use strict';

  const WORKSPACE_DESTINATIONS = Object.freeze(['home', 'search', 'suggestions', 'review']);

  function mountWorkspaceShortcuts(options) {
    options = options || {};
    const app = options.app;
    const workspaceState = options.workspaceState;
    if (!app || !workspaceState || typeof workspaceState.setActiveWorkspace !== 'function' || typeof document === 'undefined') return null;

    const handler = (event) => {
      const command = getWorkspaceShortcut(event);
      if (!command || !applyWorkspaceCommand(app, workspaceState, command)) return;
      event.preventDefault();
      event.stopPropagation();
    };
    const unsubscribeMenu = subscribeToMenuNavigation(options.appMenu, (destination) => {
      applyWorkspaceCommand(app, workspaceState, destination);
    });

    document.addEventListener('keydown', handler, true);
    return Object.freeze({
      destroy() {
        document.removeEventListener('keydown', handler, true);
        unsubscribeMenu();
      }
    });
  }

  function getWorkspaceShortcut(event) {
    if (!event || (!event.ctrlKey && !event.metaKey) || event.altKey) return null;
    const key = String(event.key || '').toLowerCase();
    if (!event.shiftKey && key === 'f') return { workspace: 'search' };
    if (event.shiftKey && key === 's') return { workspace: 'suggestions' };
    if (event.shiftKey && key === 'h') return { workspace: 'home' };
    if (!event.shiftKey && key === ',') return { action: 'settings' };
    return null;
  }

  function applyWorkspaceCommand(app, workspaceState, command) {
    const normalized = normalizeWorkspaceCommand(command);
    if (!normalized || hasOpenDialog(app)) return false;
    if (normalized === 'settings') {
      const button = app.querySelector('[data-open-settings]');
      if (!button || typeof button.click !== 'function') return false;
      button.click();
      return true;
    }
    workspaceState.setActiveWorkspace(normalized);
    return true;
  }

  function normalizeWorkspaceCommand(command) {
    const source = command && typeof command === 'object' ? (command.workspace || command.action) : command;
    const value = String(source || '').trim().toLowerCase();
    if (value === 'settings' || WORKSPACE_DESTINATIONS.includes(value)) return value;
    return '';
  }

  function subscribeToMenuNavigation(appMenu, listener) {
    if (!appMenu || typeof appMenu.onNavigate !== 'function') return function noop() {};
    const unsubscribe = appMenu.onNavigate(listener);
    return typeof unsubscribe === 'function' ? unsubscribe : function noop() {};
  }

  function hasOpenDialog(app) {
    if (!app || typeof app.querySelectorAll !== 'function') return false;
    return Array.from(app.querySelectorAll('[role="dialog"]')).some((dialog) => isVisibleDialog(dialog, app));
  }

  function isVisibleDialog(dialog, app) {
    let current = dialog;
    while (current && current !== app) {
      if (current.hidden === true) return false;
      current = current.parentElement;
    }
    return Boolean(dialog);
  }

  const api = {
    applyWorkspaceCommand,
    getWorkspaceShortcut,
    normalizeWorkspaceCommand,
    mountWorkspaceShortcuts
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosWorkspaceShortcuts = Object.freeze(api);
})();