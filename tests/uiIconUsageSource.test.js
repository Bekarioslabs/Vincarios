'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('chat send button uses semantic send and close icons instead of glyph text', () => {
  const source = read('src/renderer/chat/mountChat.js');

  assert.match(source, /renderSendButtonIcon\(sendButton,\s*'send'\)/);
  assert.match(source, /renderSendButtonIcon\(sendButton,\s*busy\s*\?\s*'close'\s*:\s*'send'\)/);
  assert.doesNotMatch(source, /sendButton\.textContent\s*=\s*['"]>['"]/);
  assert.doesNotMatch(source, /sendButton\.textContent\s*=\s*busy\s*\?\s*['"]X['"]/);
});

test('preview history buttons use semantic chevron icons', () => {
  const source = read('src/renderer/markdown/markdownPreviewController.js');

  assert.match(source, /setButtonIcon\(backButton,\s*'chevronLeft'\)/);
  assert.match(source, /setButtonIcon\(forwardButton,\s*'chevronRight'\)/);
});

test('settings close icon button uses the shared close icon', () => {
  const source = read('src/renderer/settings/mountSettingsPanel.js');

  assert.match(source, /createIconElement\('close'/);
  assert.doesNotMatch(source, /Close settings">×<\/button>/);
});

test('context basket remove action uses the shared close icon', () => {
  const source = read('src/renderer/context/mountContextBasket.js');

  assert.match(source, /createIconElement\('close'/);
  assert.doesNotMatch(source, /remove\.textContent\s*=\s*['"]x['"]/);
});

test('send semantic icon maps to local arrow-up asset', () => {
  const source = read('src/renderer/icons/iconRegistry.js');

  assert.match(source, /send:\s*'arrow-up\.svg'/);
});
