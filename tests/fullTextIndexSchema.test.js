'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  FULL_TEXT_INDEX_STORAGE,
  FULL_TEXT_INDEX_VERSION,
  createEmptyFullTextIndex,
  createFullTextDocumentRecord,
  tokenizeSearchText
} = require('../src/shared/search/fullTextIndexSchema');

test('full-text schema creates deterministic tokens and keeps headings separate from YAML', () => {
  const record = createFullTextDocumentRecord({
    path: '03_Knowledge/Search.md',
    hash: 'source-hash',
    mtimeMs: 42,
    content: '---\ntags: [private-token]\n---\n# Search title\n\nExact phrase appears here.\n## Detail heading\n'
  });

  assert.equal(record.path, '03_Knowledge/Search.md');
  assert.equal(record.schemaVersion, FULL_TEXT_INDEX_VERSION);
  assert.deepEqual(record.headings, [
    { level: 1, text: 'Search title' },
    { level: 2, text: 'Detail heading' }
  ]);
  assert.equal(record.tokens.includes('private'), false);
  assert.equal(record.tokens.includes('token'), false);
  assert.equal(record.tokens.includes('search'), true);
  assert.equal(record.tokens.includes('exact'), true);
});

test('full-text schema normalizes Unicode tokens and has a stable empty manifest', () => {
  assert.deepEqual(tokenizeSearchText('Äpfel, AEPFEL, café, café!'), ['äpfel', 'aepfel', 'café']);
  assert.deepEqual(createEmptyFullTextIndex(), {
    version: FULL_TEXT_INDEX_VERSION,
    storage: FULL_TEXT_INDEX_STORAGE,
    enabled: true,
    documents: {},
    terms: {}
  });
});
