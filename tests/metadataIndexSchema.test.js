'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  METADATA_INDEX_STORAGE,
  METADATA_INDEX_VERSION,
  createEmptyMetadataIndex,
  createMetadataRecordFromSource,
  shouldReindexMetadata
} = require('../src/shared/metadata/metadataIndexSchema');

test('metadata index schema creates a versioned empty document set', () => {
  assert.deepEqual(createEmptyMetadataIndex(), {
    version: METADATA_INDEX_VERSION,
    storage: METADATA_INDEX_STORAGE,
    documents: {}
  });
});

test('metadata index records retain deterministic search facts without Markdown body content', () => {
  const record = createMetadataRecordFromSource({
    path: '02_Projects/Alpha/Overview.md',
    content: '---\ntags: [project, alpha]\ntype: project-overview\nstatus: active\naliases: [Alpha Home]\n---\n# Alpha Overview\n\nPrivate body text.',
    hash: 'abc123',
    mtimeMs: 42
  });

  assert.deepEqual(record, {
    path: '02_Projects/Alpha/Overview.md',
    hash: 'abc123',
    mtimeMs: 42,
    schemaVersion: METADATA_INDEX_VERSION,
    title: 'Alpha Overview',
    frontmatterState: 'valid',
    fields: {
      tags: ['project', 'alpha'],
      type: 'project-overview',
      status: 'active',
      aliases: ['Alpha Home']
    }
  });
  assert.equal(JSON.stringify(record).includes('Private body text.'), false);
});

test('metadata index records preserve file discoverability when frontmatter is malformed', () => {
  const record = createMetadataRecordFromSource({
    path: '00_Inbox/Broken.md',
    content: '---\ntags: [broken,\n---\n# Hidden Heading',
    hash: 'broken',
    mtimeMs: 5
  });

  assert.deepEqual(record.fields, { tags: [], type: '', status: '', aliases: [] });
  assert.equal(record.frontmatterState, 'invalid');
  assert.equal(record.title, 'Broken');
});

test('metadata index freshness uses schema, content hash, and file modification time', () => {
  const current = { hash: 'same', mtimeMs: 100 };
  assert.equal(shouldReindexMetadata(null, current), true);
  assert.equal(shouldReindexMetadata({ hash: 'same', mtimeMs: 100, schemaVersion: METADATA_INDEX_VERSION }, current), false);
  assert.equal(shouldReindexMetadata({ hash: 'changed', mtimeMs: 100, schemaVersion: METADATA_INDEX_VERSION }, current), true);
  assert.equal(shouldReindexMetadata({ hash: 'same', mtimeMs: 101, schemaVersion: METADATA_INDEX_VERSION }, current), true);
  assert.equal(shouldReindexMetadata({ hash: 'same', mtimeMs: 100, schemaVersion: 0 }, current), true);
});
