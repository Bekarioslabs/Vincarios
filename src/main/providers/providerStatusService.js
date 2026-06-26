'use strict';

const { createProviderSettingsState } = require('./providerRegistry');

function createProviderStatusService(options) {
  options = options || {};
  const settingsState = options.settingsState || createProviderSettingsState(options);
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 1200;

  async function getStatus() {
    const providers = settingsState.getProviders();
    const checkedProviders = await Promise.all(
      providers.map((provider) => checkProvider(provider, fetchImpl, timeoutMs))
    );
    const active = settingsState.getActiveProvider();
    const activeProvider = checkedProviders.find((provider) => provider.id === active.id) || checkedProviders[0];

    return {
      activeProvider,
      providers: checkedProviders
    };
  }

  return Object.freeze({ getStatus });
}

async function checkProvider(provider, fetchImpl, timeoutMs) {
  const healthUrl = buildHealthUrl(provider.baseUrl, provider.healthPath || provider.modelsPath);
  const baseStatus = {
    id: provider.id,
    label: provider.label,
    baseUrl: provider.baseUrl,
    selectedModel: provider.selectedModel,
    healthUrl
  };

  if (typeof fetchImpl !== 'function') {
    return Object.freeze({
      ...baseStatus,
      available: false,
      message: 'Provider check unavailable'
    });
  }

  try {
    const response = await fetchWithTimeout(fetchImpl, healthUrl, timeoutMs);
    if (!response || response.ok !== true) {
      const statusCode = response && response.status ? 'HTTP ' + response.status : 'no response';
      return Object.freeze({
        ...baseStatus,
        available: false,
        message: 'Provider returned ' + statusCode
      });
    }

    return Object.freeze({
      ...baseStatus,
      available: true,
      message: 'Provider online'
    });
  } catch (error) {
    return Object.freeze({
      ...baseStatus,
      available: false,
      message: 'Provider unavailable'
    });
  }
}

function buildHealthUrl(baseUrl, healthPath) {
  const path = healthPath.startsWith('/') ? healthPath : '/' + healthPath;
  return baseUrl.replace(/\/+$/g, '') + path;
}

async function fetchWithTimeout(fetchImpl, url, timeoutMs) {
  if (typeof AbortController === 'undefined') {
    return fetchImpl(url);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  createProviderStatusService,
  buildHealthUrl
};