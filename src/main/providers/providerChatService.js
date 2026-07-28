'use strict';

const { createProviderSettingsState } = require('./providerRegistry');
const {
  normalizePayloadLimits,
  validateProviderMessagesPayload
} = require('../../shared/security/payloadLimits');
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
  const settingsStore = options.settingsStore || null;
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 120000;
  const temperature = Number.isFinite(options.temperature) ? options.temperature : 0.3;

  async function sendChat(payload, requestOptions) {
    requestOptions = requestOptions || {};
    const provider = settingsState.getActiveProvider();
    const signal = requestOptions.signal;
    const messages = normalizeMessages(payload && payload.messages);

    if (requiresExternalContextApproval(provider, payload)) {
      return createErrorResult(provider, 'External provider approval is required before sending vault context.', 'external_context_approval_required');
    }

    if (signal && signal.aborted) {
      return createCanceledResult(provider);
    }

    if (messages.length === 0) {
      return createErrorResult(provider, 'Message is required.');
    }

    const payloadValidation = validateProviderMessagesPayload(messages, getPayloadLimits(settingsStore, options.payloadLimits));
    if (!payloadValidation.ok) {
      return createErrorResult(provider, payloadValidation.message);
    }
    if (typeof fetchImpl !== 'function') {
      return createErrorResult(provider, 'Provider request unavailable.');
    }

    try {
      const requestTimeoutMs = getProviderTimeoutMs(settingsStore, timeoutMs);
      const model = await resolveChatModel(provider, fetchImpl, requestTimeoutMs, signal);
      if (!model) {
        return createErrorResult(provider, 'No provider model available.');
      }

      const response = await fetchWithTimeout(fetchImpl, buildChatUrl(provider), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(buildChatRequestBody(provider, model, messages, temperature))
      }, requestTimeoutMs, signal);

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
      if (isTimeoutError(error)) return createErrorResult(provider, 'Provider timed out.');
      if (isAbortError(error) || (signal && signal.aborted)) return createCanceledResult(provider);
      return createErrorResult(provider, 'Provider unavailable.');
    }
  }

  return Object.freeze({ sendChat });
}

function getPayloadLimits(settingsStore, fallback) {
  const settings = settingsStore && typeof settingsStore.getSettings === 'function' ? settingsStore.getSettings() : null;
  return normalizePayloadLimits(settings && settings.limits ? settings.limits : fallback);
}

function getProviderTimeoutMs(settingsStore, fallback) {
  if (!settingsStore || typeof settingsStore.getSettings !== 'function') return fallback;
  const settings = settingsStore.getSettings();
  const value = settings && settings.limits ? Number(settings.limits.providerTimeoutMs) : NaN;
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
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

async function resolveChatModel(provider, fetchImpl, timeoutMs, signal) {
  if (signal && signal.aborted) throw createAbortError();
  if (provider.selectedModel && provider.selectedModel !== 'auto') return provider.selectedModel;

  const response = await fetchWithTimeout(fetchImpl, buildModelsUrl(provider), {
    method: 'GET',
    headers: { accept: 'application/json' }
  }, timeoutMs, signal);

  if (!response || response.ok !== true) return '';
  const data = await response.json();
  return firstModelId(provider, data);
}

function createCanceledResult(provider) {
  return {
    ok: false,
    provider: publicProvider(provider),
    canceled: true,
    error: 'Request canceled.'
  };
}

function createErrorResult(provider, error, code) {
  const result = {
    ok: false,
    provider: publicProvider(provider),
    error
  };
  if (code) result.code = code;
  return result;
}

function publicProvider(provider) {
  return {
    id: provider.id,
    label: provider.label,
    baseUrl: provider.baseUrl,
    selectedModel: provider.selectedModel,
    privacy: provider.privacy
  };
}

function requiresExternalContextApproval(provider, payload) {
  const privacy = payload && payload.privacy ? payload.privacy : {};
  if (!provider || provider.privacy !== 'external' || privacy.containsVaultContext !== true) return false;
  if (privacy.externalContextApproved !== true) return true;
  return normalizeApprovalEndpoint(privacy.approvedEndpoint) !== normalizeApprovalEndpoint(provider.baseUrl);
}

function normalizeApprovalEndpoint(value) {
  try {
    const url = new URL(String(value || '').trim());
    url.hash = '';
    url.search = '';
    return url.toString().replace(/\/+$/g, '');
  } catch (_error) {
    return '';
  }
}

async function fetchWithTimeout(fetchImpl, url, options, timeoutMs, externalSignal) {
  if (externalSignal && externalSignal.aborted) throw createAbortError();
  if (typeof AbortController === 'undefined') {
    return fetchImpl(url, externalSignal ? { ...options, signal: externalSignal } : options);
  }

  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const abortFromExternal = () => controller.abort();
  if (externalSignal) externalSignal.addEventListener('abort', abortFromExternal, { once: true });

  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (timedOut) throw createTimeoutError();
    throw error;
  } finally {
    clearTimeout(timeout);
    if (externalSignal) externalSignal.removeEventListener('abort', abortFromExternal);
  }
}

function createAbortError() {
  const error = new Error('Request canceled.');
  error.name = 'AbortError';
  return error;
}

function createTimeoutError() {
  const error = new Error('Provider timed out.');
  error.name = 'TimeoutError';
  return error;
}

function isAbortError(error) {
  return error && (error.name === 'AbortError' || /abort|cancel/i.test(String(error.message || '')));
}

function isTimeoutError(error) {
  return error && error.name === 'TimeoutError';
}

module.exports = {
  createProviderChatService,
  normalizeMessages,
  getProviderTimeoutMs,
  requiresExternalContextApproval,
  buildChatUrl
};
