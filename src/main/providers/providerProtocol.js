'use strict';

function buildModelsUrl(provider) {
  return buildProviderUrl(provider, provider.modelsPath);
}

function buildChatUrl(provider) {
  return buildProviderUrl(provider, provider.chatPath);
}

function buildProviderUrl(provider, endpointPath) {
  const path = String(endpointPath || '').startsWith('/') ? endpointPath : '/' + endpointPath;
  return String(provider.baseUrl || '').replace(/\/+$/g, '') + path;
}

function normalizeModelList(provider, data) {
  const ids = new Set(['auto']);
  if (isOllamaProvider(provider)) {
    if (data && Array.isArray(data.models)) {
      data.models.forEach((model) => {
        const id = String(model && (model.name || model.model) ? (model.name || model.model) : '').trim();
        if (id) ids.add(id);
      });
    }
  } else if (data && Array.isArray(data.data)) {
    data.data.forEach((model) => {
      const id = String(model && model.id ? model.id : '').trim();
      if (id) ids.add(id);
    });
  }
  return Array.from(ids).map((id) => Object.freeze({ id, label: id === 'auto' ? 'Auto' : id }));
}

function firstModelId(provider, data) {
  const models = normalizeModelList(provider, data).filter((model) => model.id !== 'auto');
  return models.length > 0 ? models[0].id : '';
}

function buildChatRequestBody(provider, model, messages, temperature, updateBudget) {
  if (isOllamaProvider(provider)) {
    return {
      model,
      messages,
      stream: false,
      options: updateBudget
        ? { temperature, num_ctx: updateBudget.contextTokens, num_predict: updateBudget.responseReserveTokens }
        : { temperature }
    };
  }
  return {
    model,
    messages,
    temperature,
    stream: false,
    ...(updateBudget ? { max_tokens: updateBudget.responseReserveTokens } : {})
  };
}

function extractAssistantContent(provider, data) {
  if (isOllamaProvider(provider)) {
    const content = data && data.message ? data.message.content : '';
    return typeof content === 'string' ? content.trim() : '';
  }
  const choice = data && Array.isArray(data.choices) ? data.choices[0] : null;
  const content = choice && choice.message ? choice.message.content : '';
  return typeof content === 'string' ? content.trim() : '';
}

function isOllamaProvider(provider) {
  return provider && provider.kind === 'ollama-native';
}

module.exports = {
  buildModelsUrl,
  buildChatUrl,
  normalizeModelList,
  firstModelId,
  buildChatRequestBody,
  extractAssistantContent,
  isOllamaProvider
};
