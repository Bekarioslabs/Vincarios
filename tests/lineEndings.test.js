'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeLineEndings, preserveLineEndings } = require('../src/shared/text/lineEndings');

test('editor comparison normalizes line endings without trimming any content', () => {
  assert.equal(normalizeLineEndings(' A\r\nB\rC\n\n'), ' A\nB\nC\n\n');
});

test('dominant disk line endings win, ties use the first ending, missing endings use LF', () => {
  assert.equal(preserveLineEndings('New\nBody\n', 'A\r\nB\nC\r\n'), 'New\r\nBody\r\n');
  assert.equal(preserveLineEndings('New\r\nBody\r\n', 'A\nB\r\n'), 'New\nBody\n');
  assert.equal(preserveLineEndings('New\nBody', 'A\rB\rC'), 'New\rBody');
  assert.equal(preserveLineEndings('New\r\nBody', 'No endings'), 'New\nBody');
});

test('unchanged normalized content preserves the original mixed bytes', () => {
  assert.equal(preserveLineEndings('A\nB\nC\n', 'A\r\nB\nC\r\n'), 'A\r\nB\nC\r\n');
});

test('line-ending preservation never adds or removes final newlines', () => {
  assert.equal(preserveLineEndings('New body', 'Old\r\n'), 'New body');
  assert.equal(preserveLineEndings('New body\n\n', 'Old\r\n'), 'New body\r\n\r\n');
});
