'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { formatFolderAnalysis } = require('../src/renderer/selectionActions/mountSelectionActions');

test('folder analysis is structure-based and does not claim to read note contents', () => {
  const result = formatFolderAnalysis('03_Knowledge', {
    ok: true,
    entries: [
      { kind: 'folder', name: 'AI' },
      { kind: 'file', name: 'LLM Basics.md' },
      { kind: 'file', name: 'Whale Notes.md' },
      { kind: 'file', name: 'image.png' }
    ]
  });

  assert.match(result, /^Folder analysis \(structure only\): 03_Knowledge/);
  assert.match(result, /Markdown files: 2/);
  assert.match(result, /Folders: 1/);
  assert.match(result, /Other supported entries: 1/);
  assert.match(result, /This is based on names and entry types only/);
  assert.doesNotMatch(result, /content was read/i);
});
test('folder analysis recognizes vault Markdown entries by kind', () => {
  const result = formatFolderAnalysis('00_Inbox', {
    ok: true,
    entries: [
      { kind: 'folder', name: 'AI Responses' },
      { kind: 'markdown', name: 'Whales.md' },
      { kind: 'markdown', name: 'Sharks.markdown' }
    ]
  });

  assert.match(result, /Markdown files: 2/);
  assert.match(result, /Folders: 1/);
  assert.match(result, /Other supported entries: 0/);
});