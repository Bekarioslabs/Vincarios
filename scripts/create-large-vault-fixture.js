'use strict';

const fs = require('node:fs');
const path = require('node:path');

async function createLargeVaultFixture(options) {
  options = options || {};
  const root = path.resolve(requiredPath(options.root));
  const noteCount = positiveInteger(options.noteCount, 3000);
  const folderCount = positiveInteger(options.folderCount, 30);

  await ensureEmptyDirectory(root);
  for (let index = 0; index < noteCount; index += 1) {
    const folderName = 'Area-' + String((index % folderCount) + 1).padStart(2, '0');
    const noteName = 'Note-' + String(index + 1).padStart(4, '0') + '.md';
    const folderPath = path.join(root, folderName);
    await fs.promises.mkdir(folderPath, { recursive: true });
    await fs.promises.writeFile(path.join(folderPath, noteName), createNote(index + 1, folderName), 'utf8');
  }

  return { ok: true, root, noteCount, folderCount };
}

async function ensureEmptyDirectory(root) {
  try {
    const stat = await fs.promises.stat(root);
    if (!stat.isDirectory()) throw new Error('Target path must be a directory.');
    const entries = await fs.promises.readdir(root);
    if (entries.length) throw new Error('Target directory must be empty.');
  } catch (error) {
    if (error && error.code !== 'ENOENT') throw error;
    await fs.promises.mkdir(root, { recursive: true });
  }
}

function createNote(index, folderName) {
  const padded = String(index).padStart(4, '0');
  return [
    '---',
    'tags: [large-vault-fixture, performance, ' + folderName.toLowerCase() + ']',
    'type: Fixture Note',
    'fixture_index: ' + index,
    '---',
    '',
    '# Fixture Note ' + padded,
    '',
    'This deterministic large-vault-fixture note exists only for local performance checks.',
    'Shared search phrase: copper forest station. Unique search phrase: fixture-record-' + padded + '.',
    '',
    'Its content is intentionally plain Markdown so scan, metadata, full-text, and File Tree behavior can be measured without private vault data.',
    ''
  ].join('\n');
}

function requiredPath(value) {
  const target = String(value || '').trim();
  if (!target) throw new Error('A target directory is required.');
  return target;
}

function positiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

async function runCli() {
  const result = await createLargeVaultFixture({
    root: process.argv[2],
    noteCount: process.argv[3],
    folderCount: process.argv[4]
  });
  process.stdout.write('Created ' + result.noteCount + ' Markdown notes in ' + result.folderCount + ' folders at ' + result.root + '\n');
}

if (require.main === module) {
  runCli().catch((error) => {
    process.stderr.write((error && error.message ? error.message : 'Could not create large-vault fixture.') + '\n');
    process.exitCode = 1;
  });
}

module.exports = { createLargeVaultFixture };
