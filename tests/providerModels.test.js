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