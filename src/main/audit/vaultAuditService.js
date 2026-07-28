'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { CURRENT_INTERNAL_NAMESPACE } = require('../../shared/internalNamespace');

function createVaultAuditService(options) {
  options = options || {};
  const fileSystem = options.fs || fs;
  const pathApi = options.pathApi || path;
  const now = typeof options.now === 'function' ? options.now : () => new Date();
  let auditPath = '';

  function setRoot(vaultRoot) {
    if (typeof vaultRoot !== 'string' || !vaultRoot.trim()) {
      return fail('invalid_vault_root', 'Vault root is required.');
    }

    auditPath = pathApi.join(
      pathApi.resolve(vaultRoot),
      CURRENT_INTERNAL_NAMESPACE,
      'audit.jsonl'
    );
    return ok({ auditPath });
  }

  function prepare() {
    if (!auditPath) return fail('vault_not_open', 'No vault is open.');

    try {
      fileSystem.mkdirSync(pathApi.dirname(auditPath), { recursive: true });
      const descriptor = fileSystem.openSync(auditPath, 'a');
      fileSystem.closeSync(descriptor);
      return ok({ auditPath });
    } catch (error) {
      return fail('audit_unavailable', 'Audit log is not writable.');
    }
  }

  function append(entry) {
    const ready = prepare();
    if (!ready.ok) return ready;

    const auditEntry = Object.assign({
      timestamp: now().toISOString()
    }, entry);
    try {
      fileSystem.appendFileSync(
        auditPath,
        JSON.stringify(auditEntry) + '\n',
        'utf8'
      );
      return ok({ auditPath, entry: auditEntry });
    } catch (error) {
      return fail('audit_failed', 'Could not append the audit log entry.');
    }
  }

  return Object.freeze({
    setRoot,
    prepare,
    append
  });
}

function ok(value) {
  return Object.assign({ ok: true }, value);
}

function fail(code, message) {
  return {
    ok: false,
    code,
    message
  };
}

module.exports = {
  createVaultAuditService
};
