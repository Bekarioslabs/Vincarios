'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  hasRecursiveFolderWorkSignal,
  hasBlockedActionRetrySignal,
  hasSelectionActionGuidanceSignal
} = require('../src/renderer/context/contextIntent');

test('context intent detects recursive folder scope replies only', () => {
  assert.equal(hasRecursiveFolderWorkSignal('alle'), true);
  assert.equal(hasRecursiveFolderWorkSignal('check all subfolders'), true);
  assert.equal(hasRecursiveFolderWorkSignal('rekursiv auflisten'), true);
  assert.equal(hasRecursiveFolderWorkSignal('was ist der groesste fisch?'), false);
});

test('context intent detects blocked action retry confirmations only as a narrow signal', () => {
  assert.equal(hasBlockedActionRetrySignal('es ist jetzt freigegeben'), true);
  assert.equal(hasBlockedActionRetrySignal('versuch es nochmal'), true);
  assert.equal(hasBlockedActionRetrySignal('was ist der groesste fisch?'), false);
});

test('context intent detects selection-action guidance without executing actions', () => {
  assert.equal(hasSelectionActionGuidanceSignal('was liegt hier drin?'), true);
  assert.equal(hasSelectionActionGuidanceSignal('ok liste den inhalt auf'), true);
  assert.equal(hasSelectionActionGuidanceSignal('was ist der groesste fisch?'), false);
});
