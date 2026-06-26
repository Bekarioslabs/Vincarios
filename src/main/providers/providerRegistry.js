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
  let settings = normalizeProviderSettings(baseOptions);

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
    settings = normalizeProviderSettings(toMutableSettings({ activeProviderId: id }));
    return { ok: true, activeProvider: getActiveProvider(), providers: getProviders() };
  }

  function setSelectedModel(providerId, model) {
    const id = String(providerId || '').trim();
    const provider = settings.providers.find((item) => item.id === id);
    if (!provider) return { ok: false, code: 'unknown_provider', message: 'Unknown provider.' };
    const selectedModels = {};
    settings.providers.forEach((item) => { selectedModels[item.id] = item.selectedModel; });
    selectedModels[id] = normalizeModelName(model || provider.defaultModel);
    settings = normalizeProviderSettings(toMutableSettings({ selectedModels }));
    return { ok: true, activeProvider: getActiveProvider(), providers: getProviders() };
  }

  function toMutableSettings(patch) {
    const urlOverrides = {};
    const selectedModels = {};
    settings.providers.forEach((provider) => {
      urlOverrides[provider.id] = provider.baseUrl;
      selectedModels[provider.id] = provider.selectedModel;
    });
    return Object.assign({}, baseOptions, {
      activeProviderId: settings.activeProviderId,
      urlOverrides,
      selectedModels
    }, patch || {});
  }

  return Object.freeze({
    getSettings,
    getProviders,
    getActiveProvider,
    setActiveProvider,
    setSelectedModel
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