'use strict';

const { createMetadataIndexStore } = require('../metadata/metadataIndexStore');
const { createFullTextIndexStore } = require('./fullTextIndexStore');

const SEARCH_SCOPES = Object.freeze(['all', 'files', 'metadata', 'content']);
const MAX_QUERY_LENGTH = 200;
const MAX_RESULTS = 100;

function createVaultSearchService(options) {
  options = options || {};
  const metadataStore = options.metadataStore || createMetadataIndexStore(options);
  const fullTextStore = options.fullTextStore || createFullTextIndexStore(options);
  let rootReady = false;

  function setRoot(vaultRoot) {
    const metadataResult = metadataStore.setRoot(vaultRoot);
    if (!metadataResult.ok) return metadataResult;
    const fullTextResult = fullTextStore.setRoot(vaultRoot);
    if (!fullTextResult.ok) return fullTextResult;
    rootReady = true;
    return ok({ root: metadataResult.root || fullTextResult.root });
  }

  function search(payload) {
    if (!rootReady) return fail('vault_not_open', 'Open a vault before searching.');
    const query = normalizeQuery(payload && payload.query);
    if (!query) return ok({ query: '', scope: normalizeScope(payload && payload.scope), results: [], fullText: { enabled: false, available: false } });
    if (query.length > MAX_QUERY_LENGTH) return fail('query_too_long', 'Search queries must be 200 characters or fewer.');

    const metadataLoaded = metadataStore.load();
    if (!metadataLoaded.ok) return fail('metadata_index_unavailable', 'Vault metadata index could not be read.');
    if (!metadataLoaded.exists) return fail('metadata_index_unavailable', 'Build vault indexes before searching.');

    const scope = normalizeScope(payload && payload.scope);
    const resultsByPath = new Map();
    const documents = metadataLoaded.documents || {};
    if (scope === 'all' || scope === 'files' || scope === 'metadata') {
      Object.keys(documents).sort().forEach((documentPath) => {
        const document = documents[documentPath] || {};
        const reasons = getMetadataReasons(document, query, scope);
        if (!reasons.length) return;
        resultsByPath.set(document.path || documentPath, createResult(document.path || documentPath, document.title, reasons));
      });
    }

    const fullText = getFullTextState(fullTextStore.load());
    if ((scope === 'all' || scope === 'content') && fullText.available) {
      getContentMatches(fullText.index, query).forEach(({ path, reasons }) => {
        const existing = resultsByPath.get(path);
        const document = documents[path] || {};
        if (existing) existing.reasons = mergeReasons(existing.reasons, reasons);
        else resultsByPath.set(path, createResult(path, document.title, reasons));
      });
    }

    return ok({
      query,
      scope,
      results: sortResults(Array.from(resultsByPath.values())).slice(0, MAX_RESULTS),
      fullText: { enabled: fullText.enabled, available: fullText.available }
    });
  }

  return Object.freeze({ setRoot, search });
}

function getMetadataReasons(document, query, scope) {
  const path = normalizeQuery(document && document.path);
  const title = normalizeQuery(document && document.title);
  const fields = document && document.fields || {};
  const reasons = [];
  const includeFiles = scope === 'all' || scope === 'files';
  const includeMetadata = scope === 'all' || scope === 'metadata';
  const filename = path.split('/').pop() || '';

  if (includeFiles && filename.includes(query)) reasons.push('Filename match');
  if (includeFiles && path.includes(query) && !reasons.includes('Filename match')) reasons.push('Path match');
  if (includeFiles && title.includes(query)) reasons.push('Title match');
  if (includeMetadata && listIncludes(fields.tags, query)) reasons.push('Tag match');
  if (includeMetadata && normalizeQuery(fields.type).includes(query)) reasons.push('Type match');
  if (includeMetadata && normalizeQuery(fields.status).includes(query)) reasons.push('Status match');
  if (includeMetadata && listIncludes(fields.aliases, query)) reasons.push('Alias match');
  return reasons;
}

function getContentMatches(index, query) {
  const terms = index && index.terms || {};
  const tokens = tokenize(query);
  if (!tokens.length) return [];
  const matchedPaths = new Map();
  tokens.forEach((token) => {
    const matches = Array.isArray(terms[token]) ? terms[token] : [];
    matches.forEach((match) => {
      if (!match || !match.path) return;
      const current = matchedPaths.get(match.path) || { matchedTokens: new Set(), heading: false };
      current.matchedTokens.add(token);
      current.heading = current.heading || match.heading === true;
      matchedPaths.set(match.path, current);
    });
  });
  return Array.from(matchedPaths.entries())
    .filter(([, match]) => match.matchedTokens.size === tokens.length)
    .map(([path, match]) => ({ path, reasons: match.heading ? ['Content match', 'Heading match'] : ['Content match'] }));
}

function getFullTextState(loaded) {
  if (!loaded || !loaded.ok || loaded.enabled !== true || loaded.exists !== true) {
    return { enabled: !!(loaded && loaded.enabled), available: false, index: null };
  }
  return { enabled: true, available: true, index: loaded.index || { terms: {} } };
}

function createResult(path, title, reasons) {
  return { path, title: String(title || fileStem(path)), reasons: mergeReasons([], reasons) };
}

function mergeReasons(existing, next) {
  return existing.concat(next || []).filter((reason, index, all) => all.indexOf(reason) === index);
}

function sortResults(results) {
  return results.sort((left, right) => {
    const countDifference = right.reasons.length - left.reasons.length;
    if (countDifference) return countDifference;
    return left.path.localeCompare(right.path);
  });
}

function normalizeScope(value) {
  return SEARCH_SCOPES.includes(value) ? value : 'all';
}

function normalizeQuery(value) {
  return String(value == null ? '' : value).normalize('NFKC').trim().toLocaleLowerCase();
}

function tokenize(value) {
  return Array.from(new Set(normalizeQuery(value).match(/[\p{L}\p{N}]+/gu) || []));
}

function listIncludes(value, query) {
  return (Array.isArray(value) ? value : []).some((entry) => normalizeQuery(entry).includes(query));
}

function fileStem(filePath) {
  return String(filePath || '').split('/').pop().replace(/\.(md|markdown)$/i, '') || 'Untitled';
}

function ok(value) { return Object.assign({ ok: true }, value); }
function fail(code, message) { return { ok: false, code, message }; }

module.exports = { MAX_QUERY_LENGTH, MAX_RESULTS, SEARCH_SCOPES, createVaultSearchService };
