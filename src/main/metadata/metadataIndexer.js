'use strict';

const crypto = require('node:crypto');
const { isMarkdownPath } = require('../../shared/fileTypes');
const { createVaultMarkdownSource } = require('../vault/vaultMarkdownSource');
const { yieldToEventLoop } = require('../indexing/asyncVaultMarkdownScanner');
const { createMetadataIndexStore } = require('./metadataIndexStore');
const { createMetadataRecordFromSource, shouldReindexMetadata } = require('../../shared/metadata/metadataIndexSchema');

function createMetadataIndexer(options) {
  options = options || {};
  const source = options.source || createVaultMarkdownSource(options);
  const indexStore = options.indexStore || createMetadataIndexStore(options);

  function setRoot(vaultRoot) {
    const sourceResult = source.setRoot(vaultRoot);
    if (!sourceResult.ok) return sourceResult;
    const storeResult = indexStore.setRoot(vaultRoot);
    return storeResult.ok ? ok({ root: storeResult.root || sourceResult.root }) : storeResult;
  }

  async function rebuildIndex(rebuildOptions) {
    rebuildOptions = rebuildOptions || {};
    const listed = typeof source.listMarkdownDocumentsAsync === 'function'
      ? await source.listMarkdownDocumentsAsync(rebuildOptions)
      : source.listMarkdownDocuments();
    if (!listed.ok) return listed;
    const existing = indexStore.load();
    const previousDocuments = existing.ok && existing.exists ? existing.documents : {};
    const documents = {};
    let indexedCount = 0;
    let reusedCount = 0;
    let malformedCount = 0;

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
      if (!shouldReindexMetadata(previous, { hash, mtimeMs: document.mtimeMs })) {
        documents[document.path] = previous;
        reusedCount += 1;
        if (previous.frontmatterState === 'invalid') malformedCount += 1;
        continue;
      }
      const record = createMetadataRecord(document);
      documents[record.path] = record;
      indexedCount += 1;
      if (record.frontmatterState === 'invalid') malformedCount += 1;
    }

    const saved = indexStore.save(documents);
    if (!saved.ok) return saved;
    return ok({ documentCount: Object.keys(documents).length, indexedCount, reusedCount, malformedCount });
  }

  function syncChangedPaths(paths) {
    const normalizedPaths = normalizePaths(paths);
    if (!normalizedPaths.length) return fail('invalid_changed_paths', 'At least one Markdown path is required.');
    const existing = indexStore.load();
    if (!existing.ok) return existing;
    if (!existing.exists) return fail('metadata_index_unavailable', 'Metadata index has not been built.');

    const documents = Object.assign({}, existing.documents);
    let updatedCount = 0;
    let removedCount = 0;
    let unchangedCount = 0;
    for (const documentPath of normalizedPaths) {
      const loaded = source.readMarkdownDocument(documentPath);
      if (!loaded.ok && loaded.code === 'markdown_not_found') {
        if (documents[documentPath]) {
          delete documents[documentPath];
          removedCount += 1;
        }
        continue;
      }
      if (!loaded.ok) return loaded;
      const document = loaded.document;
      const hash = createContentHash(document.content);
      const previous = documents[document.path];
      if (!shouldReindexMetadata(previous, { hash, mtimeMs: document.mtimeMs })) {
        unchangedCount += 1;
        continue;
      }
      const record = createMetadataRecord(document, hash);
      documents[record.path] = record;
      updatedCount += 1;
    }

    const saved = indexStore.save(documents);
    if (!saved.ok) return saved;
    return ok({ documentCount: Object.keys(documents).length, updatedCount, removedCount, unchangedCount });
  }

  return Object.freeze({ setRoot, rebuildIndex, syncChangedPaths });
}

function createMetadataRecord(document, hash) {
  return createMetadataRecordFromSource({
    path: document.path,
    content: document.content,
    hash: hash || createContentHash(document.content),
    mtimeMs: document.mtimeMs
  });
}

function normalizePaths(paths) {
  const seen = new Set();
  return (Array.isArray(paths) ? paths : []).reduce((items, value) => {
    const path = String(value || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    if (!path || !isMarkdownPath(path) || seen.has(path)) return items;
    seen.add(path);
    items.push(path);
    return items;
  }, []);
}

function createContentHash(content) {
  return crypto.createHash('sha256').update(String(content || ''), 'utf8').digest('hex');
}
function ok(value) { return Object.assign({ ok: true }, value); }
function fail(code, message) { return { ok: false, code, message }; }

module.exports = { createContentHash, createMetadataIndexer };
