'use strict';

const ZOOM_LEVEL_STEP = 0.5;
const MIN_ZOOM_LEVEL = -3;
const MAX_ZOOM_LEVEL = 3;

function getZoomCommand(input) {
  if (!input || input.type !== 'keyDown' || (!input.control && !input.meta) || input.alt) return null;
  const key = String(input.key || '');
  const code = String(input.code || '');
  if (key === '+' || key === '=' || code === 'NumpadAdd') return 'in';
  if (key === '-' || key === '_' || code === 'NumpadSubtract') return 'out';
  if (key === '0' || code === 'Digit0' || code === 'Numpad0') return 'reset';
  return null;
}

function applyWindowZoom(window, command) {
  const contents = window && window.webContents;
  if (!contents || typeof contents.getZoomLevel !== 'function' || typeof contents.setZoomLevel !== 'function') return null;
  const current = Number(contents.getZoomLevel()) || 0;
  const next = command === 'reset'
    ? 0
    : clampZoomLevel(current + (command === 'in' ? ZOOM_LEVEL_STEP : command === 'out' ? -ZOOM_LEVEL_STEP : 0));
  if (command !== 'in' && command !== 'out' && command !== 'reset') return null;
  contents.setZoomLevel(next);
  return next;
}

function wireWindowZoomShortcuts(window) {
  const contents = window && window.webContents;
  if (!contents || typeof contents.on !== 'function') return function noop() {};
  const handler = (event, input) => {
    const command = getZoomCommand(input);
    if (!command) return;
    event.preventDefault();
    applyWindowZoom(window, command);
  };
  contents.on('before-input-event', handler);
  return function unsubscribe() {
    if (typeof contents.removeListener === 'function') contents.removeListener('before-input-event', handler);
  };
}

function clampZoomLevel(value) {
  return Math.min(MAX_ZOOM_LEVEL, Math.max(MIN_ZOOM_LEVEL, value));
}

module.exports = {
  MAX_ZOOM_LEVEL,
  MIN_ZOOM_LEVEL,
  ZOOM_LEVEL_STEP,
  applyWindowZoom,
  getZoomCommand,
  wireWindowZoomShortcuts
};