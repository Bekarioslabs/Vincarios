'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SETTINGS_VERSION = 1;
const DEFAULT_LIMITS = Object.freeze({
  providerTimeoutMs: 120000,
  modelListTimeoutMs: 3000,
  maxSelectedFileChars: 8000,
  maxListedFolders: 100,
  maxListedFiles: 500,
  maxAnalysisFiles: 30,
  maxSuggestionsPerReview: 20
});

function createSettingsStore(options) {
  options = options || {};
  const filePath = options.filePath || '';
  let settings = normalizeAppSettings(loadSettingsFile(filePath, options.initialSettings));

  function getSettings() {
    return settings;
  }

  function updateSettings(mutator) {
    const draft = cloneSettings(settings);
    const next = typeof mutator === 'function' ? mutator(draft) : draft;
    settings = normalizeAppSettings(next || draft);
    saveSettingsFile(filePath, settings);
    return settings;
  }

  function setActiveProvider(providerId) {
    const id = normalizeId(providerId);
    if (!id) return { ok: false, code: 'missing_provider', message: 'Provider id is required.' };
    updateSettings((draft) => {
      draft.providers.activeProviderId = id;
      return draft;
    });
    return { ok: true, settings, providerId: id };
  }

  function setSelectedProviderModel(providerId, model) {
    const id = normalizeId(providerId);
    const selectedModel = normalizeId(model) || 'auto';
    if (!id) return { ok: false, code: 'missing_provider', message: 'Provider id is required.' };
    updateSettings((draft) => {
      draft.providers.selectedModels[id] = selectedModel;
      return draft;
    });
    return { ok: true, settings, providerId: id, model: selectedModel };
  }

  function setProviderUrlOverride(providerId, baseUrl) {
    const id = normalizeId(providerId);
    const validation = validateProviderBaseUrl(baseUrl);
    if (!id) return { ok: false, code: 'missing_provider', message: 'Provider id is required.' };
    if (!validation.ok) return validation;

    updateSettings((draft) => {
      draft.providers.urlOverrides[id] = validation.value;
      return draft;
    });
    return { ok: true, settings, providerId: id, baseUrl: validation.value };
  }

  function resetProviderUrlOverride(providerId) {
    const id = normalizeId(providerId);
    if (!id) return { ok: false, code: 'missing_provider', message: 'Provider id is required.' };
    updateSettings((draft) => {
      delete draft.providers.urlOverrides[id];
      return draft;
    });
    return { ok: true, settings, providerId: id };
  }

  function setLimits(limits) {
    const nextLimits = normalizeLimits(Object.assign({}, settings.limits, limits || {}));
    updateSettings((draft) => {
      draft.limits = nextLimits;
      return draft;
    });
    return { ok: true, settings, limits: settings.limits };
  }

  function setVaultProfileRole(role, folderPath) {
    const normalizedRole = normalizeId(role);
    const normalizedPath = normalizeFolderPath(folderPath);
    if (!normalizedRole) return { ok: false, code: 'missing_role', message: 'Vault role is required.' };
    if (!normalizedPath) return { ok: false, code: 'missing_folder_path', message: 'Folder path is required.' };
    updateSettings((draft) => {
      draft.vaultProfile.roles[normalizedRole] = normalizedPath;
      return draft;
    });
    return { ok: true, settings, role: normalizedRole, folderPath: normalizedPath };
  }

  function resetVaultProfileRole(role) {
    const normalizedRole = normalizeId(role);
    if (!normalizedRole) return { ok: false, code: 'missing_role', message: 'Vault role is required.' };
    updateSettings((draft) => {
      delete draft.vaultProfile.roles[normalizedRole];
      return draft;
    });
    return { ok: true, settings, role: normalizedRole };
  }

  return Object.freeze({
    getSettings,
    updateSettings,
    setActiveProvider,
    setSelectedProviderModel,
    setProviderUrlOverride,
    resetProviderUrlOverride,
    setLimits,
    setVaultProfileRole,
    resetVaultProfileRole
  });
}

