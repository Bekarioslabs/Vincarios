'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { resolveVaultPath } = require('../src/main/safety/pathSafety');
const { scanVaultMarkdownDocuments } = require('../src/main/indexing/asyncVaultMarkdownScanner');

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

for (const targetFolder of ['.obsidian', '.vincarios', '.git', 'Nested/.ObSiDiAn/Settings']) {
  for (const targetPath of ['Linked/Outside.md', 'Linked/New/Nested.md']) {
    test('canonical vault path blocks protected junction target ' + targetFolder + ': ' + targetPath, (context) => {
      const fixture = createJunctionFixture(context, { targetFolder });
      if (!fixture) return;

      const result = resolveVaultPath(fixture.vaultRoot, targetPath, { allowRoot: false });

      assert.equal(result.ok, false);
      assert.equal(result.code, 'protected_path');
    });
  }
}

for (const targetPath of ['Linked/Outside.md', 'Linked/New/Nested.md']) {
  test('canonical vault path allows an ordinary in-vault junction: ' + targetPath, (context) => {
    const fixture = createJunctionFixture(context, { targetFolder: 'Notes' });
    if (!fixture) return;

    const result = resolveVaultPath(fixture.vaultRoot, targetPath, { allowRoot: false });

    assert.equal(result.ok, true);
    assert.equal(result.relativePath, targetPath);
  });
}

test('canonical vault path does not treat the vault root name as a protected relative segment', (context) => {
  const fixture = createJunctionFixture(context, { vaultName: '.obsidian', targetFolder: 'Notes' });
  if (!fixture) return;

  assert.equal(resolveVaultPath(fixture.vaultRoot, '', { allowRoot: true }).ok, true);
  assert.equal(resolveVaultPath(fixture.vaultRoot, 'Linked/Outside.md', { allowRoot: false }).ok, true);
  assert.equal(resolveVaultPath(fixture.vaultRoot, '', { allowRoot: false }).code, 'root_not_allowed');
});

for (const targetFolder of ['.obsidian', '.vincarios']) {
  test('Markdown indexing excludes protected folder contents and its junction alias: ' + targetFolder, async (context) => {
    const fixture = createJunctionFixture(context, { targetFolder });
    if (!fixture) return;
    fs.writeFileSync(path.join(fixture.vaultRoot, 'Visible.md'), '# Visible', 'utf8');

    const result = await scanVaultMarkdownDocuments(fixture.vaultRoot);

    assert.equal(result.ok, true);
    assert.deepEqual(result.documents.map((document) => document.path), ['Visible.md']);
    assert.equal(result.documents[0].content, '# Visible');
  });
}

function createJunctionFixture(context, options) {
  options = options || {};
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-path-safety-'));
  const vaultRoot = path.join(fixtureRoot, options.vaultName || 'Vault');
  const outsideRoot = options.targetFolder
    ? path.join(vaultRoot, ...options.targetFolder.split('/'))
    : path.join(fixtureRoot, 'Outside');
  fs.mkdirSync(vaultRoot);
  fs.mkdirSync(outsideRoot, { recursive: true });
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
