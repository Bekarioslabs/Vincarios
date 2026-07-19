'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { normalizeLinkResults } = require('../src/renderer/markdown/markdownLinkPicker');

test('link picker keeps Markdown results from the local names and paths search only', () => {
  const results = normalizeLinkResults([
    { path: '03_Knowledge/Project Notes.md', title: 'Project Notes' },
    { path: '03_Knowledge/diagram.png', title: 'diagram.png' },
    { path: '02_Projects/Plan.md', title: '' }
  ]);

  assert.deepEqual(results, [
    { path: '03_Knowledge/Project Notes.md', title: 'Project Notes' },
    { path: '02_Projects/Plan.md', title: 'Plan' }
  ]);
});
test('link picker uses the file name instead of an extracted Markdown title', () => {
  const results = normalizeLinkResults([
    { path: '03_Knowledge/ZEUS Markdown Tests/Obsidian Core Compatibility Test.md', title: 'Heading 1' }
  ]);

  assert.deepEqual(results, [
    {
      path: '03_Knowledge/ZEUS Markdown Tests/Obsidian Core Compatibility Test.md',
      title: 'Obsidian Core Compatibility Test'
    }
  ]);
});
