'use strict';

const { createProviderSettingsState } = require('./providerRegistry');
const { buildModelsUrl, normalizeModelList } = require('./providerProtocol');

function createProviderModelService(options) {
  options = options || {};
  const settingsState = options.settingsState || createProviderSettingsState(options);
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 3000;

  async function listModels(payload) {
    const provider = resolveProvider(settingsState, payload && payload.providerId);
    if (!provider) return { ok: false, code: 'unknown_provider', message: 'Unknown provider.', models: [] };
    if (typeof fetchImpl !== 'function') return createErrorResult(provider, 'Provider model request unavailable.');

    try {
      const response = await fetchWithTimeout(fetchImpl, buildModelsUrl(provider), {
        method: 'GET',
        headers: { accept: 'application/json' }
      }, timeoutMs);
      if (!response || response.ok !== true) {
        const statusCode = response && response.status ? 'HTTP ' + response.status : 'no response';
        return createErrorResult(provider, 'Provider returned ' + statusCode + '.');
      }
      const data = await response.json();
      const models = normalizeModelList(provider, data);
      return {
        ok: true,
        activeProvider: publicProvider(provider),
        providers: settingsState.getProviders().map(publicProvider),
        selectedModel: provider.selectedModel,
        models
      };
    } catch (error) {
      return createErrorResult(provider, 'Provider unavailable.');
    }
  }

  function setActiveProvider(providerId) {
    return settingsState.setActiveProvider(providerId);
  }

  function setSelectedModel(providerId, model) {
    return settingsState.setSelectedModel(providerId, model);
  }

  return Object.freeze({ listModels, setActiveProvider, setSelectedModel });
}

function resolveProvider(settingsState, providerId) {
  if (!settingsState || typeof settingsState.getProviders !== 'function') return null;
  const id = String(providerId || '').trim();
  if (!id) return settingsState.getActiveProvider();
  return settingsState.getProviders().find((provider) => provider.id === id) || null;
}

function createErrorResult(provider, message) {
  return {
    ok: false,
    activeProvider: publicProvider(provider),
    providers: [],
    selectedModel: provider && provider.selectedModel ? provider.selectedModel : 'auto',
    models: [{ id: 'auto', label: 'Auto' }],
    message
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
  if (typeof AbortController === 'undefined') return fetchImpl(url, options);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, Object.assign({}, options, { signal: controller.signal }));
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  createProviderModelService,
};