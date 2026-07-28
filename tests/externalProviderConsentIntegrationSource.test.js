'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('chat sends explicit context privacy metadata after the external consent module', () => {
  const index = read('index.html');
  const chat = read('src/renderer/chat/mountChat.js');
  const consentIndex = index.indexOf('./src/renderer/providers/externalProviderConsent.js');
  const chatIndex = index.indexOf('./src/renderer/chat/mountChat.js');

  assert.equal(consentIndex > -1, true);
  assert.equal(consentIndex < chatIndex, true);
  assert.match(chat, /VincariosExternalProviderConsent/);
  assert.match(chat, /containsVaultContext/);
  assert.match(chat, /approvedEndpoint/);
});
