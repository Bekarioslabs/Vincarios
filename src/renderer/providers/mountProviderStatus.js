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
      providerName: app.querySelector('#provider-name')
    };

    if (!api || !api.provider || typeof api.provider.status !== 'function') {
      setProviderStatus(nodes, null);
      return;
    }

    try {
      const status = await api.provider.status();
      setProviderStatus(nodes, status && status.activeProvider);
    } catch (error) {
      setProviderStatus(nodes, null);
    }
  }

  function setProviderStatus(nodes, provider) {
    const isAvailable = !!(provider && provider.available);
    const label = isAvailable ? 'Provider online' : 'Provider offline';
    const providerLabel = provider && provider.label ? provider.label : 'LM Studio';
    const title = provider && provider.message ? provider.message : label;

    if (nodes.statusPill) {
      nodes.statusPill.dataset.providerStatus = isAvailable ? 'online' : 'offline';
      nodes.statusPill.title = title;
    }
    if (nodes.statusDot) nodes.statusDot.classList.toggle('ok', isAvailable);
    setText(nodes.statusLabel, label);
    setText(nodes.providerName, providerLabel);
  }

  function setText(node, value) {
    if (node) node.textContent = value;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { mountProviderStatus, setProviderStatus };
  }

  if (typeof window !== 'undefined') {
    window.ZeusProviderStatus = Object.freeze({ mountProviderStatus });
  }
})();