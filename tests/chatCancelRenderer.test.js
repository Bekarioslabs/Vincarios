'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createChatRequestId, isRequestActive, setChatBusy, cancelActiveChatRequest, runProviderRequest } = require('../src/renderer/chat/mountChat');

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

test('late provider responses after cancel remove pending without appending assistant text', async () => {
  const pending = { removed: false, remove() { this.removed = true; } };
  const messages = [{ role: 'user', content: 'hello' }];
  const status = { textContent: '' };
  const chatLog = { appended: false, querySelector() { return null; }, appendChild() { this.appended = true; } };

  await runProviderRequest({
    api: {
      chat: {
        send() {
          return Promise.resolve({ ok: true, message: { content: 'late answer' } });
        }
      }
    },
    chatLog,
    content: 'hello',
    messages,
    contextState: null,
    reviewBasket: null,
    status,
    pending,
    requestId: 'req-late',
    isRequestActive() { return false; }
  });

  assert.equal(pending.removed, true);
  assert.equal(chatLog.appended, false);
  assert.deepEqual(messages, [{ role: 'user', content: 'hello' }]);
  assert.equal(status.textContent, 'Request canceled.');
});
test('normal chat pending messages use the shared pending spinner class', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'chat', 'mountChat.js'), 'utf8');

  assert.match(source, /appendMessage\(chatLog, 'assistant', 'Thinking\.\.\.', \{ allowSave: false, pending: true \}\)/);
  assert.match(source, /if \(options\.pending\) message\.classList\.add\('chat-message-pending'\)/);
});
test('provider request includes requestId so main can abort the provider fetch', async () => {
  const sentPayloads = [];
  const pending = { remove() {} };

  await runProviderRequest({
    api: {
      chat: {
        send(payload) {
          sentPayloads.push(payload);
          return Promise.resolve({ ok: true, message: { content: 'ignored after abort' } });
        }
      }
    },
    chatLog: { querySelector() { return null; }, appendChild() {} },
    content: 'hello',
    messages: [{ role: 'user', content: 'hello' }],
    contextState: null,
    reviewBasket: null,
    status: { textContent: '' },
    pending,
    requestId: 'req-provider-abort',
    isRequestActive() { return false; }
  });

  assert.equal(sentPayloads[0].requestId, 'req-provider-abort');
});
