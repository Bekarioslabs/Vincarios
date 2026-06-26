'use strict';

const DEFAULT_PROVIDER_ID = 'lm-studio';

const PROVIDER_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'lm-studio',
    label: 'LM Studio',
    kind: 'openai-compatible',
    defaultBaseUrl: 'http://127.0.0.1:1234',
    modelsPath: '/v1/models',
    chatPath: '/v1/chat/completions',
    defaultModel: 'auto'
  }),
  Object.freeze({
    id: 'ollama',
    label: 'Ollama',
    kind: 'ollama-native',
    defaultBaseUrl: 'http://127.0.0.1:11434',
    modelsPath: '/api/tags',
    chatPath: '/api/chat',
    defaultModel: 'auto'
  })
]);

function normalizeProviderSettings(options) {
  options = options || {};
  const urlOverrides = options.urlOverrides || {};
  const selectedModels = options.selectedModels || {};
  const definitions = Array.isArray(options.providers) && options.providers.length > 0
    ? options.providers.map(normalizeProviderDefinition)
    : PROVIDER_DEFINITIONS;
  const providers = definitions.map((definition) => {
    const baseUrl = normalizeBaseUrl(urlOverrides[definition.id] || definition.defaultBaseUrl || definition.baseUrl);
    return Object.freeze({
      id: definition.id,
      label: definition.label,
      kind: definition.kind,
      baseUrl,
      modelsPath: definition.modelsPath,
      healthPath: definition.healthPath || definition.modelsPath,
      chatPath: definition.chatPath,
      defaultModel: definition.defaultModel,
      selectedModel: normalizeModelName(selectedModels[definition.id] || definition.model || definition.defaultModel)
    });
  });
  const activeProviderId = providers.some((provider) => provider.id === options.activeProviderId)
    ? options.activeProviderId
    : providers.some((provider) => provider.id === DEFAULT_PROVIDER_ID)
      ? DEFAULT_PROVIDER_ID
      : providers[0].id;

  return Object.freeze({
    activeProviderId,
    providers: Object.freeze(providers)
  });
}

function createProviderSettingsState(options) {
  const baseOptions = Object.assign({}, options || {});
  const mutableOptions = {
    providers: baseOptions.providers,
    activeProviderId: baseOptions.activeProviderId,
    urlOverrides: Object.assign({}, baseOptions.urlOverrides || {}),
    selectedModels: Object.assign({}, baseOptions.selectedModels || {})
  };
  let settings = normalizeProviderSettings(mutableOptions);

  function rebuild(patch) {
    patch = patch || {};
    if (Object.prototype.hasOwnProperty.call(patch, 'activeProviderId')) mutableOptions.activeProviderId = patch.activeProviderId;
    if (patch.urlOverrides) mutableOptions.urlOverrides = Object.assign({}, patch.urlOverrides);
    if (patch.selectedModels) mutableOptions.selectedModels = Object.assign({}, patch.selectedModels);
    settings = normalizeProviderSettings(mutableOptions);
  }

  function getSettings() {
    return settings;
  }

  function getProviders() {
    return settings.providers;
  }

  function getActiveProvider() {
    return settings.providers.find((provider) => provider.id === settings.activeProviderId) || settings.providers[0];
  }

  function setActiveProvider(providerId) {
    const id = String(providerId || '').trim();
    if (!settings.providers.some((provider) => provider.id === id)) {
      return { ok: false, code: 'unknown_provider', message: 'Unknown provider.' };
    }
    rebuild({ activeProviderId: id });
    return { ok: true, activeProvider: getActiveProvider(), providers: getProviders() };
  }

  function setSelectedModel(providerId, model) {
    const id = String(providerId || '').trim();
    const provider = settings.providers.find((item) => item.id === id);
    if (!provider) return { ok: false, code: 'unknown_provider', message: 'Unknown provider.' };
    const selectedModels = Object.assign({}, mutableOptions.selectedModels);
    selectedModels[id] = normalizeModelName(model || provider.defaultModel);
    rebuild({ selectedModels });
    return { ok: true, activeProvider: getActiveProvider(), providers: getProviders() };
  }

  function setProviderUrlOverride(providerId, baseUrl) {
    const id = String(providerId || '').trim();
    if (!settings.providers.some((provider) => provider.id === id)) {
      return { ok: false, code: 'unknown_provider', message: 'Unknown provider.' };
    }
    const normalized = normalizeBaseUrl(baseUrl);
    if (!normalized) return { ok: false, code: 'invalid_url', message: 'Provider URL is required.' };
    const urlOverrides = Object.assign({}, mutableOptions.urlOverrides, { [id]: normalized });
    rebuild({ urlOverrides });
    return { ok: true, activeProvider: getActiveProvider(), providers: getProviders() };
  }

  function resetProviderUrlOverride(providerId) {
    const id = String(providerId || '').trim();
    if (!settings.providers.some((provider) => provider.id === id)) {
      return { ok: false, code: 'unknown_provider', message: 'Unknown provider.' };
    }
    const urlOverrides = Object.assign({}, mutableOptions.urlOverrides);
    delete urlOverrides[id];
    rebuild({ urlOverrides });
    return { ok: true, activeProvider: getActiveProvider(), providers: getProviders() };
  }

  function getMutableProviderSettings() {
    return {
      activeProviderId: settings.activeProviderId,
      selectedModels: Object.assign({}, mutableOptions.selectedModels),
      urlOverrides: Object.assign({}, mutableOptions.urlOverrides)
    };
  }

  return Object.freeze({
    getSettings,
    getProviders,
    getActiveProvider,
    setActiveProvider,
    setSelectedModel,
    setProviderUrlOverride,
    resetProviderUrlOverride,
    getMutableProviderSettings
  });
}

function normalizeProviderDefinition(provider) {
  const id = String(provider && provider.id ? provider.id : '').trim();
  const label = String(provider && (provider.label || provider.name || provider.id) ? (provider.label || provider.name || provider.id) : '').trim();
  return Object.freeze({
    id,
    label,
    kind: String(provider && provider.kind ? provider.kind : 'openai-compatible').trim(),
    defaultBaseUrl: normalizeBaseUrl(provider && (provider.defaultBaseUrl || provider.baseUrl)),
    modelsPath: String(provider && (provider.modelsPath || provider.healthPath) ? (provider.modelsPath || provider.healthPath) : '/v1/models').trim() || '/v1/models',
    healthPath: String(provider && (provider.healthPath || provider.modelsPath) ? (provider.healthPath || provider.modelsPath) : '/v1/models').trim() || '/v1/models',
    chatPath: String(provider && provider.chatPath ? provider.chatPath : '/v1/chat/completions').trim() || '/v1/chat/completions',
    defaultModel: normalizeModelName(provider && (provider.defaultModel || provider.model))
  });
}
function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/g, '');
}

function normalizeModelName(value) {
  return String(value || 'auto').trim() || 'auto';
}

module.exports = {
  DEFAULT_PROVIDER_ID,
  PROVIDER_DEFINITIONS,
  createProviderSettingsState,
  normalizeProviderSettings,
  normalizeProviderDefinition,
  normalizeBaseUrl,
  normalizeModelName
};