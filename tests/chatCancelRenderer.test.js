'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createChatRequestId, isRequestActive, setChatBusy } = require('../src/renderer/chat/mountChat');

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
test('chat busy state uses compact cancel symbol and keeps button clickable', () => {
  const input = { readOnly: false, attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } };
  const button = { disabled: true, textContent: '', dataset: {} };

  setChatBusy(input, button, true);

  assert.equal(input.readOnly, true);
  assert.equal(input.attributes['aria-disabled'], 'true');
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, 'X');
  assert.equal(button.dataset.chatState, 'running');

  setChatBusy(input, button, false);

  assert.equal(input.readOnly, false);
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, '>');
  assert.equal(button.dataset.chatState, 'idle');
});
