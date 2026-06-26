'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_CONTEXT_LIMITS,
  normalizeContextLimits
} = require('../src/renderer/context/contextLimits');

test('context limits expose conservative defaults for selected files and folder listings', () => {
  assert.equal(DEFAULT_CONTEXT_LIMITS.maxSelectedFileChars, 8000);
  assert.equal(DEFAULT_CONTEXT_LIMITS.maxListedFolders, 100);
  assert.equal(DEFAULT_CONTEXT_LIMITS.maxListedFiles, 500);
});

test('context limits normalize invalid or partial options back to defaults', () => {
  const limits = normalizeContextLimits({
    maxSelectedFileChars: -1,
    maxListedFolders: 3,
    maxListedFiles: 'many'
  });

  assert.equal(limits.maxSelectedFileChars, 8000);
  assert.equal(limits.maxListedFolders, 3);
  assert.equal(limits.maxListedFiles, 500);
});
