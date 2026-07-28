'use strict';

function executeAuditedMutation(options) {
  options = options || {};
  const auditService = options.auditService;
  if (!auditService || typeof auditService.prepare !== 'function' || typeof auditService.append !== 'function') {
    return fail('audit_unavailable', 'Audit service is unavailable.');
  }

  const ready = auditService.prepare();
  if (!ready.ok) return ready;

  try {
    options.mutate();
  } catch (error) {
    const mutationCode = options.mutationFailureCode || 'write_failed';
    const mutationMessage = options.mutationFailureMessage || 'Could not apply the vault change.';
    try {
      options.rollback();
    } catch (rollbackError) {
      return fail(
        'rollback_failed',
        'The vault change failed and partial work could not be rolled back.',
        {
          mutationCode,
          recoveryRequired: true
        }
      );
    }
    return fail(mutationCode, mutationMessage, { rolledBack: true });
  }

  const audit = auditService.append(options.auditEntry || {});
  if (audit.ok) return ok();

  try {
    options.rollback();
  } catch (error) {
    return fail(
      'rollback_failed',
      'Audit logging failed and the vault change could not be rolled back.',
      {
        auditCode: audit.code,
        recoveryRequired: true
      }
    );
  }

  return fail(
    'audit_failed',
    'Audit logging failed. The vault change was rolled back.',
    {
      auditCode: audit.code,
      rolledBack: true
    }
  );
}

function ok(value) {
  return Object.assign({ ok: true }, value || {});
}

function fail(code, message, details) {
  return Object.assign({
    ok: false,
    code,
    message
  }, details || {});
}

module.exports = {
  executeAuditedMutation
};
