'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createLargeVaultFixture } = require('../scripts/create-large-vault-fixture');

test('large vault fixture creates deterministic Markdown notes in a new empty directory', async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-large-vault-'));
  const root = path.join(parent, 'fixture');
  try {
    const result = await createLargeVaultFixture({ root, noteCount: 12, folderCount: 3 });

    assert.deepEqual(result, { ok: true, root, noteCount: 12, folderCount: 3 });
    assert.equal(countMarkdownFiles(root), 12);
    assert.match(fs.readFileSync(path.join(root, 'Area-01', 'Note-0001.md'), 'utf8'), /large-vault-fixture/);
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test('large vault fixture refuses a non-empty target directory', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-large-vault-nonempty-'));
  try {
    fs.writeFileSync(path.join(root, 'existing.md'), '# Existing');
    await assert.rejects(
      createLargeVaultFixture({ root, noteCount: 3, folderCount: 1 }),
      /Target directory must be empty/
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function countMarkdownFiles(root) {
  let count = 0;
  const folders = [root];
  while (folders.length) {
    const folder = folders.pop();
    fs.readdirSync(folder, { withFileTypes: true }).forEach((entry) => {
      const entryPath = path.join(folder, entry.name);
      if (entry.isDirectory()) folders.push(entryPath);
      else if (entry.isFile() && entry.name.endsWith('.md')) count += 1;
    });
  }
  return count;
}
