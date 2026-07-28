'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  collectRuntimeLicenses,
  evaluateLicenseInventory,
  packageNameFromLockPath,
} = require('../scripts/check-licenses');

test('license inventory includes runtime packages and excludes development-only packages', () => {
  const packages = {
    '': { name: 'vincarios', version: '0.1.0' },
    'node_modules/runtime': { version: '1.0.0', license: 'MIT' },
    'node_modules/dev-only': { version: '2.0.0', license: 'MIT', dev: true },
    'node_modules/@scope/runtime': { version: '3.0.0', license: 'Apache-2.0' },
  };
  assert.deepEqual(collectRuntimeLicenses(packages), [
    { name: '@scope/runtime', version: '3.0.0', license: 'Apache-2.0' },
    { name: 'runtime', version: '1.0.0', license: 'MIT' },
  ]);
});

test('license path parser keeps scoped package names and nested package names', () => {
  assert.equal(packageNameFromLockPath('node_modules/@scope/name'), '@scope/name');
  assert.equal(packageNameFromLockPath('node_modules/a/node_modules/b'), 'b');
});

test('license policy rejects missing and unreviewed license expressions', () => {
  const result = evaluateLicenseInventory([
    { name: 'safe', version: '1.0.0', license: 'MIT' },
    { name: 'missing', version: '1.0.0', license: '' },
    { name: 'restricted', version: '1.0.0', license: 'AGPL-3.0-only' },
  ]);
  assert.equal(result.ok, false);
  assert.deepEqual(result.missing.map((entry) => entry.name), ['missing']);
  assert.deepEqual(result.unreviewed.map((entry) => entry.name), ['restricted']);
});

test('license policy accepts the reviewed runtime license expressions', () => {
  const result = evaluateLicenseInventory([
    { name: 'a', version: '1', license: 'MIT' },
    { name: 'b', version: '1', license: 'Apache-2.0 AND LGPL-3.0-or-later' },
    { name: 'c', version: '1', license: '(MIT OR CC0-1.0)' },
  ]);
  assert.equal(result.ok, true);
});