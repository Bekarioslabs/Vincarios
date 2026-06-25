'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  looksLikeSelectedTargetRequest,
  looksLikeFolderScopedRequest,
  hasFolderWorkSignal
} = require('../src/renderer/context/contextIntent');

test('context intent detects selected target requests without matching general questions', () => {
  assert.equal(looksLikeSelectedTargetRequest('check mal diese datei'), true);
  assert.equal(looksLikeSelectedTargetRequest('was steht in dieser note?'), true);
  assert.equal(looksLikeSelectedTargetRequest('What is the biggest fish?'), false);
});

test('context intent detects explicit folder-scoped file work', () => {
  assert.equal(looksLikeFolderScopedRequest('kannst du aehnliche dateien in diesem ordner finden?'), true);
  assert.equal(looksLikeFolderScopedRequest('liste die dateien in diesem ordner'), true);
  assert.equal(looksLikeFolderScopedRequest('was ist der groesste fisch?'), false);
});

test('context intent exposes generic folder work signals without hard-coded typo rules', () => {
  assert.equal(hasFolderWorkSignal('kannst du aehnliche dateien finden?'), true);
  assert.equal(hasFolderWorkSignal('liste die dateien'), true);
  assert.equal(hasFolderWorkSignal('was liegt in diesem ordner?'), true);
  assert.equal(hasFolderWorkSignal('what is inside this folder?'), true);
  assert.equal(hasFolderWorkSignal('was ist der groesste fisch?'), false);
});
