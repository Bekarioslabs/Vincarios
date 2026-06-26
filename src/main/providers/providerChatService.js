'use strict';

const { createProviderSettingsState } = require('./providerRegistry');
const {
  buildChatRequestBody,
  buildChatUrl,
  buildModelsUrl,
  extractAssistantContent,
  firstModelId
} = require('./providerProtocol');

function createProviderChatService(options) {
  options = options || {};
  const settingsState = options.settingsState || createProviderSettingsState(options);
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 60000;
  const temperature = Number.isFinite(options.temperature) ? options.temperature : 0.3;

  async function sendChat(payload) {
    const provider = settingsState.getActiveProvider();
    const messages = normalizeMessages(payload && payload.messages);

    if (messages.length === 0) {
      return createErrorResult(provider, 'Message is required.');
    }
    if (typeof fetchImpl !== 'function') {
      return createErrorResult(provider, 'Provider request unavailable.');
    }

    try {
      const model = await resolveChatModel(provider, fetchImpl, timeoutMs);
      if (!model) {
        return createErrorResult(provider, 'No provider model available.');
      }

      const response = await fetchWithTimeout(fetchImpl, buildChatUrl(provider), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(buildChatRequestBody(provider, model, messages, temperature))
      }, timeoutMs);

      if (!response || response.ok !== true) {
        const statusCode = response && response.status ? 'HTTP ' + response.status : 'no response';
        return createErrorResult(provider, 'Provider returned ' + statusCode + '.');
      }

      const data = await response.json();
      const content = extractAssistantContent(provider, data);
      if (!content) {
        return createErrorResult(provider, 'Provider returned no assistant message.');
      }

      return {
        ok: true,
        provider: publicProvider(provider),
        message: {
          role: 'assistant',
          content
        }
      };
    } catch (error) {
      return createErrorResult(provider, 'Provider unavailable.');
    }
  }

  return Object.freeze({ sendChat });
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  const allowedRoles = new Set(['system', 'user', 'assistant']);
  return messages
    .map((message) => ({
      role: allowedRoles.has(message && message.role) ? message.role : 'user',
      content: String(message && message.content ? message.content : '').trim()
    }))
    .filter((message) => message.content.length > 0);
}

async function resolveChatModel(provider, fetchImpl, timeoutMs) {
  if (provider.selectedModel && provider.selectedModel !== 'auto') return provider.selectedModel;

  const response = await fetchWithTimeout(fetchImpl, buildModelsUrl(provider), {
    method: 'GET',
    headers: { accept: 'application/json' }
  }, timeoutMs);

  if (!response || response.ok !== true) return '';
  const data = await response.json();
  return firstModelId(provider, data);
}

function createErrorResult(provider, error) {
  return {
    ok: false,
    provider: publicProvider(provider),
    error
  };
}

function publicProvider(provider) {
  return {
    id: provider.id,
    label: provider.label,
    baseUrl: provider.baseUrl,
    selectedModel: provider.selectedModel
  };
}

async function fetchWithTimeout(fetchImpl, url, options, timeoutMs) {
  if (typeof AbortController === 'undefined') {
    return fetchImpl(url, options);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  createProviderChatService,
  normalizeMessages,
  buildChatUrl
};