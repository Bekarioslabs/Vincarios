'use strict';

const { DEFAULT_PROVIDERS } = require('./providerStatusService');

function createProviderChatService(options) {
  options = options || {};
  const providers = normalizeProviders(options.providers || DEFAULT_PROVIDERS);
  const activeProviderId = options.activeProviderId || providers[0].id;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 60000;
  const temperature = Number.isFinite(options.temperature) ? options.temperature : 0.3;

  async function sendChat(payload) {
    const provider = providers.find((item) => item.id === activeProviderId) || providers[0];
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
        body: JSON.stringify({
          model,
          messages,
          temperature,
          stream: false
        })
      }, timeoutMs);

      if (!response || response.ok !== true) {
        const statusCode = response && response.status ? 'HTTP ' + response.status : 'no response';
        return createErrorResult(provider, 'Provider returned ' + statusCode + '.');
      }

      const data = await response.json();
      const content = extractAssistantContent(data);
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

function normalizeProviders(providers) {
  const normalized = providers
    .filter(Boolean)
    .map((provider) => ({
      id: String(provider.id || '').trim(),
      label: String(provider.label || provider.id || '').trim(),
      baseUrl: String(provider.baseUrl || '').trim().replace(/\/+$/g, ''),
      chatPath: String(provider.chatPath || '/v1/chat/completions').trim() || '/v1/chat/completions',
      model: String(provider.model || 'auto').trim() || 'auto'
    }))
    .filter((provider) => provider.id && provider.label && provider.baseUrl);

  if (normalized.length === 0) {
    throw new Error('At least one provider configuration is required.');
  }

  return normalized;
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
  if (provider.model !== 'auto') return provider.model;

  const response = await fetchWithTimeout(fetchImpl, buildModelsUrl(provider), {
    method: 'GET',
    headers: { accept: 'application/json' }
  }, timeoutMs);

  if (!response || response.ok !== true) return '';
  const data = await response.json();
  const firstModel = data && Array.isArray(data.data) ? data.data[0] : null;
  return firstModel && firstModel.id ? String(firstModel.id).trim() : '';
}

function buildModelsUrl(provider) {
  return provider.baseUrl.replace(/\/+$/g, '') + '/v1/models';
}
function buildChatUrl(provider) {
  const path = provider.chatPath.startsWith('/') ? provider.chatPath : '/' + provider.chatPath;
  return provider.baseUrl.replace(/\/+$/g, '') + path;
}

function extractAssistantContent(data) {
  const choice = data && Array.isArray(data.choices) ? data.choices[0] : null;
  const content = choice && choice.message ? choice.message.content : '';
  return typeof content === 'string' ? content.trim() : '';
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
    baseUrl: provider.baseUrl
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