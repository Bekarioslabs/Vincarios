'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createVaultSearchService } = require('../src/main/search/vaultSearchService');

function createStore(result) {
  return {
    setRoot() { return { ok: true }; },
    load() { return result; }
  };
}

test('vault search finds filename, title, path, and metadata without full-text enabled', () => {
  const service = createVaultSearchService({
    metadataStore: createStore({
      ok: true,
      exists: true,
      documents: {
        '02_Projects/Atlas/Research.md': {
          path: '02_Projects/Atlas/Research.md',
          title: 'Research notes',
          fields: { tags: ['atlas', 'research'], type: 'Reference', status: 'active', aliases: ['Field notes'] }
        }
      }
    }),
    fullTextStore: createStore({ ok: true, exists: false, enabled: false, index: { terms: {} } })
  });

  assert.equal(service.setRoot('D:/vault').ok, true);
  const result = service.search({ query: 'atlas', scope: 'all' });
  assert.equal(result.ok, true);
  assert.equal(result.results.length, 1);
  assert.deepEqual(result.results[0].reasons, ['Path match', 'Tag match']);
  assert.equal(result.fullText.available, false);
});

test('vault search uses the opt-in full-text inverted index only for content scope', () => {
  const service = createVaultSearchService({
    metadataStore: createStore({
      ok: true,
      exists: true,
      documents: {
        '03_Knowledge/Signals.md': { path: '03_Knowledge/Signals.md', title: 'Signals', fields: { tags: [], type: '', status: '', aliases: [] } }
      }
    }),
    fullTextStore: createStore({
      ok: true,
      exists: true,
      enabled: true,
      index: { terms: { resonance: [{ path: '03_Knowledge/Signals.md', heading: true }] } }
    })
  });

  service.setRoot('D:/vault');
  const result = service.search({ query: 'resonance', scope: 'content' });
  assert.equal(result.ok, true);
  assert.equal(result.results.length, 1);
  assert.deepEqual(result.results[0].reasons, ['Content match', 'Heading match']);
  assert.equal(result.fullText.available, true);
});

test('vault search fails clearly when the metadata index does not exist', () => {
  const service = createVaultSearchService({
    metadataStore: createStore({ ok: true, exists: false, documents: {} }),
    fullTextStore: createStore({ ok: true, exists: false, enabled: false, index: { terms: {} } })
  });

  service.setRoot('D:/vault');
  assert.deepEqual(service.search({ query: 'anything' }), {
    ok: false,
    code: 'metadata_index_unavailable',
    message: 'Build vault indexes before searching.'
  });
});
