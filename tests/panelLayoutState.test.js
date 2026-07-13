'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createPanelLayoutState,
  normalizePanelLayout
} = require('../src/renderer/layout/panelLayoutState');

test('panel layout normalizes known collapsible panels only', () => {
  const layout = normalizePanelLayout({
    selectionActionsCollapsed: true,
    filesCollapsed: true,
    unsupported: true
  });

  assert.equal(layout.selectionActionsCollapsed, true);
  assert.equal(layout.filesCollapsed, true);
  assert.equal(layout.leftNavCollapsed, false);
  assert.equal(layout.contextBasketCollapsed, false);
  assert.equal(Object.hasOwn(layout, 'unsupported'), false);
});

test('panel layout state updates one panel and notifies subscribers', () => {
  const state = createPanelLayoutState({ selectionActionsCollapsed: false });
  const snapshots = [];
  state.subscribe((snapshot) => snapshots.push(snapshot));

  state.setPanelCollapsed('selectionActions', true);

  assert.equal(state.snapshot().selectionActionsCollapsed, true);
  assert.equal(snapshots.length, 1);
  assert.equal(snapshots[0].selectionActionsCollapsed, true);
  assert.equal(snapshots[0].filesCollapsed, false);
});