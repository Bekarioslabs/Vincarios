(function() {
  'use strict';

  function mountPaneResize(app) {
    if (!app) return null;

    const vaultHandle = app.querySelector('[data-resize="vault"]');
    const filesHandle = app.querySelector('[data-resize="files"]');
    const previewHandle = app.querySelector('[data-resize="preview"]');

    const cleanup = [];
    if (vaultHandle) cleanup.push(bindHorizontalResize({
      handle: vaultHandle,
      onMove: (event) => resizeVault(app, event.clientX)
    }));

    if (filesHandle) cleanup.push(bindHorizontalResize({
      handle: filesHandle,
      onMove: (event) => resizeFiles(app, event.clientX)
    }));

    if (previewHandle) cleanup.push(bindHorizontalResize({
      handle: previewHandle,
      onMove: (event) => resizePreview(app, event.clientY)
    }));

    return {
      destroy() {
        cleanup.forEach((fn) => fn());
      }
    };
  }

  function bindHorizontalResize(options) {
    const handle = options.handle;
    const onMove = options.onMove;

    function start(event) {
      event.preventDefault();
      document.body.classList.add('is-resizing');
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', stop);
    }

    function move(event) {
      onMove(event);
    }

    function stop() {
      document.body.classList.remove('is-resizing');
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', stop);
    }

    handle.addEventListener('mousedown', start);
    return function cleanup() {
      handle.removeEventListener('mousedown', start);
      stop();
    };
  }

  function resizeVault(app, clientX) {
    const workspace = app.querySelector('.workspace');
    const leftNav = app.querySelector('.left-nav');
    if (!workspace || !leftNav) return;

    const rect = workspace.getBoundingClientRect();
    const leftWidth = leftNav.getBoundingClientRect().width;
    const minMain = readPx(app, '--min-main-width', 420);
    const minVault = readPx(app, '--min-vault-width', 520);
    const handleWidth = 14;
    const available = rect.width - leftWidth - handleWidth;
    const proposed = rect.right - clientX;
    const next = clamp(proposed, minVault, Math.max(minVault, available - minMain));

    app.style.setProperty('--vault-panel-width', Math.round(next) + 'px');
  }

  function resizeFiles(app, clientX) {
    const vaultPanel = app.querySelector('.vault-panel');
    if (!vaultPanel) return;

    const rect = vaultPanel.getBoundingClientRect();
    const minFiles = readPx(app, '--min-file-tree-width', 170);
    const minActions = 220;
    const handleWidth = 7;
    const proposed = clientX - rect.left;
    const maxFiles = rect.width - minActions - handleWidth;
    const next = clamp(proposed, minFiles, Math.max(minFiles, maxFiles));

    app.style.setProperty('--file-tree-width', Math.round(next) + 'px');
  }

  function resizePreview(app, clientY) {
    const vaultPanel = app.querySelector('.vault-panel');
    if (!vaultPanel) return;

    const rect = vaultPanel.getBoundingClientRect();
    const minTop = 180;
    const minPreview = readPx(app, '--min-preview-width', 260);
    const handleHeight = 7;
    const proposed = clientY - rect.top;
    const maxTop = rect.height - minPreview - handleHeight;
    const next = clamp(proposed, minTop, Math.max(minTop, maxTop));

    app.style.setProperty('--vault-top-height', Math.round(next) + 'px');
  }
  function readPx(node, name, fallback) {
    const value = getComputedStyle(node).getPropertyValue(name).trim();
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  const api = { mountPaneResize, clamp };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusPaneResize = Object.freeze(api);
})();
