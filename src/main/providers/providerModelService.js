'use strict';

const { createProviderSettingsState } = require('./providerRegistry');
const { buildModelsUrl, normalizeModelList } = require('./providerProtocol');

function createProviderModelService(options) {
  options = options || {};
  const settingsState = options.settingsState || createProviderSettingsState(options);
  const settingsStore = options.settingsStore || null;
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
    privacy: provider.privacy,
        models
      };
    } catch (error) {
      return createErrorResult(provider, 'Provider unavailable.');
    }
  }

  function setActiveProvider(providerId) {
    const previousProviderId = settingsState.getActiveProvider().id;
    const result = settingsState.setActiveProvider(providerId);
    if (result.ok && settingsStore && typeof settingsStore.setActiveProvider === 'function') {
      const saved = settingsStore.setActiveProvider(result.activeProvider.id);
      if (saved && saved.ok === false) {
        settingsState.setActiveProvider(previousProviderId);
        return saved;
      }
    }
    return result;
  }

  function setSelectedModel(providerId, model) {
    const previous = settingsState.getProviders().find((provider) => provider.id === String(providerId || '').trim());
    const result = settingsState.setSelectedModel(providerId, model);
    if (result.ok && settingsStore && typeof settingsStore.setSelectedProviderModel === 'function') {
      const provider = result.providers.find((item) => item.id === String(providerId || '').trim());
      const saved = settingsStore.setSelectedProviderModel(providerId, provider ? provider.selectedModel : model);
      if (saved && saved.ok === false) {
        if (previous) settingsState.setSelectedModel(providerId, previous.selectedModel);
        return saved;
      }
    }
    return result;
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
