'use strict';

const DEFAULT_PROVIDERS = Object.freeze([
  Object.freeze({
    id: 'lm-studio',
    label: 'LM Studio',
    baseUrl: 'http://127.0.0.1:1234',
    healthPath: '/v1/models'
  })
]);

function createProviderStatusService(options) {
  options = options || {};
  const providers = normalizeProviders(options.providers || DEFAULT_PROVIDERS);
  const activeProviderId = options.activeProviderId || providers[0].id;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 1200;

  async function getStatus() {
    const checkedProviders = await Promise.all(
      providers.map((provider) => checkProvider(provider, fetchImpl, timeoutMs))
    );
    const activeProvider = checkedProviders.find((provider) => provider.id === activeProviderId) || checkedProviders[0];

    return {
      activeProvider,
      providers: checkedProviders
    };
  }

  return Object.freeze({ getStatus });
}

function normalizeProviders(providers) {
  const normalized = providers
    .filter(Boolean)
    .map((provider) => ({
      id: String(provider.id || '').trim(),
      label: String(provider.label || provider.id || '').trim(),
      baseUrl: String(provider.baseUrl || '').trim().replace(/\/+$/g, ''),
      healthPath: String(provider.healthPath || '/').trim() || '/'
    }))
    .filter((provider) => provider.id && provider.label && provider.baseUrl);

  if (normalized.length === 0) {
    throw new Error('At least one provider configuration is required.');
  }

  return normalized;
}

async function checkProvider(provider, fetchImpl, timeoutMs) {
  const healthUrl = buildHealthUrl(provider.baseUrl, provider.healthPath);
  const baseStatus = {
    id: provider.id,
    label: provider.label,
    baseUrl: provider.baseUrl,
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
  DEFAULT_PROVIDERS,
  createProviderStatusService,
  buildHealthUrl
};