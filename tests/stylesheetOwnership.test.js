'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('large renderer styles are split by visible UI ownership', () => {
  const layout = read('src/renderer/styles/layout.css');
  const chat = read('src/renderer/styles/chat.css');
  const actions = read('src/renderer/styles/selectionActions.css');
  const startup = read('src/renderer/styles/startup.css');

  assert.match(chat, /\.chat-log\s*\{/);
  assert.match(chat, /\.context-slot\s*\{/);
  assert.match(chat, /\.send-button-shell\s*\{/);
  assert.match(actions, /\.selection-actions-pane\s*\{/);
  assert.match(actions, /\.selection-action-form\s*\{/);
  assert.match(startup, /\.start-screen\s*\{/);

  assert.doesNotMatch(layout, /\.chat-log\s*\{/);
  assert.doesNotMatch(layout, /\.selection-actions-pane\s*\{/);
  assert.doesNotMatch(layout, /\.selection-action-form\s*\{/);
  assert.doesNotMatch(layout, /\.start-screen\s*\{/);
});

test('focused stylesheets load after shell layout and before component overrides', () => {
  const source = read('index.html');
  const layout = source.indexOf('styles/layout.css');
  const chat = source.indexOf('styles/chat.css');
  const actions = source.indexOf('styles/selectionActions.css');
  const startup = source.indexOf('styles/startup.css');
  const files = source.indexOf('styles/files.css');

  assert.equal(layout > -1, true);
  assert.equal(chat > layout, true);
  assert.equal(actions > chat, true);
  assert.equal(startup > actions, true);
  assert.equal(files > startup, true);
});
