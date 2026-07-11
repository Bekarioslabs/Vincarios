'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_PROVIDER_ID,
  createProviderSettingsState,
  normalizeProviderSettings
} = require('../src/main/providers/providerRegistry');

test('provider registry ships LM Studio as the default local chat provider', () => {
  const settings = normalizeProviderSettings();

  assert.equal(DEFAULT_PROVIDER_ID, 'lm-studio');
  assert.equal(settings.activeProviderId, 'lm-studio');
  assert.equal(settings.providers.length, 2);
  assert.equal(settings.providers[0].id, 'lm-studio');
  assert.equal(settings.providers[0].label, 'LM Studio');
  assert.equal(settings.providers[0].baseUrl, 'http://127.0.0.1:1234');
  assert.equal(settings.providers[0].modelsPath, '/v1/models');
  assert.equal(settings.providers[0].chatPath, '/v1/chat/completions');
  assert.equal(settings.providers[0].selectedModel, 'auto');
  assert.equal(settings.providers[0].privacy, 'local');
  assert.equal(settings.providers[1].id, 'ollama');
  assert.equal(settings.providers[1].label, 'Ollama');
  assert.equal(settings.providers[1].kind, 'ollama-native');
  assert.equal(settings.providers[1].baseUrl, 'http://127.0.0.1:11434');
  assert.equal(settings.providers[1].modelsPath, '/api/tags');
  assert.equal(settings.providers[1].chatPath, '/api/chat');
  assert.equal(settings.providers[1].selectedModel, 'auto');
  assert.equal(settings.providers[1].privacy, 'local');
});

test('provider registry supports URL overrides without changing provider definitions', () => {
  const settings = normalizeProviderSettings({
    urlOverrides: { 'lm-studio': 'http://localhost:4321/' }
  });

  assert.equal(settings.providers[0].baseUrl, 'http://localhost:4321');
});

test('provider settings state can change active provider and selected model', () => {
  const state = createProviderSettingsState();

  const modelResult = state.setSelectedModel('lm-studio', 'google/gemma-4-12b-qat');

  assert.equal(modelResult.ok, true);
  assert.equal(state.getActiveProvider().selectedModel, 'google/gemma-4-12b-qat');
  assert.equal(state.setActiveProvider('missing').ok, false);
});
test('provider registry falls back to the first configured provider when LM Studio is absent', () => {
  const settings = normalizeProviderSettings({
    providers: [
      { id: 'custom-local', label: 'Custom Local', baseUrl: 'http://localhost:9999', model: 'custom-model' }
    ]
  });

  assert.equal(settings.activeProviderId, 'custom-local');
  assert.equal(settings.providers[0].selectedModel, 'custom-model');
});
test('provider settings state preserves custom providers across state updates', () => {
  const state = createProviderSettingsState({
    providers: [
      { id: 'ollama', label: 'Ollama', baseUrl: 'http://127.0.0.1:11434', model: 'llama3.2' }
    ]
  });

  assert.equal(state.getActiveProvider().id, 'ollama');

  const result = state.setSelectedModel('ollama', 'qwen2.5');

  assert.equal(result.ok, true);
  assert.equal(state.getProviders().length, 1);
  assert.equal(state.getActiveProvider().id, 'ollama');
  assert.equal(state.getActiveProvider().selectedModel, 'qwen2.5');
  assert.equal(state.setActiveProvider('ollama').ok, true);
});

test('provider registry uses custom models path as health path when no health path is set', () => {
  const settings = normalizeProviderSettings({
    providers: [
      { id: 'custom-native', label: 'Custom Native', baseUrl: 'http://localhost:7777', modelsPath: '/api/tags' }
    ]
  });

  assert.equal(settings.providers[0].modelsPath, '/api/tags');
  assert.equal(settings.providers[0].healthPath, '/api/tags');
});

test('provider settings state can update and reset provider URL overrides', () => {
  const state = createProviderSettingsState();

  const update = state.setProviderUrlOverride('ollama', 'http://localhost:11435/');

  assert.equal(update.ok, true);
  assert.equal(state.getProviders().find((provider) => provider.id === 'ollama').baseUrl, 'http://localhost:11435');

  const reset = state.resetProviderUrlOverride('ollama');

  assert.equal(reset.ok, true);
  assert.equal(state.getProviders().find((provider) => provider.id === 'ollama').baseUrl, 'http://127.0.0.1:11434');
});

test('provider registry exposes provider capability flags for UI display', () => {
  const settings = normalizeProviderSettings();

  assert.deepEqual(settings.providers[0].capabilities, {
    chat: true,
    vision: false,
    embeddings: false
  });
  assert.equal(settings.providers[1].capabilities.chat, true);
});

test('provider registry preserves explicit cloud privacy for future provider UI', () => {
  const settings = normalizeProviderSettings({
    providers: [
      { id: 'cloud-api', label: 'Cloud API', baseUrl: 'https://api.example.test', privacy: 'cloud' }
    ]
  });

  assert.equal(settings.providers[0].privacy, 'cloud');
});
