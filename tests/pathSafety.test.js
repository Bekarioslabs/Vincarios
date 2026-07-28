'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { resolveVaultPath } = require('../src/main/safety/pathSafety');

test('canonical vault path rejects an existing target reached through an escaping junction', (context) => {
  const fixture = createJunctionFixture(context);
  if (!fixture) return;

  const result = resolveVaultPath(fixture.vaultRoot, 'Linked/Outside.md', { allowRoot: false });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'outside_vault');
});

test('canonical vault path rejects a new target below an escaping junction', (context) => {
  const fixture = createJunctionFixture(context);
  if (!fixture) return;

  const result = resolveVaultPath(fixture.vaultRoot, 'Linked/New.md', { allowRoot: false });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'outside_vault');
});

function createJunctionFixture(context) {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-path-safety-'));
  const vaultRoot = path.join(fixtureRoot, 'Vault');
  const outsideRoot = path.join(fixtureRoot, 'Outside');
  fs.mkdirSync(vaultRoot);
  fs.mkdirSync(outsideRoot);
  fs.writeFileSync(path.join(outsideRoot, 'Outside.md'), '# Outside', 'utf8');
  context.after(() => fs.rmSync(fixtureRoot, { recursive: true, force: true }));

  try {
    fs.symlinkSync(outsideRoot, path.join(vaultRoot, 'Linked'), 'junction');
  } catch (error) {
    context.skip('Junction creation is unavailable: ' + error.message);
    return null;
  }

  return { vaultRoot, outsideRoot };
}
