(function() {
  'use strict';

  const LIMIT_FIELDS = Object.freeze([
    { key: 'providerTimeoutMs', label: 'Provider timeout seconds', unit: 'seconds' },
    { key: 'modelListTimeoutMs', label: 'Model list timeout ms' },
    { key: 'maxCreateNoteChars', label: 'Create note chars' },
    { key: 'maxUpdateNoteChars', label: 'Update note chars' },
    { key: 'maxProviderMessageChars', label: 'Provider message chars' },
    { key: 'maxSelectedFileChars', label: 'Selected file chars' },
    { key: 'maxListedFolders', label: 'Listed folders' },
    { key: 'maxListedFiles', label: 'Listed files' },
    { key: 'maxAnalysisFiles', label: 'Analysis files' },
    { key: 'maxSuggestionsPerReview', label: 'Suggestions per review' }
  ]);

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
      '      <h2>ZEUS Settings</h2>',
      '    </div>',
      '    <button type="button" class="settings-icon-button" data-settings-close aria-label="Close settings"></button>',
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
      '    <section class="settings-section">',
      '      <div class="settings-section-head">',
      '        <h3>Limits</h3>',
      '        <p>Control provider timeouts and request-size caps.</p>',
      '      </div>',
      '      <div class="settings-limit-grid" data-settings-limit-grid></div>',
      '      <div class="settings-section-actions">',
      '        <button type="button" class="settings-primary-button" data-settings-save-limits>Save limits</button>',
      '      </div>',
      '    </section>',
      '    <section class="settings-section">',
      '      <div class="settings-section-head">',
      '        <h3>Vault Profile</h3>',
      '        <p>Map app roles to vault folders. Defaults remain active unless overridden.</p>',
      '      </div>',
      '      <div class="settings-vault-role-list" data-settings-vault-role-list></div>',
      '    </section>',
      '  </div>',
      '  <footer class="settings-footer">',
      '    <span class="settings-status" data-settings-status></span>',
      '    <button type="button" class="settings-secondary-button" data-settings-close>Close</button>',
      '  </footer>',
      '</div>'
    ].join('');
    renderSettingsCloseIcon(backdrop.querySelector('.settings-icon-button[data-settings-close]'));

    return {
      backdrop,
      providerList: backdrop.querySelector('[data-settings-provider-list]'),
      limitsGrid: backdrop.querySelector('[data-settings-limit-grid]'),
      vaultRoleList: backdrop.querySelector('[data-settings-vault-role-list]'),
      saveLimitsButton: backdrop.querySelector('[data-settings-save-limits]'),
      status: backdrop.querySelector('[data-settings-status]'),
      closeButtons: Array.from(backdrop.querySelectorAll('[data-settings-close]'))
    };
  }


  function renderSettingsCloseIcon(button) {
    if (!button) return;
    const renderer = getIconRenderer();
    button.textContent = '';
    if (renderer && typeof renderer.createIconElement === 'function') {
      button.appendChild(renderer.createIconElement('close', 'settings-close-icon'));
    }
  }

  function getIconRenderer() {
    return (typeof window !== 'undefined' && window.ZeusIconRenderer) ? window.ZeusIconRenderer : null;
  }
  async function openPanel(panel, api, statusBar) {
    panel.backdrop.hidden = false;
    setText(panel.status, 'Loading...');
    setText(statusBar, 'Settings opened.');
    await renderSettings(panel, api, statusBar);
  }

  function closePanel(panel) {
    panel.backdrop.hidden = true;
  }

  async function renderSettings(panel, api, statusBar) {
    if (!api || !api.settings || typeof api.settings.get !== 'function') {
      panel.providerList.innerHTML = '<div class="settings-empty">Settings API unavailable.</div>';
      setText(panel.status, 'Unavailable');
      return;
    }

    const settings = await safeCall(() => api.settings.get());
    const providerStatus = api.provider && typeof api.provider.status === 'function'
      ? await safeCall(() => api.provider.status())
      : null;

    renderProviderSettings(panel, api, statusBar, settings, providerStatus);
    renderLimitSettings(panel, api, statusBar, settings);
    renderVaultProfileSettings(panel, api, statusBar, settings);
    setText(panel.status, 'Ready');
  }

  function renderProviderSettings(panel, api, statusBar, settings, providerStatus) {
    const providers = normalizeProviders(providerStatus, settings);
    if (providers.length === 0) {
      panel.providerList.innerHTML = '<div class="settings-empty">No providers configured.</div>';
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
        await renderSettings(panel, api, statusBar);
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
        await renderSettings(panel, api, statusBar);
      });
    });
  }

  function renderLimitSettings(panel, api, statusBar, settings) {
    const limits = settings && settings.limits ? settings.limits : {};
    panel.limitsGrid.innerHTML = '';
    LIMIT_FIELDS.forEach((field) => {
      const label = document.createElement('label');
      label.className = 'settings-limit-field';
      label.innerHTML = '<span></span><input type="number" min="1" step="1" data-settings-limit>';
      label.querySelector('span').textContent = field.label;
      const input = label.querySelector('input');
      input.setAttribute('data-limit-key', field.key);
      input.value = String(formatLimitValue(field, limits[field.key]));
      panel.limitsGrid.appendChild(label);
    });

    if (panel.saveLimitsButton && !panel.saveLimitsButton.dataset.bound) {
      panel.saveLimitsButton.dataset.bound = 'true';
      panel.saveLimitsButton.addEventListener('click', async () => {
        const payload = {};
        panel.limitsGrid.querySelectorAll('[data-settings-limit]').forEach((input) => {
          const key = input.getAttribute('data-limit-key');
          const field = LIMIT_FIELDS.find((item) => item.key === key);
          payload[key] = parseLimitInput(field, input.value);
        });
        setText(panel.status, 'Saving limits...');
        const result = await api.settings.setLimits(payload);
        if (!result || result.ok === false) {
          setText(panel.status, result && result.message ? result.message : 'Could not save limits.');
          return;
        }
        setText(panel.status, 'Limits saved.');
        setText(statusBar, 'Limits saved.');
        await renderSettings(panel, api, statusBar);
      });
    }
  }

  function formatLimitValue(field, value) {
    if (field && field.unit === 'seconds') return Math.round(Number(value || 0) / 1000);
    return value || '';
  }

  function parseLimitInput(field, value) {
    const number = Number(value);
    if (field && field.unit === 'seconds') return Number.isFinite(number) ? Math.floor(number * 1000) : number;
    return number;
  }

  function renderVaultProfileSettings(panel, api, statusBar, settings) {
    const roles = getDefaultVaultRoles();
    const overrides = settings && settings.vaultProfile && settings.vaultProfile.roles ? settings.vaultProfile.roles : {};
    panel.vaultRoleList.innerHTML = '';
    roles.forEach((role) => {
      const row = document.createElement('div');
      row.className = 'settings-vault-role-row';
      const value = overrides[role.id] || role.path;
      row.innerHTML = [
        '<div class="settings-vault-role-meta">',
        '  <strong></strong>',
        '  <span></span>',
        '</div>',
        '<input class="settings-vault-role-path" data-settings-vault-role-path spellcheck="false">',
        '<div class="settings-provider-actions">',
        '  <button type="button" class="settings-secondary-button" data-settings-reset-vault-role>Reset</button>',
        '  <button type="button" class="settings-primary-button" data-settings-save-vault-role>Save</button>',
        '</div>'
      ].join('');
      row.querySelector('strong').textContent = role.label;
      row.querySelector('span').textContent = overrides[role.id] ? 'Custom role path' : 'Default role path';
      row.querySelector('[data-settings-vault-role-path]').value = value;
      row.querySelector('[data-settings-save-vault-role]').setAttribute('data-role-id', role.id);
      row.querySelector('[data-settings-reset-vault-role]').setAttribute('data-role-id', role.id);
      panel.vaultRoleList.appendChild(row);
    });

    panel.vaultRoleList.querySelectorAll('[data-settings-save-vault-role]').forEach((button) => {
      button.addEventListener('click', async () => {
        const row = button.closest('.settings-vault-role-row');
        const input = row && row.querySelector('[data-settings-vault-role-path]');
        const role = button.getAttribute('data-role-id');
        setText(panel.status, 'Saving vault role...');
        const result = await api.settings.setVaultRole({ role, folderPath: input ? input.value : '' });
        if (!result || result.ok === false) {
          setText(panel.status, result && result.message ? result.message : 'Could not save vault role.');
          return;
        }
        setText(panel.status, 'Vault role saved.');
        setText(statusBar, 'Vault role saved.');
        await renderSettings(panel, api, statusBar);
      });
    });

    panel.vaultRoleList.querySelectorAll('[data-settings-reset-vault-role]').forEach((button) => {
      button.addEventListener('click', async () => {
        const role = button.getAttribute('data-role-id');
        setText(panel.status, 'Resetting vault role...');
        const result = await api.settings.resetVaultRole({ role });
        if (!result || result.ok === false) {
          setText(panel.status, result && result.message ? result.message : 'Could not reset vault role.');
          return;
        }
        setText(panel.status, 'Vault role reset.');
        setText(statusBar, 'Vault role reset.');
        await renderSettings(panel, api, statusBar);
      });
    });
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
      '  <div class="settings-capability-badges"></div>',
      '</div>',
      '<input class="settings-provider-url" data-settings-provider-url type="url" spellcheck="false">',
      '<div class="settings-provider-actions">',
      '  <button type="button" class="settings-secondary-button" data-settings-reset-url>Reset</button>',
      '  <button type="button" class="settings-primary-button" data-settings-save-url>Save</button>',
      '</div>'
    ].join('');
    row.querySelector('strong').textContent = provider.label || provider.id;
    row.querySelector('span').textContent = override ? 'Custom URL override' : 'Default URL';
    row.querySelector('.settings-capability-badges').textContent = formatCapabilities(provider.capabilities);
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
        baseUrl: String(provider && provider.baseUrl ? provider.baseUrl : '').trim(),
        capabilities: provider && provider.capabilities ? provider.capabilities : null
      })).filter((provider) => provider.id);
    }
    const overrides = settings && settings.providers && settings.providers.urlOverrides ? settings.providers.urlOverrides : {};
    return Object.keys(overrides).map((id) => ({ id, label: id, baseUrl: overrides[id], capabilities: null }));
  }

  function formatCapabilities(capabilities) {
    const input = capabilities || {};
    const labels = [];
    if (input.chat !== false) labels.push('Chat');
    if (input.vision === true) labels.push('Vision');
    if (input.embeddings === true) labels.push('Embeddings');
    return labels.length > 0 ? labels.join(' · ') : 'No declared capabilities';
  }

  function getDefaultVaultRoles() {
    const defaults = window.ZeusVaultProfile && window.ZeusVaultProfile.DEFAULT_FOLDERS
      ? window.ZeusVaultProfile.DEFAULT_FOLDERS
      : { inbox: '00_Inbox', daily: '01_Daily', projects: '02_Projects', knowledge: '03_Knowledge', brain: '90_AI_Brain', archive: '99_Archive' };
    return Object.keys(defaults).map((id) => ({
      id,
      label: id,
      path: defaults[id]
    }));
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
    module.exports = { mountSettingsPanel, normalizeProviders, formatCapabilities, formatLimitValue, parseLimitInput };
  }

  if (typeof window !== 'undefined') {
    window.ZeusSettingsPanel = Object.freeze({ mountSettingsPanel });
  }
})();
