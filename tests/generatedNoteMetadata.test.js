'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ORIGIN_ACTIONS,
  applyGeneratedNoteMetadata,
  buildGeneratedNoteMetadata
} = require('../src/shared/metadata/generatedNoteMetadata');

const FIXED_NOW = new Date('2026-07-09T10:30:00.000Z');

test('save assistant response receives deterministic reviewed metadata', () => {
  const result = applyGeneratedNoteMetadata('# Answer\n\nBody.', {
    originAction: ORIGIN_ACTIONS.saveAssistantResponse,
    now: FIXED_NOW
  });

  assert.match(result.content, /^---\n/);
  assert.deepEqual(result.metadata, {
    tags: ['ai-response'],
    type: 'ai-response',
    status: 'draft',
    source: 'zeus',
    created_at: '2026-07-09',
    origin_action: 'save_assistant_response'
  });
  assert.match(result.content, /\n---\n\n# Answer\n\nBody\.$/);
});

test('summary origin overrides response defaults without duplicating policy logic', () => {
  const metadata = buildGeneratedNoteMetadata({
    originAction: ORIGIN_ACTIONS.summarizeFile,
    now: FIXED_NOW
  });

  assert.deepEqual(metadata.tags, ['ai-summary']);
  assert.equal(metadata.type, 'summary');
  assert.equal(metadata.origin_action, 'summarize_file');
});

test('existing frontmatter is preserved and missing defaults are appended', () => {
  const result = applyGeneratedNoteMetadata('---\ntags:\n  - personal\nstatus: active\n---\n# Imported', {
    originAction: ORIGIN_ACTIONS.importMarkdown,
    now: FIXED_NOW
  });

  assert.match(result.content, /tags:\n  - personal\n  - imported-note/);
  assert.match(result.content, /status: active/);
  assert.doesNotMatch(result.content, /status: draft/);
  assert.match(result.content, /type: imported-note/);
  assert.match(result.content, /source: external-markdown/);
  assert.match(result.content, /origin_action: import_markdown/);
});

test('preset values define note type while the central policy owns YAML creation', () => {
  const result = applyGeneratedNoteMetadata('# Tasks\n\n- [ ]', {
    originAction: ORIGIN_ACTIONS.createFromPreset,
    metadata: {
      tags: ['project', 'tasks'],
      type: 'task-list',
      source: 'preset:project.default'
    },
    now: FIXED_NOW
  });

  assert.equal(result.metadata.type, 'task-list');
  assert.deepEqual(result.metadata.tags, ['project', 'tasks']);
  assert.equal(result.metadata.source, 'preset:project.default');
  assert.equal(result.metadata.origin_action, 'create_from_preset');
  assert.doesNotMatch(result.content, /ai-response/);
});

test('created_at uses the local calendar date instead of the UTC date', () => {
  const nearMidnight = new Date(2026, 6, 9, 0, 30, 0);
  const metadata = buildGeneratedNoteMetadata({
    originAction: ORIGIN_ACTIONS.saveAssistantResponse,
    now: nearMidnight
  });

  assert.equal(metadata.created_at, '2026-07-09');
});
test('created_by is never emitted', () => {
  const result = applyGeneratedNoteMetadata('# Note', {
    originAction: ORIGIN_ACTIONS.saveAssistantResponse,
    metadata: { created_by: 'model' },
    now: FIXED_NOW
  });

  assert.equal(Object.hasOwn(result.metadata, 'created_by'), false);
  assert.doesNotMatch(result.content, /created_by:/);
});
