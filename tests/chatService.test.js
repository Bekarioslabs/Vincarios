'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createProviderChatService } = require('../src/main/providers/providerChatService');
const { registerChatIpc } = require('../src/main/ipc/registerChatIpc');
const { IPC_CHANNELS } = require('../src/shared/ipc/channels');

test('provider chat service sends an OpenAI-compatible LM Studio chat request', async () => {
  const requests = [];
  const service = createProviderChatService({
    providers: [
      {
        id: 'lm-studio',
        label: 'LM Studio',
        baseUrl: 'http://127.0.0.1:1234',
        chatPath: '/v1/chat/completions',
        model: 'local-model'
      }
    ],
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            choices: [
              { message: { role: 'assistant', content: 'Hello from LM Studio.' } }
            ]
          };
        }
      };
    }
  });

  const result = await service.sendChat({
    messages: [{ role: 'user', content: 'Hello' }]
  });

  assert.equal(result.ok, true);
  assert.equal(result.message.role, 'assistant');
  assert.equal(result.message.content, 'Hello from LM Studio.');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'http://127.0.0.1:1234/v1/chat/completions');
  assert.equal(requests[0].options.method, 'POST');
  assert.equal(requests[0].options.headers['content-type'], 'application/json');
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    model: 'local-model',
    messages: [{ role: 'user', content: 'Hello' }],
    temperature: 0.3,
    stream: false
  });
});


test('provider chat service uses the first available provider model when configured for auto model', async () => {
  const requests = [];
  const service = createProviderChatService({
    providers: [
      {
        id: 'lm-studio',
        label: 'LM Studio',
        baseUrl: 'http://127.0.0.1:1234',
        chatPath: '/v1/chat/completions',
        model: 'auto'
      }
    ],
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      if (url.endsWith('/v1/models')) {
        return {
          ok: true,
          status: 200,
          async json() {
            return { data: [{ id: 'google/gemma-4-12b-qat' }] };
          }
        };
      }
      return {
        ok: true,
        status: 200,
        async json() {
          return { choices: [{ message: { content: 'Auto model OK.' } }] };
        }
      };
    }
  });

  const result = await service.sendChat({ messages: [{ role: 'user', content: 'Hello' }] });

  assert.equal(result.ok, true);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, 'http://127.0.0.1:1234/v1/models');
  assert.equal(JSON.parse(requests[1].options.body).model, 'google/gemma-4-12b-qat');
});
test('provider chat service returns a safe error result when provider request fails', async () => {
  const service = createProviderChatService({
    providers: [
      {
        id: 'lm-studio',
        label: 'LM Studio',
        baseUrl: 'http://127.0.0.1:1234',
        chatPath: '/v1/chat/completions',
        model: 'local-model'
      }
    ],
    fetchImpl: async () => {
      throw new Error('connection refused');
    }
  });

  const result = await service.sendChat({
    messages: [{ role: 'user', content: 'Hello' }]
  });

  assert.equal(result.ok, false);
  assert.equal(result.provider.id, 'lm-studio');
  assert.match(result.error, /unavailable/i);
});

test('chat IPC exposes chat sending through a chat-specific channel', async () => {
  const handlers = new Map();
  const ipcMain = {
    handle(channel, handler) {
      handlers.set(channel, handler);
    }
  };
  const chatService = {
    async sendChat(payload) {
      return {
        ok: true,
        payload,
        message: { role: 'assistant', content: 'OK' }
      };
    }
  };

  registerChatIpc(ipcMain, chatService);

  assert.equal(handlers.size, 1);
  assert.equal(handlers.has(IPC_CHANNELS.CHAT_SEND), true);
  assert.deepEqual(await handlers.get(IPC_CHANNELS.CHAT_SEND)(null, { messages: [] }), {
    ok: true,
    payload: { messages: [] },
    message: { role: 'assistant', content: 'OK' }
  });
});
test('chat IPC does not receive renderer context state automatically', async () => {
  const calls = [];
  const chatService = {
    async sendChat(payload) {
      calls.push(payload);
      return { ok: true, message: { role: 'assistant', content: 'OK' } };
    }
  };
  const handlers = new Map();
  const ipcMain = {
    handle(channel, handler) {
      handlers.set(channel, handler);
    }
  };

  registerChatIpc(ipcMain, chatService);
  await handlers.get(IPC_CHANNELS.CHAT_SEND)(null, {
    messages: [{ role: 'user', content: 'Summarize this.' }]
  });

  assert.deepEqual(calls[0], {
    messages: [{ role: 'user', content: 'Summarize this.' }]
  });
});
