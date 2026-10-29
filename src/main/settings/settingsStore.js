'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { normalizeActionDefaults } = require('../../shared/settings/actionDefaults');
const { normalizeAppTheme } = require('../../shared/settings/theme');

const SETTINGS_VERSION = 1;
const MAX_RECOVERY_ATTEMPTS = 100;
const SETTINGS_FAILURE_MESSAGES = Object.freeze({
  settings_read_failed: 'App settings could not be read. Check file permissions and restart Vincarios before saving settings.',
  settings_recovery_failed: 'App settings are invalid and could not be backed up. Preserve the original file, check file permissions and disk space, then restart Vincarios before saving settings.',
  settings_write_failed: 'App settings could not be saved. Check file permissions and available disk space, then try again.'
});
const DEFAULT_SIMILAR_NOTES = Object.freeze({
  minimumScorePercent: 65,
  maxResults: 8,
  mode: 'mixed',
  contentWeight: 80,
  metadataWeight: 20
});

const DEFAULT_EMBEDDINGS = Object.freeze({
  defaultModelId: 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
  artifactRepoId: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
  license: 'apache-2.0',
  dimensions: 384,
  runtime: 'transformers-js-onnx',
  indexLocation: 'vault-vincarios',
  similarNotes: DEFAULT_SIMILAR_NOTES
});
const DEFAULT_LIMITS = Object.freeze({
  providerTimeoutMs: 120000,
  modelListTimeoutMs: 3000,
  maxCreateNoteChars: 200000,
  maxUpdateNoteChars: 300000,
  maxProviderMessageChars: 120000,
  maxSelectedFileChars: 8000,
  maxListedFolders: 100,
  maxListedFiles: 500,
  maxAnalysisFiles: 30,
  maxSuggestionsPerReview: 20
});

