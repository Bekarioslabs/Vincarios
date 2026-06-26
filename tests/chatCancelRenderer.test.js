'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createChatRequestId, isRequestActive, setChatBusy, cancelActiveChatRequest } = require('../src/renderer/chat/mountChat');

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

test('canceling active chat request releases UI immediately without waiting for IPC', () => {
  const input = { readOnly: true, focused: false, attributes: {}, setAttribute(name, value) { this.attributes[name] = value; }, focus() { this.focused = true; } };
  const button = { disabled: false, textContent: 'X', dataset: { chatState: 'running' } };
  const status = { textContent: '' };
  const pending = { removed: false, remove() { this.removed = true; } };
  const activeRequest = { requestId: 'req-1', canceled: false, pending };
  const cancelCalls = [];
  const api = {
    chat: {
      cancel(payload) {
        cancelCalls.push(payload);
        return new Promise(() => {});
      }
    }
  };
  let storedRequest = activeRequest;

  const result = cancelActiveChatRequest({
    api,
    activeRequest,
    setActiveRequest(next) { storedRequest = next; },
    input,
    sendButton: button,
    status
  });

  assert.equal(result.ok, true);
  assert.equal(activeRequest.canceled, true);
  assert.equal(pending.removed, true);
  assert.equal(storedRequest, null);
  assert.equal(input.readOnly, false);
  assert.equal(input.focused, true);
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, '>');
  assert.equal(status.textContent, 'Request canceled.');
  assert.deepEqual(cancelCalls, [{ requestId: 'req-1' }]);
});
