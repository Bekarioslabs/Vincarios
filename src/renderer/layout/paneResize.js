(function() {
  'use strict';

  function mountPaneResize(app) {
    if (!app) return null;

    const vaultHandle = app.querySelector('[data-resize="vault"]');
    const filesHandle = app.querySelector('[data-resize="files"]');
    const actionsHandle = app.querySelector('[data-resize="actions"]');

    const cleanup = [];
    if (vaultHandle) cleanup.push(bindHorizontalResize({
      handle: vaultHandle,
      onMove: (event) => resizeVault(app, event.clientX)
    }));

    if (filesHandle) cleanup.push(bindHorizontalResize({
      handle: filesHandle,
      onMove: (event) => resizeFiles(app, event.clientX)
    }));

    if (actionsHandle) cleanup.push(bindHorizontalResize({
      handle: actionsHandle,
      onMove: (event) => resizeActions(app, event.clientX)
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
      handle.dispatchEvent(new CustomEvent('vitruvios:panel-resize-start'));
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
    const vaultPanel = app.querySelector('.vault-panel');
    if (!workspace || !leftNav) return;

    const rect = workspace.getBoundingClientRect();
    const leftWidth = leftNav.getBoundingClientRect().width;
    const minMain = readPx(app, '--min-main-width', 400);
    const minVault = resolveMinimumVaultWidth(app, vaultPanel);
    const handleWidth = readPx(app, '--panel-divider-width', 7);
    const available = rect.width - leftWidth - handleWidth;
    const proposed = rect.right - clientX;
    const next = clamp(proposed, minVault, Math.max(minVault, available - minMain));

    app.style.setProperty('--vault-panel-width', Math.round(next) + 'px');
  }

  function resolveMinimumVaultWidth(app, vaultPanel) {
    if (!vaultPanel) return readPx(app, '--min-vault-width', 520);
    return readPanelMetrics(app, vaultPanel).minimumVaultWidth;
  }

  function resizeFiles(app, clientX) {
    const vaultPanel = app.querySelector('.vault-panel');
    const actionsPane = app.querySelector('.selection-actions-pane');
    if (!vaultPanel || !actionsPane) return;

    const rect = vaultPanel.getBoundingClientRect();
    const metrics = readPanelMetrics(app, vaultPanel);
    const minFiles = readPx(app, '--min-file-tree-width', 170);
    const proposed = clientX - rect.left;
    const maxFiles = calculatePanelResizeMaximum({
      containerWidth: rect.width,
      adjacentWidth: actionsPane.getBoundingClientRect().width,
      dividerTotal: metrics.dividerTotal,
      minimumWidth: minFiles,
      maximumWidth: readPx(app, '--max-file-tree-width', 340)
    });
    const next = clamp(proposed, minFiles, Math.max(minFiles, maxFiles));

    app.style.setProperty('--file-tree-width', Math.round(next) + 'px');
  }

  function resizeActions(app, clientX) {
    const vaultPanel = app.querySelector('.vault-panel');
    const filesPane = app.querySelector('.files-pane');
    const actionsPane = app.querySelector('.selection-actions-pane');
    if (!vaultPanel || !filesPane || !actionsPane) return;

    const vaultRect = vaultPanel.getBoundingClientRect();
    const metrics = readPanelMetrics(app, vaultPanel);
    const minActions = readPx(app, '--min-selection-actions-width', 220);
    const maxActions = calculatePanelResizeMaximum({
      containerWidth: vaultRect.width,
      adjacentWidth: filesPane.getBoundingClientRect().width,
      dividerTotal: metrics.dividerTotal,
      minimumWidth: minActions,
      maximumWidth: readPx(app, '--max-selection-actions-width', 360)
    });
    const next = clamp(clientX - actionsPane.getBoundingClientRect().left, minActions, Math.max(minActions, maxActions));

    app.style.setProperty('--selection-actions-width', Math.round(next) + 'px');
  }

  function readPanelMetrics(app, vaultPanel) {
    return calculatePanelMetrics({
      minFileTreeWidth: readPx(app, '--min-file-tree-width', 170),
      minSelectionActionsWidth: readPx(app, '--min-selection-actions-width', 220),
      dividerWidth: readPx(app, '--panel-divider-width', 7)
    });
  }

  function calculatePanelMetrics(input) {
    const options = input || {};
    const dividerWidth = numberOr(options.dividerWidth, 7);
    const dividerTotal = dividerWidth * 2;

    return Object.freeze({
      dividerTotal,
      minimumVaultWidth: numberOr(options.minFileTreeWidth, 170)
        + numberOr(options.minSelectionActionsWidth, 220)
        + dividerTotal
    });
  }

  function calculatePanelResizeMaximum(input) {
    const options = input || {};
    const minimumWidth = numberOr(options.minimumWidth, 0);
    const structuralMaximum = numberOr(options.containerWidth, minimumWidth)
      - numberOr(options.adjacentWidth, 0)
      - numberOr(options.dividerTotal, 0);
    const cappedMaximum = Math.min(numberOr(options.maximumWidth, structuralMaximum), structuralMaximum);

    return Math.max(minimumWidth, cappedMaximum);
  }

  function numberOr(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function readPx(node, name, fallback) {
    const value = getComputedStyle(node).getPropertyValue(name).trim();
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  const api = { mountPaneResize, clamp, calculatePanelMetrics, calculatePanelResizeMaximum };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosPaneResize = Object.freeze(api);
})();