'use strict';

function createSettingsService(options) {
  options = options || {};
  const settingsStore = options.settingsStore;
  const providerSettingsState = options.providerSettingsState;

  if (!settingsStore || typeof settingsStore.getSettings !== 'function') {
    throw new Error('Settings store is required.');
  }

  function getSettings() {
    return settingsStore.getSettings();
  }

  function setProviderUrlOverride(providerId, baseUrl) {
    const storeResult = settingsStore.setProviderUrlOverride(providerId, baseUrl);
    if (!storeResult.ok) return storeResult;
    const providerResult = providerSettingsState && typeof providerSettingsState.setProviderUrlOverride === 'function'
      ? providerSettingsState.setProviderUrlOverride(storeResult.providerId, storeResult.baseUrl)
      : null;
    return mergeProviderResult(storeResult, providerResult);
  }

  function resetProviderUrlOverride(providerId) {
    const storeResult = settingsStore.resetProviderUrlOverride(providerId);
    if (!storeResult.ok) return storeResult;
    const providerResult = providerSettingsState && typeof providerSettingsState.resetProviderUrlOverride === 'function'
      ? providerSettingsState.resetProviderUrlOverride(storeResult.providerId)
      : null;
    return mergeProviderResult(storeResult, providerResult);
  }

  function setLayoutPreferences(payload) {
    return settingsStore.setLayoutPreferences(payload || {});
  }

  function setTheme(payload) {
    return settingsStore.setTheme(payload || {});
  }

  function setLimits(payload) {
    return settingsStore.setLimits(payload || {});
  }

  function setEmbeddingSettings(payload) {
    return settingsStore.setEmbeddingSettings(payload || {});
  }

  function setActionDefaults(payload) {
    return settingsStore.setActionDefaults(payload || {});
  }

  function setRecentVaults(payload) {
    return settingsStore.setRecentVaults(payload || {});
  }

  function setVaultProfileRole(role, folderPath) {
    return settingsStore.setVaultProfileRole(role, folderPath);
  }

  function resetVaultProfileRole(role) {
    return settingsStore.resetVaultProfileRole(role);
  }

  return Object.freeze({
    getSettings,
    setProviderUrlOverride,
    resetProviderUrlOverride,
    setLayoutPreferences,
    setTheme,
    setLimits,
    setEmbeddingSettings,
    setActionDefaults,
    setRecentVaults,
    setVaultProfileRole,
    resetVaultProfileRole
  });
}

function mergeProviderResult(storeResult, providerResult) {
  if (providerResult && providerResult.ok === false) return providerResult;
  return Object.assign({}, storeResult, providerResult || {}, {
    settings: storeResult.settings
  });
}

module.exports = {
  createSettingsService
};
