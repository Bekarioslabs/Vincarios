'use strict';

const frontmatter = require('./frontmatterContract');

const METADATA_INDEX_VERSION = 1;
const METADATA_INDEX_STORAGE = 'vault-vincarios-metadata-index';

function createEmptyMetadataIndex() {
  return {
    version: METADATA_INDEX_VERSION,
    storage: METADATA_INDEX_STORAGE,
    documents: {}
  };
}

function createMetadataRecordFromSource(input) {
  input = input || {};
  const parsed = frontmatter.readFrontmatter(input.content);
  const fields = parsed.ok ? frontmatter.getSearchFields(parsed.metadata) : emptySearchFields();
  const sourceForTitle = parsed.ok ? parsed.body : '';

  return {
    path: normalizePath(input.path),
    hash: normalizeString(input.hash),
    mtimeMs: normalizePositiveNumber(input.mtimeMs, 0),
    schemaVersion: METADATA_INDEX_VERSION,
    title: getTitle(sourceForTitle, input.path),
    frontmatterState: parsed.ok ? (parsed.hasFrontmatter ? 'valid' : 'none') : 'invalid',
    fields: normalizeSearchFields(fields)
  };
}

function createMetadataRecord(input) {
  input = input || {};
  return {
    path: normalizePath(input.path),
    hash: normalizeString(input.hash),
    mtimeMs: normalizePositiveNumber(input.mtimeMs, 0),
    schemaVersion: METADATA_INDEX_VERSION,
    title: normalizeTitle(input.title) || getTitle('', input.path),
    frontmatterState: normalizeFrontmatterState(input.frontmatterState),
    fields: normalizeSearchFields(input.fields)
  };
}

function shouldReindexMetadata(existingRecord, current) {
  const record = existingRecord || null;
  const state = current || {};
  if (!record) return true;
  if (Number(record.schemaVersion) !== METADATA_INDEX_VERSION) return true;
  if (normalizeString(record.hash) !== normalizeString(state.hash)) return true;
  return normalizePositiveNumber(record.mtimeMs, 0) !== normalizePositiveNumber(state.mtimeMs, 0);
}

function getTitle(source, filePath) {
  const heading = String(source || '').match(/^#{1,6}\s+(.+?)\s*#*\s*$/m);
  return normalizeTitle(heading && heading[1]) || fileStem(filePath);
}

function normalizeSearchFields(fields) {
  const value = fields && typeof fields === 'object' ? fields : {};
  return {
    tags: normalizeList(value.tags),
    type: normalizeString(value.type),
    status: normalizeString(value.status),
    aliases: normalizeList(value.aliases)
  };
}

function emptySearchFields() {
  return { tags: [], type: '', status: '', aliases: [] };
}

function normalizeList(value) {
  const input = Array.isArray(value) ? value : [value];
  const seen = new Set();
  return input.reduce((entries, item) => {
    const normalized = normalizeString(item);
    const key = normalized.toLocaleLowerCase();
    if (!normalized || seen.has(key)) return entries;
    seen.add(key);
    entries.push(normalized);
    return entries;
  }, []);
}

function normalizePath(value) {
  return normalizeString(value).replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
}

function normalizeFrontmatterState(value) {
  return ['none', 'valid', 'invalid'].includes(value) ? value : 'none';
}

function normalizeTitle(value) {
  return normalizeString(value).replace(/\s+/g, ' ');
}

function fileStem(value) {
  const path = normalizePath(value);
  const name = path.split('/').pop() || '';
  return normalizeTitle(name.replace(/\.(md|markdown)$/i, '')) || 'Untitled';
}

function normalizeString(value) {
  return String(value == null ? '' : value).trim();
}

function normalizePositiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

module.exports = {
  METADATA_INDEX_STORAGE,
  METADATA_INDEX_VERSION,
  createEmptyMetadataIndex,
  createMetadataRecord,
  createMetadataRecordFromSource,
  shouldReindexMetadata
};
