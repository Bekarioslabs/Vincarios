(function() {
  'use strict';

  function mountSessionLog(options) {
    options = options || {};
    const root = options.root;
    const activityState = options.activityState;
    if (!root || !activityState || typeof activityState.snapshot !== 'function') return null;

    const unsubscribe = typeof activityState.subscribe === 'function'
      ? activityState.subscribe(render)
      : null;

    render(activityState.snapshot());

    function render(snapshot) {
      root.innerHTML = '';
      root.classList.add('session-log-workspace');

      const header = document.createElement('div');
      header.className = 'session-log-header';
      header.textContent = 'Session Log';
      root.appendChild(header);

      const entries = snapshot && Array.isArray(snapshot.entries) ? snapshot.entries : [];
      if (!entries.length) {
        const empty = document.createElement('div');
        empty.className = 'session-log-empty';
        empty.textContent = 'No session events yet.';
        root.appendChild(empty);
        return;
      }

      const list = document.createElement('div');
      list.className = 'session-log-list';
      entries.slice().reverse().forEach((entry) => list.appendChild(renderEntry(entry)));
      root.appendChild(list);
    }

    function renderEntry(entry) {
      const item = document.createElement('article');
      item.className = 'session-log-entry session-log-entry-' + normalizeType(entry.type);

      const time = document.createElement('span');
      time.className = 'session-log-time';
      time.textContent = entry.time || '';
      item.appendChild(time);

      const content = document.createElement('span');
      content.className = 'session-log-content';

      const action = document.createElement('span');
      action.className = 'session-log-action';
      action.textContent = entry.action || 'Info';
      content.appendChild(action);

      if (entry.targetPath) {
        const path = document.createElement('span');
        path.className = 'session-log-path';
        path.textContent = entry.targetPath;
        content.appendChild(path);
      }

      if (entry.detail) {
        const detail = document.createElement('span');
        detail.className = 'session-log-detail';
        detail.textContent = entry.detail;
        content.appendChild(detail);
      }

      item.appendChild(content);
      return item;
    }

    return Object.freeze({
      destroy() {
        if (typeof unsubscribe === 'function') unsubscribe();
      }
    });
  }

  function normalizeType(type) {
    return ['info', 'success', 'warning', 'error'].includes(type) ? type : 'info';
  }

  const api = { mountSessionLog };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosSessionLog = Object.freeze(api);
})();
