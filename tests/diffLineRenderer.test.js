'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { renderDiffLines, diffPrefix } = require('../src/renderer/diff/diffLineRenderer');

test('diff line renderer uses review diff classes for add and remove lines', () => {
  const rows = [];
  const root = { appendChild(node) { rows.push(node); } };
  global.document = {
    createElement() {
      return { className: '', textContent: '' };
    }
  };

  try {
    renderDiffLines(root, {
      hunks: [{
        lines: [
          { type: 'add', text: 'added' },
          { type: 'remove', text: 'removed' },
          { type: 'context', text: 'same' }
        ]
      }]
    });
  } finally {
    delete global.document;
  }

  assert.equal(rows[0].className, 'review-diff-line review-diff-line-add');
  assert.equal(rows[0].textContent, '+ added');
  assert.equal(rows[1].className, 'review-diff-line review-diff-line-remove');
  assert.equal(rows[1].textContent, '- removed');
  assert.equal(rows[2].className, 'review-diff-line review-diff-line-context');
  assert.equal(rows[2].textContent, '  same');
});

test('diffPrefix maps known diff line types', () => {
  assert.equal(diffPrefix('add'), '+');
  assert.equal(diffPrefix('remove'), '-');
  assert.equal(diffPrefix('context'), ' ');
});