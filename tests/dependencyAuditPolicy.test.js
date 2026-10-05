'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluateAuditReport,
  evaluateAuditJson,
} = require('../scripts/audit-dependencies');

function knownBuildReport() {
  return {
    vulnerabilities: {
      'brace-expansion': {
        via: [{ url: 'https://github.com/advisories/GHSA-mh99-v99m-4gvg' }],
      },
      minimatch: { via: ['brace-expansion'] },
      glob: { via: ['minimatch'] },
      '@electron/asar': { via: ['glob', 'minimatch'] },
      'app-builder-lib': { via: ['@electron/asar'] },
      'electron-builder': { via: ['app-builder-lib'] },
    },
  };
}

test('dependency audit policy rejects previously documented build-time advisories', () => {
  const result = evaluateAuditReport(knownBuildReport());
  assert.equal(result.ok, false);
  assert.deepEqual(result.advisories, ['GHSA-mh99-v99m-4gvg']);
  assert.equal(result.unexpected.some((entry) => entry.name === 'brace-expansion'), true);
});

test('dependency audit policy rejects a new advisory even on an allow-listed build package', () => {
  const report = knownBuildReport();
  report.vulnerabilities.glob.via.push({ url: 'https://github.com/advisories/GHSA-new-risk' });
  const result = evaluateAuditReport(report);
  assert.equal(result.ok, false);
  assert.equal(result.unexpected.some((entry) => entry.advisories.includes('GHSA-new-risk')), true);
});

test('dependency audit policy rejects unexpected vulnerable packages', () => {
  const report = knownBuildReport();
  report.vulnerabilities['runtime-package'] = {
    via: [{ url: 'https://github.com/advisories/GHSA-mh99-v99m-4gvg' }],
  };
  const result = evaluateAuditReport(report);
  assert.equal(result.ok, false);
  assert.equal(result.unexpected.some((entry) => entry.name === 'runtime-package'), true);
});

test('dependency audit policy accepts an npm JSON report from stdin', () => {
  const result = evaluateAuditJson(JSON.stringify({ vulnerabilities: {} }));

  assert.equal(result.ok, true);
  assert.deepEqual(result.advisories, []);
});

test('dependency audit policy rejects malformed npm JSON input', () => {
  const result = evaluateAuditJson('not-json');

  assert.equal(result.ok, false);
  assert.equal(result.message, 'npm audit output could not be parsed.');
});

test('dependency audit policy fails closed on npm registry errors', () => {
  const result = evaluateAuditJson(JSON.stringify({
    error: {
      code: 'ENETUNREACH',
      summary: 'Audit endpoint could not be reached.',
    },
  }));

  assert.equal(result.ok, false);
  assert.equal(result.message, 'npm audit report is incomplete or contains an error.');
});
