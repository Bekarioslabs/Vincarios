'use strict';

const MESSAGE_OVERHEAD = 32;
const MIN_RESPONSE_TOKENS = 1024;
const RESPONSE_FACTOR = 1.25;
const MIN_HEADROOM_TOKENS = 512;
const HEADROOM_FRACTION = 0.10;

function budgetMetadataPath(provider) {
  if (!provider || provider.privacy !== 'local') return null;
  if (provider.id === 'lm-studio') return '/api/v1/models';
  if (provider.kind === 'ollama-native') return '/api/ps';
  return null;
}

function unknownUpdateBudget() {
  return {
    ok: false, code: 'update_budget_unknown',
    error: 'Loaded context size is unknown. Load the selected model in LM Studio or Ollama, then retry. Use the Source editor if its server cannot report the loaded context.',
    budget: { state: 'unknown', estimated: true }
  };
}

function assessUpdateBudget(provider, model, messages, metadata) {
  const loaded = resolveLoadedModel(provider, model, metadata);
  if (!loaded || !Number.isSafeInteger(loaded.contextTokens) || loaded.contextTokens <= 0) return unknownUpdateBudget();
  // UTF-8 bytes deliberately overestimate ordinary text; this is not tokenization.
  const estimatedInputTokens = messages.reduce((total, message) => total + Buffer.byteLength(message.content, 'utf8') + MESSAGE_OVERHEAD, 0);
  const responseReserveTokens = Math.max(MIN_RESPONSE_TOKENS, Math.ceil(estimatedInputTokens * RESPONSE_FACTOR));
  const safetyReserveTokens = Math.max(MIN_HEADROOM_TOKENS, Math.ceil(loaded.contextTokens * HEADROOM_FRACTION));
  const fits = estimatedInputTokens + responseReserveTokens + safetyReserveTokens <= loaded.contextTokens;
  const budget = {
    state: fits ? 'fits' : 'too_large', estimated: true, contextTokens: loaded.contextTokens,
    estimatedInputTokens, responseReserveTokens, safetyReserveTokens
  };
  return fits ? { ok: true, model: loaded.model, budget } : {
    ok: false, code: 'update_budget_exceeded', budget,
    error: 'This whole-note update exceeds the conservative loaded-context budget. Shorten the instruction, configure a larger context in your provider, or edit the note in the Source editor.'
  };
}

function resolveLoadedModel(provider, model, metadata) {
  const models = metadata && Array.isArray(metadata.models) ? metadata.models : [];
  if (provider.kind === 'ollama-native') {
    const matches = models.filter((entry) => entry && (entry.name === model || entry.model === model));
    return matches.length === 1 ? { model, contextTokens: matches[0].context_length } : null;
  }
  if (provider.id !== 'lm-studio') return null;
  const instances = models.filter((entry) => entry && entry.type === 'llm').flatMap((entry) =>
    (Array.isArray(entry.loaded_instances) ? entry.loaded_instances : []).map((instance) => ({ entry, instance }))
  ).filter(({ instance }) => instance && typeof instance.id === 'string' && instance.id.length > 0);
  const exact = instances.filter(({ instance }) => instance.id === model);
  const matches = exact.length ? exact : instances.filter(({ entry }) => entry.key === model);
  if (matches.length !== 1) return null;
  const instance = matches[0].instance;
  return { model: instance.id, contextTokens: instance.config && instance.config.context_length };
}

module.exports = { budgetMetadataPath, assessUpdateBudget, unknownUpdateBudget };
