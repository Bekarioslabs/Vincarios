'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('index loads markdown drop controller before chat and shell', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const dropIndex = source.indexOf('./src/renderer/chat/markdownDropController.js');
  const chatIndex = source.indexOf('./src/renderer/chat/mountChat.js');
  const shellIndex = source.indexOf('./src/renderer/shell/mountShell.js');

  assert.equal(dropIndex > -1, true);
  assert.equal(dropIndex < chatIndex, true);
  assert.equal(chatIndex < shellIndex, true);
});

test('bootstrap requires markdown drop controller for startup validation', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'bootstrap.js'), 'utf8');

  assert.match(source, /VincariosMarkdownDropController/);
  assert.match(source, /mountMarkdownDropController/);
});

test('chat mounts markdown drop controller with context and review basket', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'chat', 'mountChat.js'), 'utf8');

  assert.match(source, /mountOptionalMarkdownDropController/);
  assert.match(source, /window\.VincariosMarkdownDropController/);
  assert.match(source, /contextState/);
  assert.match(source, /reviewBasket/);
});