function createSettingsStore(options) {
  options = options || {};
  const filePath = options.filePath || '';
  const fileSystem = options.fs || fs;
  const loaded = loadSettingsFile(filePath, options.initialSettings, fileSystem, options.now || (() => new Date()));
  let settings = normalizeAppSettings(loaded.settings);
  let loadWarning = loaded.warning || null;

  function getSettings() {
    return settings;
  }

  function updateSettings(mutator) {
    const draft = cloneSettings(settings);
    const next = typeof mutator === 'function' ? mutator(draft) : draft;
    const normalized = normalizeAppSettings(next || draft);
    saveSettingsFile(filePath, normalized, fileSystem);
    settings = normalized;
    return settings;
  }

  function takeLoadWarning() {
    const warning = loadWarning;
    loadWarning = null;
    return warning;
  }

  function protectWrite(operation) {
    return (...args) => {
      if (loaded.blocked) return Object.assign({}, loaded.blocked);
      try {
        return operation(...args);
      } catch (_error) {
        return settingsFailure('settings_write_failed');
      }
    };
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

  function setEmbeddingSettings(embeddings) {
    const previous = settings.embeddings;
    const nextEmbeddings = normalizeEmbeddings(Object.assign({}, previous, embeddings || {}));
    const changedModel = previous.activeModelSource !== nextEmbeddings.activeModelSource || previous.customModelPath !== nextEmbeddings.customModelPath;
    updateSettings((draft) => {
      draft.embeddings = Object.assign({}, nextEmbeddings, { reindexRequired: changedModel || nextEmbeddings.reindexRequired === true });
      return draft;
    });
    return { ok: true, settings, embeddings: settings.embeddings };
  }

  function setActionDefaults(actionDefaults) {
    const nextDefaults = normalizeActionDefaults(Object.assign({}, settings.actionDefaults, actionDefaults || {}));
    updateSettings((draft) => {
      draft.actionDefaults = nextDefaults;
      return draft;
    });
    return { ok: true, settings, actionDefaults: settings.actionDefaults };
  }

  function setRecentVaults(startup) {
    const nextStartup = normalizeStartupSettings(Object.assign({}, settings.startup, startup || {}));
    updateSettings((draft) => {
      draft.startup = nextStartup;
      return draft;
    });
    return { ok: true, settings, startup: settings.startup };
  }

  function setLayoutPreferences(layout) {
    const input = layout || {};
    const nextLayout = normalizeLayoutSettings({
      panels: Object.assign({}, settings.layout.panels, input.panels || {})
    });
    updateSettings((draft) => {
      draft.layout = nextLayout;
      return draft;
    });
    return { ok: true, settings, layout: settings.layout };
  }

  function setTheme(theme) {
    updateSettings((draft) => {
      draft.theme = Object.assign({}, draft.theme, { mode: normalizeAppTheme(theme && theme.mode) });
      return draft;
    });
    return { ok: true, settings, theme: settings.theme };
  }

  return Object.freeze({
    getSettings,
    takeLoadWarning,
    updateSettings: protectWrite(updateSettings),
    setActiveProvider: protectWrite(setActiveProvider),
    setSelectedProviderModel: protectWrite(setSelectedProviderModel),
    setProviderUrlOverride: protectWrite(setProviderUrlOverride),
    resetProviderUrlOverride: protectWrite(resetProviderUrlOverride),
    setLimits: protectWrite(setLimits),
    setEmbeddingSettings: protectWrite(setEmbeddingSettings),
    setActionDefaults: protectWrite(setActionDefaults),
    setRecentVaults: protectWrite(setRecentVaults),
    setLayoutPreferences: protectWrite(setLayoutPreferences),
    setTheme: protectWrite(setTheme)
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
    embeddings: Object.freeze(normalizeEmbeddings(value.embeddings || {})),
    actionDefaults: normalizeActionDefaults(value.actionDefaults || {}),
    startup: Object.freeze(normalizeStartupSettings(value.startup || {})),
    theme: Object.freeze({
      mode: normalizeAppTheme(value.theme && value.theme.mode),
      accent: normalizeId(value.theme && value.theme.accent) || 'vincarios-amber'
    }),
    layout: Object.freeze(normalizeLayoutSettings(value.layout || {})),
    safety: Object.freeze({
      reviewRequired: value.safety && value.safety.reviewRequired === false ? false : true,
      trustedMode: value.safety && value.safety.trustedMode === true
    })
  });
}

function normalizeStartupSettings(value) {
  const input = value || {};
  const seen = new Set();
  const recentVaults = Array.isArray(input.recentVaults) ? input.recentVaults : [];
  return {
    recentVaults: recentVaults.map((entry) => ({
      path: normalizeRecentVaultPath(entry && entry.path),
      name: normalizeId(entry && entry.name),
      lastOpenedAt: normalizeId(entry && entry.lastOpenedAt)
    })).filter((entry) => {
      if (!entry.path || seen.has(entry.path)) return false;
      seen.add(entry.path);
      return true;
    }).slice(0, 2)
  };
}

function normalizeRecentVaultPath(value) {
  return String(value || '').trim().replace(/\\/g, '/').replace(/\/+$/g, '');
}
function normalizeLayoutSettings(value) {
  const panels = value && value.panels ? value.panels : {};
  return {
    panels: Object.freeze({
      leftNavCollapsed: panels.leftNavCollapsed === true,
      filesCollapsed: panels.filesCollapsed === true,
      selectionActionsCollapsed: panels.selectionActionsCollapsed === true,
      contextBasketCollapsed: panels.contextBasketCollapsed === true
    })
  };
}
function normalizeLimits(value) {
  const input = value || {};
  const selectedFileFallback = input.maxContextChars || DEFAULT_LIMITS.maxSelectedFileChars;
  return {
    providerTimeoutMs: normalizePositiveNumber(input.providerTimeoutMs, DEFAULT_LIMITS.providerTimeoutMs),
    modelListTimeoutMs: normalizePositiveNumber(input.modelListTimeoutMs, DEFAULT_LIMITS.modelListTimeoutMs),
    maxCreateNoteChars: normalizePositiveNumber(input.maxCreateNoteChars, DEFAULT_LIMITS.maxCreateNoteChars),
    maxUpdateNoteChars: normalizePositiveNumber(input.maxUpdateNoteChars, DEFAULT_LIMITS.maxUpdateNoteChars),
    maxProviderMessageChars: normalizePositiveNumber(input.maxProviderMessageChars, DEFAULT_LIMITS.maxProviderMessageChars),
    maxSelectedFileChars: normalizePositiveNumber(input.maxSelectedFileChars, selectedFileFallback),
    maxListedFolders: normalizePositiveNumber(input.maxListedFolders, DEFAULT_LIMITS.maxListedFolders),
    maxListedFiles: normalizePositiveNumber(input.maxListedFiles, DEFAULT_LIMITS.maxListedFiles),
    maxAnalysisFiles: normalizePositiveNumber(input.maxAnalysisFiles, DEFAULT_LIMITS.maxAnalysisFiles),
    maxSuggestionsPerReview: normalizePositiveNumber(input.maxSuggestionsPerReview, DEFAULT_LIMITS.maxSuggestionsPerReview)
  };
}

function normalizeEmbeddings(value) {
  const input = value || {};
  const activeModelSource = normalizeChoice(input.activeModelSource, ['bundled', 'custom-local'], 'bundled');
  const customModelPath = normalizeLocalPath(input.customModelPath);
  return {
    activeModelSource,
    bundledModelId: DEFAULT_EMBEDDINGS.defaultModelId,
    artifactRepoId: DEFAULT_EMBEDDINGS.artifactRepoId,
    customModelPath: activeModelSource === 'custom-local' ? customModelPath : '',
    dimensions: DEFAULT_EMBEDDINGS.dimensions,
    runtime: DEFAULT_EMBEDDINGS.runtime,
    license: DEFAULT_EMBEDDINGS.license,
    indexLocation: DEFAULT_EMBEDDINGS.indexLocation,
    similarNotes: Object.freeze(normalizeSimilarNotes(input.similarNotes || {})),
    reindexRequired: input.reindexRequired === true
  };
}

function normalizeSimilarNotes(value) {
  const input = value || {};
  const contentWeight = normalizePercent(input.contentWeight, DEFAULT_SIMILAR_NOTES.contentWeight);
  const metadataWeight = normalizePercent(input.metadataWeight, DEFAULT_SIMILAR_NOTES.metadataWeight);
  return {
    minimumScorePercent: normalizePercent(input.minimumScorePercent, DEFAULT_SIMILAR_NOTES.minimumScorePercent),
    maxResults: normalizePositiveNumber(input.maxResults, DEFAULT_SIMILAR_NOTES.maxResults),
    mode: normalizeChoice(input.mode, ['content', 'metadata', 'mixed'], DEFAULT_SIMILAR_NOTES.mode),
    contentWeight,
    metadataWeight
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

function loadSettingsFile(filePath, fallback, fileSystem, now) {
  if (!filePath) return { settings: fallback || {} };
  let original;
  try {
    original = fileSystem.readFileSync(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') return { settings: fallback || {} };
    const blocked = settingsFailure('settings_read_failed');
    return { settings: fallback || {}, blocked, warning: blocked };
  }
  try {
    const settings = JSON.parse(original.toString('utf8'));
    if (settings && typeof settings === 'object' && !Array.isArray(settings)) return { settings };
  } catch (_error) {
    // Parse errors are recoverable only after the exact source bytes are retained.
  }
  const backupPath = preserveInvalidSettings(filePath, original, fileSystem, now);
  if (!backupPath) {
    const blocked = settingsFailure('settings_recovery_failed');
    return { settings: fallback || {}, blocked, warning: blocked };
  }
  return { settings: fallback || {}, warning: {
    code: 'settings_recovered',
    message: 'App settings are invalid. The original was preserved as ' + path.basename(backupPath) + '. This session uses defaults; reconfigure Settings if needed. The original settings file is replaced only when settings are saved.'
  } };
}

function preserveInvalidSettings(filePath, original, fileSystem, now) {
  const stamp = now().toISOString().replace(/[.:]/g, '-');
  for (let attempt = 0; attempt < MAX_RECOVERY_ATTEMPTS; attempt += 1) {
    const backupPath = filePath + '.corrupt-' + stamp + (attempt ? '-' + attempt : '');
    let descriptor = null;
    let created = false;
    try {
      descriptor = fileSystem.openSync(backupPath, 'wx');
      created = true;
      fileSystem.writeFileSync(descriptor, original);
      fileSystem.closeSync(descriptor);
      descriptor = null;
      return backupPath;
    } catch (error) {
      if (descriptor !== null) {
        try { fileSystem.closeSync(descriptor); } catch (_closeError) {}
      }
      if (created) {
        try { fileSystem.unlinkSync(backupPath); } catch (_cleanupError) {}
      }
      if (!created && error.code === 'EEXIST') continue;
      return '';
    }
  }
  return '';
}

function settingsFailure(code) {
  return { ok: false, code, message: SETTINGS_FAILURE_MESSAGES[code] };
}

function saveSettingsFile(filePath, settings, fileSystem) {
  if (!filePath) return;
  fileSystem.mkdirSync(path.dirname(filePath), { recursive: true });
  fileSystem.writeFileSync(filePath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
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

function normalizeLocalPath(value) {
  return String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/');
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

function normalizePercent(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100, Math.floor(number)));
}

function normalizeChoice(value, choices, fallback) {
  const item = normalizeId(value);
  return choices.includes(item) ? item : fallback;
}

module.exports = {
  SETTINGS_VERSION,
  DEFAULT_LIMITS,
  DEFAULT_EMBEDDINGS,
  DEFAULT_SIMILAR_NOTES,
  createSettingsStore,
  normalizeAppSettings,
  normalizeLimits,
  normalizeEmbeddings,
  normalizeSimilarNotes,
  normalizeActionDefaults,
  toProviderRegistryOptions,
  validateProviderBaseUrl
};
