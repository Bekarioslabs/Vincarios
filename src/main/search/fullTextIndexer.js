'use strict';

const crypto = require('node:crypto');
const { createVaultMarkdownSource } = require('../vault/vaultMarkdownSource');
const { yieldToEventLoop } = require('../indexing/asyncVaultMarkdownScanner');
const { createFullTextIndexStore } = require('./fullTextIndexStore');
const { createEmptyFullTextIndex, createFullTextDocumentRecord } = require('../../shared/search/fullTextIndexSchema');

function createFullTextIndexer(options) {
  options = options || {};
  const source = options.source || createVaultMarkdownSource(options);
  const indexStore = options.indexStore || createFullTextIndexStore(options);

  function setRoot(vaultRoot) {
    const sourceResult = source.setRoot(vaultRoot);
    if (!sourceResult.ok) return sourceResult;
    const storeResult = indexStore.setRoot(vaultRoot);
    return storeResult.ok ? ok({ root: storeResult.root || sourceResult.root }) : storeResult;
  }

  function getPreference() {
    return indexStore.getPreference();
  }

  function setEnabled(enabled) {
    return indexStore.setEnabled(enabled === true);
  }

  async function rebuildIndex(rebuildOptions) {
    rebuildOptions = rebuildOptions || {};
    const preference = indexStore.getPreference();
    if (!preference.ok) return preference;
    if (!preference.enabled) return fail('full_text_not_enabled', 'Full-text search is not enabled for this vault.');

    const listed = typeof source.listMarkdownDocumentsAsync === 'function'
      ? await source.listMarkdownDocumentsAsync(rebuildOptions)
      : source.listMarkdownDocuments();
    if (!listed.ok) return listed;
    const existing = indexStore.load();
    const previousDocuments = existing.ok && existing.exists ? existing.index.documents : {};
    const documents = {};
    let indexedCount = 0;
    let reusedCount = 0;

    let processedDocuments = 0;
    for (const document of listed.documents) {
      if (rebuildOptions.signal && rebuildOptions.signal.aborted) return fail('index_canceled', 'Index refresh was canceled.');
      if (processedDocuments > 0 && processedDocuments % 100 === 0) {
        if (typeof rebuildOptions.onProgress === 'function') rebuildOptions.onProgress({ processed: processedDocuments, total: listed.documents.length });
        await yieldToEventLoop();
      }
      processedDocuments += 1;
      const hash = createContentHash(document.content);
      const previous = previousDocuments[document.path];
      if (isCurrentRecord(previous, hash, document.mtimeMs)) {
        documents[document.path] = previous;
        reusedCount += 1;
        continue;
      }
      const record = createFullTextDocumentRecord({
        path: document.path,
        hash,
        mtimeMs: document.mtimeMs,
        content: document.content
      });
      documents[record.path] = record;
      indexedCount += 1;
    }

    const index = createEmptyFullTextIndex();
    index.documents = documents;
    index.terms = buildInvertedTerms(documents);
    const saved = indexStore.save(index);
    if (!saved.ok) return saved;
    return ok({ documentCount: Object.keys(documents).length, indexedCount, reusedCount, termCount: Object.keys(index.terms).length });
  }

  function deleteIndex() {
    return indexStore.deleteIndex();
  }

  return Object.freeze({ setRoot, getPreference, setEnabled, rebuildIndex, deleteIndex });
}

function buildInvertedTerms(documents) {
  const terms = {};
  Object.keys(documents || {}).sort().forEach((documentPath) => {
    const document = documents[documentPath] || {};
    const headingTokens = new Set();
    (document.headings || []).forEach((heading) => {
      String(heading && heading.text || '').toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu)?.forEach((token) => headingTokens.add(token.normalize('NFKC')));
    });
    (document.tokens || []).forEach((token) => {
      if (!terms[token]) terms[token] = [];
      terms[token].push({ path: documentPath, heading: headingTokens.has(token) });
    });
  });
  return terms;
}

function isCurrentRecord(record, hash, mtimeMs) {
  return !!record && record.hash === hash && Number(record.mtimeMs) === Number(mtimeMs);
}

function createContentHash(content) {
  return crypto.createHash('sha256').update(String(content || ''), 'utf8').digest('hex');
}

function ok(value) { return Object.assign({ ok: true }, value); }
function fail(code, message) { return { ok: false, code, message }; }

module.exports = { buildInvertedTerms, createContentHash, createFullTextIndexer };
