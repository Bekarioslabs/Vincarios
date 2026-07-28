'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeSimilarNotesFormOptions
} = require('../src/renderer/selectionActions/similarNotesForm');
const {
  normalizeUpdateInstruction
} = require('../src/renderer/selectionActions/updateInstructionForm');

test('similar notes form normalizes one explicit source and scope', () => {
  const sourceOptions = createSourceOptions();

  assert.deepEqual(normalizeSimilarNotesFormOptions({
    mode: 'metadata',
    minimumScorePercent: '72',
    maxResults: '12',
    scope: 'whole_vault',
    refreshIndex: true
  }, sourceOptions), {
    mode: 'metadata',
    minimumScorePercent: '72',
    contentWeight: 0,
    metadataWeight: 1,
    limit: '12',
    scope: 'whole_vault',
    refreshIndex: true
  });
});

test('similar notes form falls back to safe visible defaults', () => {
  const sourceOptions = createSourceOptions();

  assert.deepEqual(normalizeSimilarNotesFormOptions({}, sourceOptions), {
    mode: 'mixed',
    minimumScorePercent: '65',
    contentWeight: 0.75,
    metadataWeight: 0.25,
    limit: '8',
    scope: 'same_role',
    refreshIndex: false
  });
});

test('similar notes form preserves an explicit zero minimum score', () => {
  const sourceOptions = createSourceOptions();

  assert.equal(normalizeSimilarNotesFormOptions({
    minimumScorePercent: 0
  }, sourceOptions).minimumScorePercent, '0');
});
test('update instruction requires non-empty text', () => {
  assert.deepEqual(normalizeUpdateInstruction('  Add one section.  '), {
    ok: true,
    instruction: 'Add one section.'
  });
  assert.deepEqual(normalizeUpdateInstruction('   '), {
    ok: false,
    code: 'instruction_required',
    message: 'Update proposal needs an instruction.'
  });
});

function createSourceOptions() {
  return {
    normalize(value) {
      return ['content', 'metadata', 'mixed'].includes(value) ? value : 'mixed';
    },
    weightsFor(value) {
      const mode = this.normalize(value);
      if (mode === 'content') return { mode, contentWeight: 1, metadataWeight: 0 };
      if (mode === 'metadata') return { mode, contentWeight: 0, metadataWeight: 1 };
      return { mode, contentWeight: 0.75, metadataWeight: 0.25 };
    }
  };
}
