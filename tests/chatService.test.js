'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createProviderChatService, getProviderTimeoutMs } = require('../src/main/providers/providerChatService');
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
  assert.equal(result.model, 'google/gemma-4-12b-qat');
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
  assert.equal(result.code, 'provider_unavailable');
  assert.match(result.error, /unavailable/i);
});


test('provider chat service rejects oversized message payloads before contacting provider', async () => {
  let requestCount = 0;
  const service = createProviderChatService({
    payloadLimits: {
      maxProviderMessageChars: 3
    },
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
      requestCount += 1;
      return { ok: true, status: 200, async json() { return {}; } };
    }
  });

  const result = await service.sendChat({
    messages: [{ role: 'user', content: 'abcd' }]
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /too large/i);
  assert.equal(requestCount, 0);
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

  assert.equal(handlers.size, 3);
  assert.equal(handlers.has(IPC_CHANNELS.CHAT_CHECK_UPDATE_BUDGET), true);
  assert.equal(handlers.has(IPC_CHANNELS.CHAT_SEND), true);
  assert.equal(handlers.has(IPC_CHANNELS.CHAT_CANCEL), true);
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

test('provider chat service sends an Ollama-native chat request', async () => {
  const requests = [];
  const service = createProviderChatService({
    activeProviderId: 'ollama',
    providers: [
      {
        id: 'ollama',
        label: 'Ollama',
        kind: 'ollama-native',
        baseUrl: 'http://127.0.0.1:11434',
        modelsPath: '/api/tags',
        chatPath: '/api/chat',
        model: 'llama3.2:latest'
      }
    ],
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return {
        ok: true,
        status: 200,
        async json() {
          return { message: { role: 'assistant', content: 'Hello from Ollama.' } };
        }
      };
    }
  });

  const result = await service.sendChat({
    messages: [{ role: 'user', content: 'Hello' }]
  });

  assert.equal(result.ok, true);
  assert.equal(result.provider.id, 'ollama');
  assert.equal(result.message.content, 'Hello from Ollama.');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'http://127.0.0.1:11434/api/chat');
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    model: 'llama3.2:latest',
    messages: [{ role: 'user', content: 'Hello' }],
    stream: false,
    options: { temperature: 0.3 }
  });
});

test('provider chat service resolves Ollama auto model from native tags response', async () => {
  const requests = [];
  const service = createProviderChatService({
    activeProviderId: 'ollama',
    providers: [
      {
        id: 'ollama',
        label: 'Ollama',
        kind: 'ollama-native',
        baseUrl: 'http://127.0.0.1:11434',
        modelsPath: '/api/tags',
        chatPath: '/api/chat',
        model: 'auto'
      }
    ],
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      if (url.endsWith('/api/tags')) {
        return {
          ok: true,
          status: 200,
          async json() {
            return { models: [{ name: 'qwen2.5:7b' }] };
          }
        };
      }
      return {
        ok: true,
        status: 200,
        async json() {
          return { message: { content: 'Auto Ollama OK.' } };
        }
      };
    }
  });

  const result = await service.sendChat({ messages: [{ role: 'user', content: 'Hello' }] });

  assert.equal(result.ok, true);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, 'http://127.0.0.1:11434/api/tags');
  assert.equal(JSON.parse(requests[1].options.body).model, 'qwen2.5:7b');
});

test('chat IPC exposes cancel and aborts a pending request by request id', async () => {
  const handlers = new Map();
  const ipcMain = {
    handle(channel, handler) {
      handlers.set(channel, handler);
    }
  };
  const signals = [];
  const chatService = {
    sendChat(payload, options) {
      signals.push(options.signal);
      return new Promise(() => {});
    }
  };

  registerChatIpc(ipcMain, chatService);
  handlers.get(IPC_CHANNELS.CHAT_SEND)(null, { requestId: 'req-1', messages: [{ role: 'user', content: 'Hi' }] });
  const cancelResult = await handlers.get(IPC_CHANNELS.CHAT_CANCEL)(null, { requestId: 'req-1' });

  assert.equal(handlers.has(IPC_CHANNELS.CHAT_CANCEL), true);
  assert.equal(cancelResult.ok, true);
  assert.equal(cancelResult.requestId, 'req-1');
  assert.equal(signals.length, 1);
  assert.equal(signals[0].aborted, true);
});

test('provider chat service cancels provider fetch when request signal aborts', async () => {
  const seenSignals = [];
  const controller = new AbortController();
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
      seenSignals.push(options.signal);
      controller.abort();
      const error = new Error('aborted');
      error.name = 'AbortError';
      throw error;
    }
  });

  const result = await service.sendChat({ messages: [{ role: 'user', content: 'Hi' }] }, { signal: controller.signal });

  assert.equal(result.ok, false);
  assert.equal(result.canceled, true);
  assert.equal(seenSignals.length, 1);
  assert.equal(seenSignals[0].aborted, true);
});

test('provider chat service returns canceled result when aborted before request', async () => {
  const controller = new AbortController();
  controller.abort();
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
      throw new Error('fetch should not run');
    }
  });

  const result = await service.sendChat({ messages: [{ role: 'user', content: 'Hi' }] }, { signal: controller.signal });

  assert.equal(result.ok, false);
  assert.equal(result.canceled, true);
  assert.match(result.error, /cancel/i);
});

test('provider chat service reports internal timeout separately from user cancel', async () => {
  const service = createProviderChatService({
    timeoutMs: 1,
    providers: [
      {
        id: 'lm-studio',
        label: 'LM Studio',
        baseUrl: 'http://127.0.0.1:1234',
        chatPath: '/v1/chat/completions',
        model: 'local-model'
      }
    ],
    fetchImpl: async (url, options) => new Promise((resolve, reject) => {
      options.signal.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      }, { once: true });
    })
  });

  const result = await service.sendChat({ messages: [{ role: 'user', content: 'Hi' }] });

  assert.equal(result.ok, false);
  assert.equal(result.canceled, undefined);
  assert.equal(result.code, 'provider_timed_out');
  assert.match(result.error, /timed out/i);
});

test('provider chat service reads provider timeout from settings store', () => {
  const settingsStore = {
    getSettings() {
      return { limits: { providerTimeoutMs: 180000 } };
    }
  };

  assert.equal(getProviderTimeoutMs(settingsStore, 120000), 180000);
  assert.equal(getProviderTimeoutMs(null, 120000), 120000);
});
