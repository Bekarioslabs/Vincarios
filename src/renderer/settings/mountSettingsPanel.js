(function() {
  'use strict';

  function mountSettingsPanel(options) {
    options = options || {};
    const api = options.api;
    const app = options.app;
    const status = options.status;
    if (!app) return null;

    const panel = createPanel();
    app.appendChild(panel.backdrop);
    const openButtons = app.querySelectorAll('[data-open-settings]');
    openButtons.forEach((button) => button.addEventListener('click', () => openPanel(panel, api, status)));
    panel.closeButtons.forEach((button) => button.addEventListener('click', () => closePanel(panel)));
    panel.backdrop.addEventListener('click', (event) => {
      if (event.target === panel.backdrop) closePanel(panel);
    });

    return Object.freeze({
      open() { return openPanel(panel, api, status); },
      close() { closePanel(panel); }
    });
  }

  function createPanel() {
    const backdrop = document.createElement('section');
    backdrop.className = 'settings-backdrop';
    backdrop.hidden = true;
    backdrop.innerHTML = [
      '<div class="settings-panel" role="dialog" aria-modal="true" aria-label="Settings">',
      '  <header class="settings-header">',
      '    <div>',
      '      <div class="settings-kicker">Settings</div>',
      '      <h2>Provider Settings</h2>',
      '    </div>',
      '    <button type="button" class="settings-icon-button" data-settings-close aria-label="Close settings">×</button>',
      '  </header>',
      '  <div class="settings-body">',
      '    <section class="settings-section">',
      '      <div class="settings-section-head">',
      '        <h3>Local Providers</h3>',
      '        <p>Override local provider URLs without changing provider code.</p>',
      '      </div>',
      '      <div class="settings-provider-list" data-settings-provider-list>',
      '        <div class="settings-empty">Loading provider settings...</div>',
      '      </div>',
      '    </section>',
      '  </div>',
      '  <footer class="settings-footer">',
      '    <span class="settings-status" data-settings-status></span>',
      '    <button type="button" class="settings-secondary-button" data-settings-close>Close</button>',
      '  </footer>',
      '</div>'
    ].join('');

    return {
      backdrop,
      providerList: backdrop.querySelector('[data-settings-provider-list]'),
      status: backdrop.querySelector('[data-settings-status]'),
      closeButtons: Array.from(backdrop.querySelectorAll('[data-settings-close]'))
    };
  }

  async function openPanel(panel, api, statusBar) {
    panel.backdrop.hidden = false;
    setText(panel.status, 'Loading...');
    setText(statusBar, 'Settings opened.');
    await renderProviderSettings(panel, api, statusBar);
  }

  function closePanel(panel) {
    panel.backdrop.hidden = true;
  }

  async function renderProviderSettings(panel, api, statusBar) {
    if (!api || !api.settings || typeof api.settings.get !== 'function') {
      panel.providerList.innerHTML = '<div class="settings-empty">Settings API unavailable.</div>';
      setText(panel.status, 'Unavailable');
      return;
    }

    const settings = await safeCall(() => api.settings.get());
    const providerStatus = api.provider && typeof api.provider.status === 'function'
      ? await safeCall(() => api.provider.status())
      : null;
    const providers = normalizeProviders(providerStatus, settings);

    if (providers.length === 0) {
      panel.providerList.innerHTML = '<div class="settings-empty">No providers configured.</div>';
      setText(panel.status, 'No providers');
      return;
    }

    panel.providerList.innerHTML = '';
    providers.forEach((provider) => {
      const row = createProviderRow(provider, settings);
      panel.providerList.appendChild(row);
    });

    panel.providerList.querySelectorAll('[data-settings-save-url]').forEach((button) => {
      button.addEventListener('click', async () => {
        const row = button.closest('.settings-provider-row');
        const input = row && row.querySelector('[data-settings-provider-url]');
        const providerId = button.getAttribute('data-provider-id');
        setText(panel.status, 'Saving...');
        const result = await api.settings.setProviderUrl({ providerId, baseUrl: input ? input.value : '' });
        if (!result || result.ok === false) {
          setText(panel.status, result && result.message ? result.message : 'Could not save provider URL.');
          return;
        }
        notifySettingsUpdated();
        setText(panel.status, 'Saved.');
        setText(statusBar, 'Provider URL saved.');
        await renderProviderSettings(panel, api, statusBar);
      });
    });

    panel.providerList.querySelectorAll('[data-settings-reset-url]').forEach((button) => {
      button.addEventListener('click', async () => {
        const providerId = button.getAttribute('data-provider-id');
        setText(panel.status, 'Resetting...');
        const result = await api.settings.resetProviderUrl({ providerId });
        if (!result || result.ok === false) {
          setText(panel.status, result && result.message ? result.message : 'Could not reset provider URL.');
          return;
        }
        notifySettingsUpdated();
        setText(panel.status, 'Reset.');
        setText(statusBar, 'Provider URL reset.');
        await renderProviderSettings(panel, api, statusBar);
      });
    });

    setText(panel.status, 'Ready');
  }

  function createProviderRow(provider, settings) {
    const row = document.createElement('div');
    row.className = 'settings-provider-row';
    const override = settings && settings.providers && settings.providers.urlOverrides
      ? settings.providers.urlOverrides[provider.id]
      : '';
    row.innerHTML = [
      '<div class="settings-provider-meta">',
      '  <strong></strong>',
      '  <span></span>',
      '</div>',
      '<input class="settings-provider-url" data-settings-provider-url type="url" spellcheck="false">',
      '<div class="settings-provider-actions">',
      '  <button type="button" class="settings-secondary-button" data-settings-reset-url>Reset</button>',
      '  <button type="button" class="settings-primary-button" data-settings-save-url>Save</button>',
      '</div>'
    ].join('');
    row.querySelector('strong').textContent = provider.label || provider.id;
    row.querySelector('span').textContent = override ? 'Custom URL override' : 'Default URL';
    row.querySelector('[data-settings-provider-url]').value = provider.baseUrl || override || '';
    row.querySelector('[data-settings-reset-url]').setAttribute('data-provider-id', provider.id);
    row.querySelector('[data-settings-save-url]').setAttribute('data-provider-id', provider.id);
    return row;
  }

  function normalizeProviders(providerStatus, settings) {
    if (providerStatus && Array.isArray(providerStatus.providers) && providerStatus.providers.length > 0) {
      return providerStatus.providers.map((provider) => ({
        id: String(provider && provider.id ? provider.id : '').trim(),
        label: String(provider && provider.label ? provider.label : provider && provider.id ? provider.id : '').trim(),
        baseUrl: String(provider && provider.baseUrl ? provider.baseUrl : '').trim()
      })).filter((provider) => provider.id);
    }
    const overrides = settings && settings.providers && settings.providers.urlOverrides ? settings.providers.urlOverrides : {};
    return Object.keys(overrides).map((id) => ({ id, label: id, baseUrl: overrides[id] }));
  }

  function notifySettingsUpdated() {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('zeus:settings-updated'));
    }
  }

  async function safeCall(callback) {
    try {
      return await callback();
    } catch (error) {
      return null;
    }
  }

  function setText(node, value) {
    if (node) node.textContent = value || '';
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { mountSettingsPanel, normalizeProviders };
  }

  if (typeof window !== 'undefined') {
    window.ZeusSettingsPanel = Object.freeze({ mountSettingsPanel });
  }
})();
