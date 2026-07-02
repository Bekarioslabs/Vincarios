'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('index loads template preset modules before shell bootstrap', () => {
  const source = read('index.html');

  const vaultProfile = source.indexOf('src/shared/vaultProfile/defaults.js');
  const presetRegistry = source.indexOf('src/shared/templates/presetRegistry.js');
  const presetProposals = source.indexOf('src/shared/templates/presetProposals.js');
  const mountCreationPresets = source.indexOf('src/renderer/templates/mountCreationPresets.js');
  const shell = source.indexOf('src/renderer/shell/mountShell.js');

  assert.ok(vaultProfile > -1);
  assert.ok(presetRegistry > vaultProfile);
  assert.ok(presetProposals > presetRegistry);
  assert.ok(mountCreationPresets > presetProposals);
  assert.ok(shell > mountCreationPresets);
});

test('shell mounts creation presets through a dedicated renderer module', () => {
  const source = read('src/renderer/shell/mountShell.js');

  assert.match(source, /window\.ZeusCreationPresets/);
  assert.match(source, /mountCreationPresets\(\{ app, api, reviewBasket, status \}\)/);
});

test('create preset buttons are wired as real preset targets', () => {
  const source = read('src/renderer/shell/mountShell.js');

  assert.match(source, /data-preset-list="note"/);
  assert.match(source, /data-preset-list="project"/);
  assert.doesNotMatch(source, /data-future-slot="note-preset-list"/);
  assert.doesNotMatch(source, /data-future-slot="project-preset-list"/);
});
