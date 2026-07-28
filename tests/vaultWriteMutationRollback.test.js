'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { executeAuditedMutation } = require('../src/main/vault/vaultWriteTransaction');

test('audited mutation rolls back partial work when mutation throws', () => {
  const state = [];
  const result = executeAuditedMutation({
    auditService: {
      prepare: () => ({ ok: true }),
      append: () => ({ ok: true })
    },
    mutate() {
      state.push('partial');
      throw new Error('Injected mutation failure');
    },
    rollback() {
      state.length = 0;
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'write_failed');
  assert.equal(result.rolledBack, true);
  assert.deepEqual(state, []);
});
