'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createChatRequestId, isRequestActive } = require('../src/renderer/chat/mountChat');

test('chat request ids are unique and prefixed for cancel tracking', () => {
  const first = createChatRequestId();
  const second = createChatRequestId();

  assert.match(first, /^chat-/);
  assert.match(second, /^chat-/);
  assert.notEqual(first, second);
});

test('chat active request check rejects canceled or stale requests', () => {
  assert.equal(isRequestActive({ requestId: 'req-1', canceled: false }, 'req-1'), true);
  assert.equal(isRequestActive({ requestId: 'req-1', canceled: true }, 'req-1'), false);
  assert.equal(isRequestActive({ requestId: 'req-2', canceled: false }, 'req-1'), false);
  assert.equal(isRequestActive(null, 'req-1'), false);
});