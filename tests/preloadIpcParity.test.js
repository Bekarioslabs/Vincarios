'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { IPC_CHANNELS } = require('../src/shared/ipc/channels');

test('sandboxed preload channel table stays identical to the shared IPC contract', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload', 'index.js'), 'utf8');
  const block = source.match(/const IPC_CHANNELS = Object\.freeze\(\{([\s\S]*?)\}\);/);
  assert.ok(block, 'Preload IPC channel table is missing.');

  const preloadChannels = {};
  const linePattern = /^\s*([A-Z0-9_]+):\s*'([^']+)',?\s*$/gm;
  let match;
  while ((match = linePattern.exec(block[1])) !== null) {
    preloadChannels[match[1]] = match[2];
  }

  assert.deepEqual(preloadChannels, IPC_CHANNELS);
});

test('every preload IPC reference resolves to a declared channel', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload', 'index.js'), 'utf8');
  const references = Array.from(source.matchAll(/IPC_CHANNELS\.([A-Z0-9_]+)/g), (match) => match[1]);
  const unknown = Array.from(new Set(references)).filter((name) => !IPC_CHANNELS[name]);

  assert.deepEqual(unknown, []);
});
