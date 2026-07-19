'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { applyWindowZoom, getZoomCommand } = require('../src/main/app/windowZoom');

test('window zoom normalizes Ctrl/Cmd keyboard variants across layouts', () => {
  assert.equal(getZoomCommand({ type: 'keyDown', control: true, key: '+', code: 'Equal' }), 'in');
  assert.equal(getZoomCommand({ type: 'keyDown', control: true, key: '=', code: 'Equal' }), 'in');
  assert.equal(getZoomCommand({ type: 'keyDown', control: true, key: '+', code: 'NumpadAdd' }), 'in');
  assert.equal(getZoomCommand({ type: 'keyDown', control: true, key: '-', code: 'Minus' }), 'out');
  assert.equal(getZoomCommand({ type: 'keyDown', control: true, key: '0', code: 'Digit0' }), 'reset');
  assert.equal(getZoomCommand({ type: 'keyDown', control: false, key: '+', code: 'Equal' }), null);
  assert.equal(getZoomCommand({ type: 'keyUp', control: true, key: '+', code: 'Equal' }), null);
});

test('window zoom applies bounded app-local zoom levels', () => {
  let level = 0;
  const contents = {
    getZoomLevel: () => level,
    setZoomLevel: (value) => { level = value; }
  };

  assert.equal(applyWindowZoom({ webContents: contents }, 'in'), 0.5);
  assert.equal(level, 0.5);
  assert.equal(applyWindowZoom({ webContents: contents }, 'out'), 0);
  assert.equal(applyWindowZoom({ webContents: contents }, 'reset'), 0);
});
test('window zoom handles normalized shortcuts before renderer dispatch', () => {
  let level = 0;
  let handler = null;
  const contents = {
    getZoomLevel: () => level,
    setZoomLevel: (value) => { level = value; },
    on: (event, listener) => { if (event === 'before-input-event') handler = listener; },
    removeListener() {}
  };
  const event = { prevented: false, preventDefault() { this.prevented = true; } };
  const { wireWindowZoomShortcuts } = require('../src/main/app/windowZoom');

  wireWindowZoomShortcuts({ webContents: contents });
  handler(event, { type: 'keyDown', control: true, key: '+', code: 'Equal' });

  assert.equal(event.prevented, true);
  assert.equal(level, 0.5);
});