'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { calculatePanelMetrics, calculatePanelResizeMaximum } = require('../src/renderer/layout/paneResize');

test('panel geometry reserves Files and Actions but lets Preview yield at the Vault minimum', () => {
  const metrics = calculatePanelMetrics({
    minFileTreeWidth: 170,
    minSelectionActionsWidth: 220,
    dividerWidth: 1
  });

  assert.deepEqual(metrics, {
    dividerTotal: 2,
    minimumVaultWidth: 392
  });
});
test('panel resize maximum preserves the adjacent panel and applies the shared cap', () => {
  assert.equal(calculatePanelResizeMaximum({
    containerWidth: 900,
    adjacentWidth: 280,
    dividerTotal: 2,
    minimumWidth: 170,
    maximumWidth: 340
  }), 340);

  assert.equal(calculatePanelResizeMaximum({
    containerWidth: 460,
    adjacentWidth: 280,
    dividerTotal: 2,
    minimumWidth: 170,
    maximumWidth: 340
  }), 178);

  assert.equal(calculatePanelResizeMaximum({
    containerWidth: 440,
    adjacentWidth: 280,
    dividerTotal: 2,
    minimumWidth: 170,
    maximumWidth: 340
  }), 170);
});

test('resize module announces panel resize start before the first drag move', () => {
  const source = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'src', 'renderer', 'layout', 'paneResize.js'), 'utf8');

  assert.match(source, /document\.body\.classList\.add\('is-resizing'\);[\s\S]*handle\.dispatchEvent\(new CustomEvent\('zeus:panel-resize-start'\)\);/);
});