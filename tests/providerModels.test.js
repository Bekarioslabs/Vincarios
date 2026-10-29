'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createProviderSettingsState } = require('../src/main/providers/providerRegistry');
const { createProviderModelService } = require('../src/main/providers/providerModelService');
const { createProviderChatService } = require('../src/main/providers/providerChatService');

test('provider model service lists models for the active LM Studio provider', async () => {
  const settingsState = createProviderSettingsState();
  const requests = [];
  const service = createProviderModelService({
    settingsState,
    fetchImpl: async (url) => {
      requests.push(url);
      return {
        ok: true,
        status: 200,
        async json() {
          return { data: [{ id: 'model-a' }, { id: 'model-b' }] };
        }
      };
    }
  });

  const result = await service.listModels();

  assert.equal(result.ok, true);
  assert.equal(result.activeProvider.id, 'lm-studio');
  assert.equal(result.selectedModel, 'auto');
  assert.deepEqual(result.models.map((model) => model.id), ['auto', 'model-a', 'model-b']);
  assert.deepEqual(requests, ['http://127.0.0.1:1234/v1/models']);
});

test('provider model selection is shared with chat requests', async () => {
  const settingsState = createProviderSettingsState();
  settingsState.setSelectedModel('lm-studio', 'model-b');
  const requests = [];
  const chat = createProviderChatService({
    settingsState,
    fetchImpl: async (url, options) => {
      requests.push({ url, body: JSON.parse(options.body) });
      return {
        ok: true,
        status: 200,
        async json() {
          return { choices: [{ message: { content: 'OK' } }] };
        }
      };
    }
  });

  const result = await chat.sendChat({ messages: [{ role: 'user', content: 'Hi' }] });

  assert.equal(result.ok, true);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].body.model, 'model-b');
});
test('provider model service lists Ollama models from native tags response', async () => {
  const settingsState = createProviderSettingsState();
  settingsState.setActiveProvider('ollama');
  const requests = [];
  const service = createProviderModelService({
    settingsState,
    fetchImpl: async (url) => {
      requests.push(url);
      return {
        ok: true,
        status: 200,
        async json() {
          return { models: [{ name: 'llama3.2:latest' }, { name: 'qwen2.5:7b' }] };
        }
      };
    }
  });

  const result = await service.listModels();

  assert.equal(result.ok, true);
  assert.equal(result.activeProvider.id, 'ollama');
  assert.deepEqual(result.models.map((model) => model.id), ['auto', 'llama3.2:latest', 'qwen2.5:7b']);
  assert.deepEqual(requests, ['http://127.0.0.1:11434/api/tags']);
});

test('provider model service persists active provider and selected model when settings store is supplied', () => {
  const settingsState = createProviderSettingsState();
  const calls = [];
  const service = createProviderModelService({
    settingsState,
    settingsStore: {
      setActiveProvider(providerId) { calls.push(['active', providerId]); return { ok: true }; },
      setSelectedProviderModel(providerId, model) { calls.push(['model', providerId, model]); return { ok: true }; }
    }
  });

  assert.equal(service.setActiveProvider('ollama').ok, true);
  assert.equal(service.setSelectedModel('ollama', 'qwen2.5:7b').ok, true);
  assert.deepEqual(calls, [
    ['active', 'ollama'],
    ['model', 'ollama', 'qwen2.5:7b']
  ]);
});

test('failed settings persistence does not leave a changed provider or model active', () => {
  const settingsState = createProviderSettingsState();
  const before = settingsState.getActiveProvider();
  const failure = { ok: false, code: 'settings_read_failed', message: 'Settings are unreadable.' };
  const service = createProviderModelService({ settingsState, settingsStore: {
    setActiveProvider: () => failure,
    setSelectedProviderModel: () => failure
  } });
  assert.deepEqual(service.setActiveProvider('ollama'), failure);
  assert.equal(settingsState.getActiveProvider().id, before.id);
  assert.deepEqual(service.setSelectedModel(before.id, 'new-model'), failure);
  assert.equal(settingsState.getActiveProvider().selectedModel, before.selectedModel);
});
