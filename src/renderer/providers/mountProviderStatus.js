(function() {
  'use strict';

  async function mountProviderStatus(options) {
    options = options || {};
    const api = options.api;
    const app = options.app;
    if (!app) return;

    const nodes = {
      statusPill: app.querySelector('#provider-status'),
      statusDot: app.querySelector('#provider-dot'),
      statusLabel: app.querySelector('#provider-status-label'),
      providerName: app.querySelector('#provider-name'),
      refreshButton: app.querySelector('#provider-refresh'),
      providerSelect: app.querySelector('#provider-select'),
      modelSelect: app.querySelector('#provider-model-select')
    };

    if (!api || !api.provider || typeof api.provider.status !== 'function') {
      setProviderStatus(nodes, null, []);
      setProviderModels(nodes, null);
      return;
    }

    async function refresh(providerId) {
      try {
        const status = await api.provider.status();
        const activeProvider = providerId
          ? findProvider(status && status.providers, providerId) || status.activeProvider
          : status && status.activeProvider;
        setProviderStatus(nodes, activeProvider, status && status.providers);
        await refreshModels(activeProvider && activeProvider.id);
      } catch (error) {
        setProviderStatus(nodes, null, []);
        setProviderModels(nodes, null);
      }
    }

    async function refreshModels(providerId) {
      if (!api.provider || typeof api.provider.models !== 'function') {
        setProviderModels(nodes, null);
        return;
      }
      try {
        const result = await api.provider.models({ providerId });
        setProviderModels(nodes, result);
      } catch (error) {
        setProviderModels(nodes, null);
      }
    }

    renderProviderRefreshIcon(nodes.refreshButton);

    if (nodes.refreshButton) {
      nodes.refreshButton.addEventListener('click', async () => {
        nodes.refreshButton.disabled = true;
        await refresh(nodes.providerSelect ? nodes.providerSelect.value : undefined);
        nodes.refreshButton.disabled = false;
      });
    }

    if (nodes.providerSelect) {
      nodes.providerSelect.addEventListener('change', async () => {
        const providerId = nodes.providerSelect.value;
        if (api.provider && typeof api.provider.setActive === 'function') {
          await api.provider.setActive({ providerId });
        }
        await refresh(providerId);
      });
    }

    if (nodes.modelSelect) {
      nodes.modelSelect.addEventListener('change', async () => {
        const providerId = nodes.providerSelect ? nodes.providerSelect.value : undefined;
        const model = nodes.modelSelect.value;
        if (api.provider && typeof api.provider.setModel === 'function') {
          await api.provider.setModel({ providerId, model });
        }
        await refresh(providerId);
      });
    }

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('zeus:settings-updated', () => {
        refresh(nodes.providerSelect ? nodes.providerSelect.value : undefined);
      });
    }
    await refresh();
  }

  function renderProviderRefreshIcon(button) {
    if (!button) return;
    button.textContent = '';
    const renderer = getIconRenderer();
    if (renderer && typeof renderer.createIconElement === 'function') {
      button.appendChild(renderer.createIconElement('refresh', 'provider-refresh-icon'));
      return;
    }
    button.textContent = 'Refresh';
  }

  function getIconRenderer() {
    return (typeof window !== 'undefined' && window.ZeusIconRenderer) ? window.ZeusIconRenderer : null;
  }
  function setProviderStatus(nodes, activeProvider, providers) {
    const isAvailable = !!(activeProvider && activeProvider.available);
    const label = isAvailable ? 'Provider online' : 'Provider offline';
    const providerLabel = activeProvider && activeProvider.label ? activeProvider.label : 'LM Studio';
    const providerId = activeProvider && activeProvider.id ? activeProvider.id : 'lm-studio';
    const title = activeProvider && activeProvider.message ? activeProvider.message : label;

    if (nodes.statusPill) {
      nodes.statusPill.dataset.providerStatus = isAvailable ? 'online' : 'offline';
      nodes.statusPill.title = title;
    }
    if (nodes.statusDot) nodes.statusDot.classList.toggle('ok', isAvailable);
    setText(nodes.statusLabel, label);
    setText(nodes.providerName, providerLabel);
    setSelectOptions(nodes.providerSelect, normalizeProviderOptions(providers, activeProvider), providerId);
  }

  function setProviderModels(nodes, result) {
    const models = result && Array.isArray(result.models) && result.models.length > 0
      ? result.models
      : [{ id: 'auto', label: 'Auto' }];
    const selectedModel = result && result.selectedModel ? result.selectedModel : 'auto';
    setSelectOptions(nodes.modelSelect, models, selectedModel);
  }

  function normalizeProviderOptions(providers, activeProvider) {
    const items = Array.isArray(providers) && providers.length > 0 ? providers : [activeProvider].filter(Boolean);
    if (items.length === 0) return [{ id: 'lm-studio', label: 'LM Studio' }];
    return items.map((provider) => ({ id: provider.id, label: provider.label || provider.id }));
  }

  function setSelectOptions(select, items, selectedValue) {
    if (!select) return;
    const normalized = items.map((item) => ({
      id: String(item && item.id ? item.id : '').trim(),
      label: String(item && item.label ? item.label : item && item.id ? item.id : '').trim()
    })).filter((item) => item.id);

    if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
      select.optionsData = normalized;
      select.value = selectedValue || (normalized[0] && normalized[0].id) || '';
      return;
    }

    select.innerHTML = '';
    normalized.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.label;
      select.appendChild(option);
    });
    select.value = selectedValue || (normalized[0] && normalized[0].id) || '';
  }

  function findProvider(providers, providerId) {
    return Array.isArray(providers) ? providers.find((provider) => provider && provider.id === providerId) : null;
  }

  function setText(node, value) {
    if (node) node.textContent = value;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { mountProviderStatus, setProviderStatus, setProviderModels, setSelectOptions };
  }

  if (typeof window !== 'undefined') {
    window.ZeusProviderStatus = Object.freeze({ mountProviderStatus });
  }
})();