function normalizeAppSettings(value) {
  value = value || {};
  const providers = value.providers || {};
  return Object.freeze({
    version: SETTINGS_VERSION,
    providers: Object.freeze({
      activeProviderId: normalizeId(providers.activeProviderId) || 'lm-studio',
      selectedModels: Object.freeze(normalizeStringMap(providers.selectedModels)),
      urlOverrides: Object.freeze(normalizeUrlOverrideMap(providers.urlOverrides))
    }),
    limits: Object.freeze(normalizeLimits(value.limits || {})),
    vaultProfile: Object.freeze({
      roles: Object.freeze(normalizeFolderMap(value.vaultProfile && value.vaultProfile.roles))
    }),
    theme: Object.freeze({
      mode: normalizeChoice(value.theme && value.theme.mode, ['dark', 'light', 'system'], 'dark'),
      accent: normalizeId(value.theme && value.theme.accent) || 'zeus-amber'
    }),
    safety: Object.freeze({
      reviewRequired: value.safety && value.safety.reviewRequired === false ? false : true,
      trustedMode: value.safety && value.safety.trustedMode === true
    })
  });
}

function normalizeLimits(value) {
  const input = value || {};
  const selectedFileFallback = input.maxContextChars || DEFAULT_LIMITS.maxSelectedFileChars;
  return {
    providerTimeoutMs: normalizePositiveNumber(input.providerTimeoutMs, DEFAULT_LIMITS.providerTimeoutMs),
    modelListTimeoutMs: normalizePositiveNumber(input.modelListTimeoutMs, DEFAULT_LIMITS.modelListTimeoutMs),
    maxSelectedFileChars: normalizePositiveNumber(input.maxSelectedFileChars, selectedFileFallback),
    maxListedFolders: normalizePositiveNumber(input.maxListedFolders, DEFAULT_LIMITS.maxListedFolders),
    maxListedFiles: normalizePositiveNumber(input.maxListedFiles, DEFAULT_LIMITS.maxListedFiles),
    maxAnalysisFiles: normalizePositiveNumber(input.maxAnalysisFiles, DEFAULT_LIMITS.maxAnalysisFiles),
    maxSuggestionsPerReview: normalizePositiveNumber(input.maxSuggestionsPerReview, DEFAULT_LIMITS.maxSuggestionsPerReview)
  };
}

function toProviderRegistryOptions(settings) {
  const normalized = normalizeAppSettings(settings);
  return {
    activeProviderId: normalized.providers.activeProviderId,
    selectedModels: Object.assign({}, normalized.providers.selectedModels),
    urlOverrides: Object.assign({}, normalized.providers.urlOverrides)
  };
}

function validateProviderBaseUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return { ok: false, code: 'empty_url', message: 'Provider URL is required.' };
  let url;
  try {
    url = new URL(raw);
  } catch (error) {
    return { ok: false, code: 'invalid_url', message: 'Provider URL must be a valid URL.' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, code: 'invalid_protocol', message: 'Provider URL must use http or https.' };
  }
  url.pathname = url.pathname.replace(/\/+$/g, '');
  url.search = '';
  url.hash = '';
  return { ok: true, value: url.toString().replace(/\/+$/g, '') };
}

function loadSettingsFile(filePath, fallback) {
  if (!filePath) return fallback || {};
  try {
    if (!fs.existsSync(filePath)) return fallback || {};
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return fallback || {};
  }
}

function saveSettingsFile(filePath, settings) {
  if (!filePath) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
}

function cloneSettings(settings) {
  return JSON.parse(JSON.stringify(settings || {}));
}

function normalizeId(value) {
  return String(value || '').trim();
}

function normalizeStringMap(value) {
  const result = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
  Object.keys(value).forEach((key) => {
    const id = normalizeId(key);
    const item = normalizeId(value[key]);
    if (id && item) result[id] = item;
  });
  return result;
}

function normalizeUrlOverrideMap(value) {
  const result = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
  Object.keys(value).forEach((key) => {
    const id = normalizeId(key);
    const validation = validateProviderBaseUrl(value[key]);
    if (id && validation.ok) result[id] = validation.value;
  });
  return result;
}

function normalizeFolderMap(value) {
  const result = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
  Object.keys(value).forEach((key) => {
    const id = normalizeId(key);
    const folderPath = normalizeFolderPath(value[key]);
    if (id && folderPath) result[id] = folderPath;
  });
  return result;
}

function normalizeFolderPath(value) {
  return String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/+$/g, '')
    .replace(/\/+/g, '/');
}

function normalizePositiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function normalizeChoice(value, choices, fallback) {
  const item = normalizeId(value);
  return choices.includes(item) ? item : fallback;
}

module.exports = {
  SETTINGS_VERSION,
  DEFAULT_LIMITS,
  createSettingsStore,
  normalizeAppSettings,
  normalizeLimits,
  toProviderRegistryOptions,
  validateProviderBaseUrl
};
