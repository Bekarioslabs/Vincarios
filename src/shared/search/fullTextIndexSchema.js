'use strict';

const frontmatter = require('../metadata/frontmatterContract');

const FULL_TEXT_INDEX_VERSION = 1;
const FULL_TEXT_INDEX_STORAGE = 'vault-vincarios-full-text-index';
const MAX_TOKEN_LENGTH = 64;
const MAX_TOKENS_PER_DOCUMENT = 20000;

function createEmptyFullTextIndex() {
  return {
    version: FULL_TEXT_INDEX_VERSION,
    storage: FULL_TEXT_INDEX_STORAGE,
    enabled: true,
    documents: {},
    terms: {}
  };
}

function createFullTextDocumentRecord(input) {
  input = input || {};
  const source = String(input.content || '');
  const parsed = frontmatter.readFrontmatter(source);
  const body = parsed && typeof parsed.body === 'string' ? parsed.body : source;
  const headings = extractHeadings(body);
  const tokens = tokenizeSearchText(body);

  return {
    path: normalizePath(input.path),
    hash: normalizeString(input.hash),
    mtimeMs: normalizePositiveNumber(input.mtimeMs),
    schemaVersion: FULL_TEXT_INDEX_VERSION,
    headings,
    tokens: tokens.slice(0, MAX_TOKENS_PER_DOCUMENT)
  };
}

function tokenizeSearchText(value) {
  const source = String(value || '').normalize('NFKC').toLocaleLowerCase();
  const seen = new Set();
  const tokens = [];
  const matches = source.match(/[\p{L}\p{N}]+/gu) || [];
  for (const match of matches) {
    if (match.length < 2 || match.length > MAX_TOKEN_LENGTH || seen.has(match)) continue;
    seen.add(match);
    tokens.push(match);
  }
  return tokens;
}

function extractHeadings(value) {
  const headings = [];
  const expression = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/gm;
  const source = String(value || '');
  let match = expression.exec(source);
  while (match) {
    const text = normalizeHeading(match[2]);
    if (text) headings.push({ level: match[1].length, text });
    match = expression.exec(source);
  }
  return headings;
}

function normalizeHeading(value) {
  return String(value || '')
    .replace(/[`*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePath(value) {
  return normalizeString(value).replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
}

function normalizeString(value) {
  return String(value == null ? '' : value).trim();
}

function normalizePositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

module.exports = {
  FULL_TEXT_INDEX_STORAGE,
  FULL_TEXT_INDEX_VERSION,
  MAX_TOKEN_LENGTH,
  MAX_TOKENS_PER_DOCUMENT,
  createEmptyFullTextIndex,
  createFullTextDocumentRecord,
  extractHeadings,
  tokenizeSearchText
};
