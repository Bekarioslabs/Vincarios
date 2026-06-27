'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  looksLikeSelectedTargetRequest,
  looksLikeFolderScopedRequest,
  hasFolderWorkSignal,
  hasRecursiveFolderWorkSignal,
  hasBlockedActionRetrySignal
} = require('../src/renderer/context/contextIntent');

test('context intent detects selected target requests without matching general questions', () => {
  assert.equal(looksLikeSelectedTargetRequest('check mal diese datei'), true);
  assert.equal(looksLikeSelectedTargetRequest('was steht in dieser note?'), true);
  assert.equal(looksLikeSelectedTargetRequest('What is the biggest fish?'), false);
  assert.equal(looksLikeSelectedTargetRequest('und jetzt was ueber haie'), false);
});

test('context intent detects explicit folder-scoped file work', () => {
  assert.equal(looksLikeFolderScopedRequest('kannst du aehnliche dateien in diesem ordner finden?'), true);
  assert.equal(looksLikeFolderScopedRequest('liste die dateien in diesem ordner'), true);
  assert.equal(looksLikeFolderScopedRequest('was ist in diesem ordenr?'), true);
  assert.equal(looksLikeFolderScopedRequest('was ist der groesste fisch?'), false);
});

test('context intent exposes generic folder work signals without hard-coded typo rules', () => {
  assert.equal(hasFolderWorkSignal('kannst du aehnliche dateien finden?'), true);
  assert.equal(hasFolderWorkSignal('liste die dateien'), true);
  assert.equal(hasFolderWorkSignal('was liegt in diesem ordner?'), true);
  assert.equal(hasFolderWorkSignal('was ist in diesem ordenr?'), true);
  assert.equal(hasFolderWorkSignal('was liegt hier drin?'), true);
  assert.equal(looksLikeFolderScopedRequest('check den ordner'), true);
  assert.equal(hasFolderWorkSignal('what is inside this folder?'), true);
  assert.equal(hasFolderWorkSignal('was ist der groesste fisch?'), false);
});

test('context intent detects recursive folder listing requests generically', () => {
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