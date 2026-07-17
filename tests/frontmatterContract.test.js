'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  applyTags,
  getSearchFields,
  mergeMetadata,
  readFrontmatter
} = require('../src/shared/metadata/frontmatterContract');

test('reads scalar, list, and unknown YAML properties through one contract', () => {
  const result = readFrontmatter('---\ntags: [project, research]\nstatus: active\ncustom_field:\n  owner: Beka\n  priority: high\n---\n# Note');

  assert.equal(result.ok, true);
  assert.equal(result.hasFrontmatter, true);
  assert.deepEqual(result.metadata.tags, ['project', 'research']);
  assert.equal(result.metadata.status, 'active');
  assert.deepEqual(result.metadata.custom_field, { owner: 'Beka', priority: 'high' });
  assert.equal(result.body, '# Note');
  assert.deepEqual(getSearchFields(result.metadata), {
    tags: ['project', 'research'],
    type: '',
    status: 'active',
    aliases: []
  });
});

test('preserves malformed frontmatter as Markdown content without throwing', () => {
  const source = '---\ntags: [project,\n---\n# Note';
  const result = readFrontmatter(source);

  assert.equal(result.ok, false);
  assert.equal(result.code, 'parse_error');
  assert.equal(result.body, source);
  assert.deepEqual(result.properties, []);
});

test('rejects excessive flow nesting before the YAML parser runs', () => {
  const source = '---\ntags: ' + '['.repeat(40) + 'safe' + ']'.repeat(40) + '\n---\n# Note';
  const result = readFrontmatter(source);

  assert.equal(result.ok, false);
  assert.equal(result.code, 'nesting_limit');
});

test('adds tags while preserving unrelated metadata', () => {
  const result = applyTags('---\ntags:\n  - project\nstatus: active\ncustom: keep-me\n---\n# Note', ['project', 'research']);

  assert.equal(result.ok, true);
  assert.deepEqual(result.metadata.tags, ['project', 'research']);
  assert.equal(result.metadata.status, 'active');
  assert.equal(result.metadata.custom, 'keep-me');
  assert.match(result.content, /status: active/);
  assert.match(result.content, /custom: keep-me/);
});

test('merges missing generated metadata without overriding existing values', () => {
  const result = mergeMetadata('---\nstatus: active\ntags:\n  - personal\n---\n# Imported', {
    tags: ['imported-note'],
    status: 'draft',
    type: 'imported-note'
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.metadata.tags, ['personal', 'imported-note']);
  assert.equal(result.metadata.status, 'active');
  assert.equal(result.metadata.type, 'imported-note');
});

test('does not rewrite malformed existing frontmatter', () => {
  const source = '---\ntags: [broken,\n---\n# Note';
  const result = mergeMetadata(source, { tags: ['safe'], type: 'note' });

  assert.equal(result.ok, false);
  assert.equal(result.content, source);
  assert.equal(result.code, 'parse_error');
});
