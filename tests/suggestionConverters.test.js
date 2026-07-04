'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isConvertibleSuggestion,
  convertSuggestionToReviewProposal,
  getConvertibleCheckedSuggestions,
  buildSuggestionDiffPreview
} = require('../src/renderer/suggestions/suggestionConverters');

function metadataSuggestion(overrides) {
  return Object.assign({
    id: 'tags-1',
    kind: 'metadata_candidate',
    title: 'Add project tag',
    path: '02_Projects/Alpha/Note.md',
    checked: true,
    data: {
      currentContent: '---\ntags:\n  - alpha\n---\n# Note',
      proposedContent: '---\ntags:\n  - alpha\n  - project\n---\n# Note',
      reason: 'Project tag is missing.'
    }
  }, overrides || {});
}

test('metadata candidate converts to an update note proposal', () => {
  const item = metadataSuggestion();

  assert.equal(isConvertibleSuggestion(item), true);
  const result = convertSuggestionToReviewProposal(item);

  assert.equal(result.ok, true);
  assert.equal(result.proposal.type, 'update_note');
  assert.equal(result.proposal.category, 'tags/properties');
  assert.equal(result.proposal.targetPath, '02_Projects/Alpha/Note.md');
  assert.equal(result.proposal.currentContent.includes('- alpha'), true);
  assert.equal(result.proposal.proposedContent.includes('- project'), true);
  assert.match(result.proposal.title, /Update metadata/);
});

test('similar note suggestions are report-only and not convertible', () => {
  const item = { kind: 'similar_note', path: 'A.md', checked: true, data: { currentContent: '# A', proposedContent: '# B' } };

  assert.equal(isConvertibleSuggestion(item), false);
  assert.equal(convertSuggestionToReviewProposal(item).ok, false);
});

test('conversion requires current and proposed content for stale-safe review', () => {
  const item = metadataSuggestion({ data: { proposedContent: '# New' } });

  const result = convertSuggestionToReviewProposal(item);

  assert.equal(result.ok, false);
  assert.equal(result.code, 'missing_content');
});

test('checked convertible suggestions are selected as a batch boundary', () => {
  const snapshot = {
    groups: [{
      id: 'metadata:test',
      items: [
        metadataSuggestion({ id: 'a', checked: true }),
        metadataSuggestion({ id: 'b', checked: false }),
        { id: 'c', kind: 'similar_note', checked: true, path: 'Other.md' }
      ]
    }]
  };

  const result = getConvertibleCheckedSuggestions(snapshot);

  assert.equal(result.checked.length, 2);
  assert.equal(result.convertible.length, 1);
  assert.equal(result.canConvertAll, false);
});

test('metadata candidate preview uses the shared markdown diff helper', () => {
  const preview = buildSuggestionDiffPreview(metadataSuggestion());

  assert.equal(preview.ok, true);
  assert.equal(preview.changed, true);
  assert.equal(preview.summary, '+1 -0');
  assert.equal(preview.hunks[0].lines.some((line) => line.type === 'add' && line.text.includes('project')), true);
});
