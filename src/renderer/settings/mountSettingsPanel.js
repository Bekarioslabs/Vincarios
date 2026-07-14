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
    const vaultProfileState = options.vaultProfileState || null;
    if (!app) return null;

    const panel = createPanel();
    panel.vaultProfileState = vaultProfileState;
    panel.vaultProfileDraft = createVaultProfileDraftState();
    app.appendChild(panel.backdrop);
    panel.modalBehavior = getModalBehavior().mountModalBehavior({
      overlay: panel.backdrop,
      dialog: panel.dialog,
      initialFocus: () => panel.closeButtons[0]
    });
    const openButtons = app.querySelectorAll('[data-open-settings]');
    openButtons.forEach((button) => button.addEventListener('click', () => openPanel(panel, api, status, vaultProfileState)));
    panel.closeButtons.forEach((button) => button.addEventListener('click', () => closePanel(panel)));

    return Object.freeze({
      open() { return openPanel(panel, api, status, vaultProfileState); },
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
      '      <h2>Vitruvios Settings</h2>',
      '    </div>',
      '    <button type="button" class="settings-icon-button" data-settings-close aria-label="Close settings"></button>',
      '  </header>',
      '  <div class="settings-body">',
      '    <nav class="settings-category-menu" aria-label="Settings categories">',
      '      <button type="button" class="settings-category-button is-active" data-settings-category="providers" aria-controls="settings-panel-providers" aria-selected="true" data-settings-icon="plug">Providers</button>',
      '      <button type="button" class="settings-category-button" data-settings-category="limits" aria-controls="settings-panel-limits" aria-selected="false" data-settings-icon="warning">Limits</button>',
      '      <button type="button" class="settings-category-button" data-settings-category="vault-profile" aria-controls="settings-panel-vault-profile" aria-selected="false" data-settings-icon="folder">Vault Profile</button>',
      '      <button type="button" class="settings-category-button" data-settings-category="templates" aria-controls="settings-panel-templates" aria-selected="false" data-settings-icon="markdownFile">Templates</button>',
      '      <button type="button" class="settings-category-button" data-settings-category="appearance" aria-controls="settings-panel-appearance" aria-selected="false" data-settings-icon="edit">Appearance</button>',
      '      <button type="button" class="settings-category-button" data-settings-category="embeddings" aria-controls="settings-panel-embeddings" aria-selected="false" data-settings-icon="search">Embeddings</button>',
      '      <button type="button" class="settings-category-button" data-settings-category="safety" aria-controls="settings-panel-safety" aria-selected="false" data-settings-icon="lock">Safety</button>',
      '      <button type="button" class="settings-category-button" data-settings-category="about" aria-controls="settings-panel-about" aria-selected="false" data-settings-icon="file">About</button>',
      '    </nav>',
      '    <div class="settings-category-content">',
      '      <section id="settings-panel-providers" class="settings-section settings-category-panel" data-settings-category-panel="providers">',
      '        <div class="settings-section-head">',
      '          <h3>Local Providers</h3>',
      '          <p>Override local provider URLs without changing provider code.</p>',
      '        </div>',
      '        <div class="settings-provider-list" data-settings-provider-list>',
      '          <div class="settings-empty">Loading provider settings...</div>',
      '        </div>',
      '      </section>',
      '      <section id="settings-panel-limits" class="settings-section settings-category-panel" data-settings-category-panel="limits" hidden>',
      '        <div class="settings-section-head">',
      '          <h3>Limits</h3>',
      '          <p>Control provider timeouts and request-size caps.</p>',
      '        </div>',
      '        <div class="settings-limit-grid" data-settings-limit-grid></div>',
      '        <div class="settings-section-actions">',
      '          <button type="button" class="settings-primary-button" data-settings-save-limits>Save limits</button>',
      '        </div>',
      '      </section>',
      '      <section id="settings-panel-vault-profile" class="settings-section settings-category-panel" data-settings-category-panel="vault-profile" hidden>',
      '        <div class="settings-section-head">',
      '          <h3>Vault Profile</h3>',
      '          <p>Map roles to top-level vault folders. This portable profile stays in the opened vault.</p>',
      '        </div>',
      '        <div class="settings-vault-role-list" data-settings-vault-role-list></div>',
      '      </section>',
      '      <section id="settings-panel-templates" class="settings-section settings-category-panel" data-settings-category-panel="templates" hidden>',
      '        <div class="settings-section-head">',
      '          <h3>Templates</h3>',
      '          <p>Future home for note and project preset management.</p>',
      '        </div>',
      '        <div class="settings-future-note">Template editing is not wired in this V1 step.</div>',
      '      </section>',
      '      <section id="settings-panel-appearance" class="settings-section settings-category-panel" data-settings-category-panel="appearance" hidden>',
      '        <div class="settings-section-head">',
      '          <h3>Appearance</h3>',
      '          <p>Future home for UI theme and Markdown preview style controls.</p>',
      '        </div>',
      '        <div class="settings-future-note">Appearance settings will extend the existing token system later.</div>',
      '      </section>',
      '      <section id="settings-panel-embeddings" class="settings-section settings-category-panel" data-settings-category-panel="embeddings" hidden>',
      '        <div class="settings-section-head">',
      '          <h3>Embeddings</h3>',
      '          <p>Local semantic search support. Embeddings stay separate from chat providers.</p>',
      '        </div>',
      '        <dl class="settings-detail-list" data-settings-embeddings-summary>',
      '          <div><dt>Base model</dt><dd>sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2</dd></div>',
      '          <div><dt>Artifact repo</dt><dd>Xenova/paraphrase-multilingual-MiniLM-L12-v2</dd></div>',
      '          <div><dt>License</dt><dd>Apache-2.0</dd></div>',
      '          <div><dt>Runtime target</dt><dd>Transformers.js / ONNX</dd></div>',
      '          <div><dt>Index storage</dt><dd>Vault .vitruvios/index by default</dd></div>',
      '        </dl>',
      '        <div class="settings-limit-grid" data-settings-embeddings-grid></div>',
      '        <div class="settings-section-actions">',
      '          <button type="button" class="settings-primary-button" data-settings-save-embeddings>Save embedding defaults</button>',
      '        </div>',
      '      </section>',
      '      <section id="settings-panel-safety" class="settings-section settings-category-panel" data-settings-category-panel="safety" hidden>',
      '        <div class="settings-section-head">',
      '          <h3>Safety</h3>',
      '          <p>Review, backup, permission, and audit behavior remains enforced in code.</p>',
      '        </div>',
      '        <div class="settings-future-note">Safety controls are informational until a real settings flow exists.</div>',
      '      </section>',
      '      <section id="settings-panel-about" class="settings-section settings-category-panel" data-settings-category-panel="about" hidden>',
      '        <div class="settings-section-head">',
      '          <h3>About</h3>',
      '          <p>Vitruvios V1 local-first Markdown vault assistant.</p>',
      '        </div>',
      '        <div class="settings-future-note">Version and license details can be expanded here later.</div>',
      '      </section>',
      '    </div>',
      '  </div>',
      '  <footer class="settings-footer">',
      '    <span class="settings-status" data-settings-status></span>',
      '    <button type="button" class="settings-secondary-button" data-settings-close>Close</button>',
      '  </footer>',
      '</div>'
    ].join('');
    renderSettingsCloseIcon(backdrop.querySelector('.settings-icon-button[data-settings-close]'));
    renderSettingsCategoryIcons(backdrop);
    bindSettingsCategories(backdrop);

    return {
      backdrop,
      dialog: backdrop.querySelector('.settings-panel'),
      providerList: backdrop.querySelector('[data-settings-provider-list]'),
      limitsGrid: backdrop.querySelector('[data-settings-limit-grid]'),
      vaultRoleList: backdrop.querySelector('[data-settings-vault-role-list]'),
      embeddingsGrid: backdrop.querySelector('[data-settings-embeddings-grid]'),
      saveEmbeddingsButton: backdrop.querySelector('[data-settings-save-embeddings]'),
      saveLimitsButton: backdrop.querySelector('[data-settings-save-limits]'),
      categoryButtons: Array.from(backdrop.querySelectorAll('[data-settings-category]')),
      categoryPanels: Array.from(backdrop.querySelectorAll('[data-settings-category-panel]')),
      status: backdrop.querySelector('[data-settings-status]'),
      closeButtons: Array.from(backdrop.querySelectorAll('[data-settings-close]'))
    };
  }

  function renderSettingsCategoryIcons(backdrop) {
    const renderer = getIconRenderer();
    if (!renderer || typeof renderer.createIconElement !== 'function') return;
    Array.from(backdrop.querySelectorAll('[data-settings-icon]')).forEach((button) => {
      const iconName = button.getAttribute('data-settings-icon');
      if (!iconName) return;
      const label = button.textContent;
      button.textContent = '';
      button.appendChild(renderer.createIconElement(iconName, 'settings-category-icon'));
      const text = document.createElement('span');
      text.textContent = label;
      button.appendChild(text);
    });
  }
  function bindSettingsCategories(backdrop) {
    const buttons = Array.from(backdrop.querySelectorAll('[data-settings-category]'));
    const panels = Array.from(backdrop.querySelectorAll('[data-settings-category-panel]'));
    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        const category = button.getAttribute('data-settings-category');
        buttons.forEach((item) => {
          const active = item === button;
          item.classList.toggle('is-active', active);
          item.setAttribute('aria-selected', String(active));
        });
        panels.forEach((panel) => {
          panel.hidden = panel.getAttribute('data-settings-category-panel') !== category;
        });
      });
    });
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
    return (typeof window !== 'undefined' && window.VitruviosIconRenderer) ? window.VitruviosIconRenderer : null;
  }
  async function openPanel(panel, api, statusBar, vaultProfileState) {
    panel.backdrop.hidden = false;
    if (panel.vaultProfileDraft) panel.vaultProfileDraft.invalidate();
    setText(panel.status, 'Loading...');
    setText(statusBar, 'Settings opened.');
    await renderSettings(panel, api, statusBar, vaultProfileState);
    panel.modalBehavior.focusInitial();
  }

  function closePanel(panel) {
    panel.backdrop.hidden = true;
  }

  function getModalBehavior() {
    return window.VitruviosModalBehavior;
  }

  async function renderSettings(panel, api, statusBar, vaultProfileState) {
    vaultProfileState = vaultProfileState || panel.vaultProfileState || null;
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
    await renderVaultProfileSettings(panel, api, statusBar, vaultProfileState);
    renderEmbeddingSettings(panel, api, statusBar, settings);
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

  function renderEmbeddingSettings(panel, api, statusBar, settings) {
    const embeddings = settings && settings.embeddings ? settings.embeddings : {};
    const similarNotes = embeddings.similarNotes || {};
    if (!panel.embeddingsGrid) return;
    panel.embeddingsGrid.innerHTML = '';

    const modeField = createSelectField('Mode', 'mode', [
      ['mixed', 'Mixed'],
      ['content', 'Content'],
      ['metadata', 'Metadata']
    ], similarNotes.mode || 'mixed');
    panel.embeddingsGrid.appendChild(modeField);

    panel.embeddingsGrid.appendChild(createEmbeddingNumberField('Minimum match %', 'minimumScorePercent', similarNotes.minimumScorePercent || 65, { min: 0, max: 100 }));
    panel.embeddingsGrid.appendChild(createEmbeddingWeightField(similarNotes.contentWeight || 80));
    panel.embeddingsGrid.appendChild(createEmbeddingNumberField('Max results', 'maxResults', similarNotes.maxResults || 8, { min: 1 }));

    if (panel.saveEmbeddingsButton && !panel.saveEmbeddingsButton.dataset.bound) {
      panel.saveEmbeddingsButton.dataset.bound = 'true';
      panel.saveEmbeddingsButton.addEventListener('click', async () => {
        const contentWeight = normalizePercent(panel.embeddingsGrid.querySelector('[data-settings-embedding-weight]').value, 80);
        const payload = { similarNotes: {
          mode: readEmbeddingValue(panel.embeddingsGrid, 'mode', 'mixed'),
          minimumScorePercent: readEmbeddingValue(panel.embeddingsGrid, 'minimumScorePercent', '65'),
          contentWeight,
          metadataWeight: 100 - contentWeight,
          maxResults: readEmbeddingValue(panel.embeddingsGrid, 'maxResults', '8')
        } };
        setText(panel.status, 'Saving embedding defaults...');
        const result = await api.settings.setEmbeddings(payload);
        if (!result || result.ok === false) {
          setText(panel.status, result && result.message ? result.message : 'Could not save embedding defaults.');
          return;
        }
        setText(panel.status, 'Embedding defaults saved.');
        renderSettings(panel, api, statusBar, result.settings || settings);
      });
    }
  }

  function createEmbeddingNumberField(labelText, key, value, options) {
    options = options || {};
    const label = document.createElement('label');
    label.className = 'settings-limit-field';
    label.innerHTML = '<span></span><input type="number" step="1" data-settings-embedding>';
    label.querySelector('span').textContent = labelText;
    const input = label.querySelector('input');
    input.setAttribute('data-embedding-key', key);
    if (options.min !== undefined) input.setAttribute('min', String(options.min));
    if (options.max !== undefined) input.setAttribute('max', String(options.max));
    input.value = String(value);
    return label;
  }

  function createEmbeddingWeightField(value) {
    const label = document.createElement('label');
    label.className = 'settings-limit-field settings-range-field';
    label.innerHTML = '<span>Content / metadata weight <strong data-settings-embedding-weight-display></strong></span><input type="range" min="0" max="100" step="5" data-settings-embedding-weight>';
    const input = label.querySelector('[data-settings-embedding-weight]');
    const display = label.querySelector('[data-settings-embedding-weight-display]');
    input.value = String(normalizePercent(value, 80));
    function update() {
      const content = normalizePercent(input.value, 80);
      display.textContent = content + '% content / ' + (100 - content) + '% metadata';
    }
    input.addEventListener('input', update);
    update();
    return label;
  }

  function readEmbeddingValue(root, key, fallback) {
    const input = root.querySelector('[data-embedding-key="' + key + '"]');
    return input ? input.value : fallback;
  }

  function normalizePercent(value, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(0, Math.min(100, Math.floor(number)));
  }

  function createSelectField(labelText, key, options, value) {
    const label = document.createElement('label');
    label.className = 'settings-limit-field';
    label.innerHTML = '<span></span><select class="settings-provider-url" data-settings-embedding-mode></select>';
    label.querySelector('span').textContent = labelText;
    const select = label.querySelector('select');
    select.setAttribute('data-embedding-key', key);
    options.forEach((option) => {
      const item = document.createElement('option');
      item.value = option[0];
      item.textContent = option[1];
      item.selected = option[0] === value;
      select.appendChild(item);
    });
    return label;
  }

  async function renderVaultProfileSettings(panel, api, statusBar, vaultProfileState) {
    if (!api || !api.vault || typeof api.vault.getProfile !== 'function') {
      panel.vaultRoleList.innerHTML = '<div class="settings-empty">Open a vault to configure its profile.</div>';
      return;
    }
    const [profileResult, folderResult, localIconsResult] = await Promise.all([
      safeCall(() => api.vault.getProfile()),
      safeCall(() => api.vault.listFolder('')),
      safeCall(() => api.vault.listProfileIcons())
    ]);
    if (!profileResult || profileResult.ok === false || !folderResult || folderResult.ok === false) {
      panel.vaultRoleList.innerHTML = '<div class="settings-empty">Open a vault to configure its profile.</div>';
      return;
    }
    const profile = profileResult.profile || { roles: {}, roleVisuals: {} };
    const folders = (folderResult.entries || []).filter((entry) => entry && entry.kind === 'folder' && !String(entry.path || '').includes('/'));
    const draft = panel.vaultProfileDraft;
    if (!draft) return;
    if (!draft.hasBase()) draft.reset(profile);
    const localIcons = localIconsResult && localIconsResult.ok !== false ? (localIconsResult.icons || []) : [];

    panel.vaultRoleList.innerHTML = '';
    getDefaultVaultRoles().forEach((role) => {
      panel.vaultRoleList.appendChild(createVaultRoleRow(role, draft, panel, folders, localIcons));
    });
    syncVaultRoleRows(panel, draft);

    panel.vaultRoleList.querySelectorAll('[data-settings-save-vault-role]').forEach((button) => {
      button.addEventListener('click', async () => {
        const role = button.getAttribute('data-role-id');
        if (!role || !draft.isDirty(role)) return;
        const entry = draft.getRole(role);
        setText(panel.status, 'Saving vault profile...');
        const result = await api.vault.setProfileRole({ role, folderPath: entry.folderPath, visual: serializeVaultRoleVisual(entry.visual) });
        if (!result || result.ok === false) {
          setText(panel.status, result && result.message ? result.message : 'Could not save Vault Profile.');
          return;
        }
        draft.commitRole(role, result.profile);
        if (vaultProfileState && typeof vaultProfileState.replace === 'function') vaultProfileState.replace(result.profile);
        setText(panel.status, 'Vault Profile saved.');
        setText(statusBar, 'Vault Profile saved.');
        await renderVaultProfileSettings(panel, api, statusBar, vaultProfileState);
      });
    });
    panel.vaultRoleList.querySelectorAll('[data-settings-reset-vault-role]').forEach((button) => {
      button.addEventListener('click', async () => {
        const role = button.getAttribute('data-role-id');
        setText(panel.status, 'Resetting Vault Profile role...');
        const result = await api.vault.resetProfileRole({ role });
        if (!result || result.ok === false) {
          setText(panel.status, result && result.message ? result.message : 'Could not reset Vault Profile role.');
          return;
        }
        draft.commitRole(role, result.profile);
        if (vaultProfileState && typeof vaultProfileState.replace === 'function') vaultProfileState.replace(result.profile);
        setText(panel.status, 'Vault Profile role reset.');
        setText(statusBar, 'Vault Profile role reset.');
        await renderVaultProfileSettings(panel, api, statusBar, vaultProfileState);
      });
    });
  }

  function createVaultRoleRow(role, draft, panel, folders, localIcons) {
    const entry = draft.getRole(role.id);
    const row = document.createElement('div');
    row.className = 'settings-vault-role-row';
    row.setAttribute('data-vault-role-id', role.id);
    row.__vaultRoleVisual = cloneVaultRoleVisual(entry.visual);
    row.innerHTML = [
      '<div class="settings-vault-role-meta"><strong></strong><span></span></div>',
      '<select class="settings-vault-role-path" data-settings-vault-role-path></select>',
      '<div class="settings-vault-role-appearance">',
      '  <button type="button" class="settings-vault-appearance-button" data-vault-icon-picker aria-label="Choose folder icon"></button>',
      '  <button type="button" class="settings-vault-appearance-button settings-vault-color-button" data-vault-color-picker aria-label="Choose folder color"></button>',
      '  <span class="settings-vault-role-preview" aria-hidden="true"></span>',
      '  <section class="settings-vault-picker" data-vault-icon-options hidden></section>',
      '  <section class="settings-vault-picker" data-vault-color-options hidden></section>',
      '</div>',
      '<div class="settings-provider-actions">',
      '  <button type="button" class="settings-secondary-button" data-settings-reset-vault-role>Reset</button>',
      '  <button type="button" class="settings-primary-button" data-settings-save-vault-role>Save</button>',
      '</div>'
    ].join('');
    row.querySelector('strong').textContent = role.label;
    const pathSelect = row.querySelector('[data-settings-vault-role-path]');
    appendOption(pathSelect, '', 'Unassigned', !entry.folderPath);
    folders.forEach((folder) => appendOption(pathSelect, folder.path, folder.name || folder.path, folder.path === entry.folderPath));
    wireVaultRoleAppearance(row, getFolderVisualHelpers(), localIcons, () => updateVaultRoleDraft(row, role.id, draft, panel));
    pathSelect.addEventListener('change', () => updateVaultRoleDraft(row, role.id, draft, panel));
    row.querySelector('[data-settings-save-vault-role]').setAttribute('data-role-id', role.id);
    row.querySelector('[data-settings-reset-vault-role]').setAttribute('data-role-id', role.id);
    renderVaultRolePreview(row);
    return row;
  }

  function updateVaultRoleDraft(row, roleId, draft, panel) {
    const pathSelect = row.querySelector('[data-settings-vault-role-path]');
    draft.updateRole(roleId, {
      folderPath: pathSelect ? pathSelect.value : '',
      visual: cloneVaultRoleVisual(row.__vaultRoleVisual)
    });
    syncVaultRoleRows(panel, draft);
  }

  function syncVaultRoleRows(panel, draft) {
    panel.vaultRoleList.querySelectorAll('.settings-vault-role-row').forEach((row) => {
      const roleId = row.getAttribute('data-vault-role-id');
      const entry = draft.getRole(roleId);
      const pathSelect = row.querySelector('[data-settings-vault-role-path]');
      const saveButton = row.querySelector('[data-settings-save-vault-role]');
      const description = row.querySelector('.settings-vault-role-meta span');
      if (pathSelect) {
        pathSelect.value = entry.folderPath;
        Array.from(pathSelect.options).forEach((option) => {
          if (!option.value) return;
          const assignedRole = draft.getAssignedRole(option.value);
          const usedByOtherRole = assignedRole && assignedRole !== roleId;
          option.disabled = Boolean(usedByOtherRole);
          option.textContent = option.getAttribute('data-folder-label') || option.textContent;
          if (usedByOtherRole) option.textContent += ' (used by ' + assignedRole + ')';
        });
      }
      if (description) description.textContent = entry.folderPath ? 'Assigned top-level folder' : 'Unassigned';
      const dirty = draft.isDirty(roleId);
      row.classList.toggle('is-dirty', dirty);
      if (saveButton) {
        saveButton.disabled = !dirty;
        saveButton.title = dirty ? 'Save role changes' : 'No changes to save';
        saveButton.setAttribute('aria-label', dirty ? 'Save changes for ' + roleId : 'No changes to save for ' + roleId);
      }
    });
  }
  function wireVaultRoleAppearance(row, helpers, localIcons, onChange) {
    const iconButton = row.querySelector('[data-vault-icon-picker]');
    const colorButton = row.querySelector('[data-vault-color-picker]');
    const iconPicker = row.querySelector('[data-vault-icon-options]');
    const colorPicker = row.querySelector('[data-vault-color-options]');
    const iconKeys = helpers && helpers.FOLDER_VISUAL_ICON_KEYS ? helpers.FOLDER_VISUAL_ICON_KEYS : ['folder'];
    const colorKeys = helpers && helpers.FOLDER_VISUAL_COLOR_KEYS ? helpers.FOLDER_VISUAL_COLOR_KEYS : ['amber-400'];

    function applyVisualChange() {
      renderVaultRolePreview(row);
      if (typeof onChange === 'function') onChange();
    }

    iconKeys.forEach((iconId) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'settings-vault-picker-icon';
      option.title = iconId;
      option.setAttribute('aria-label', 'Use ' + iconId + ' icon');
      appendVisualIcon(option, { kind: 'builtin', id: iconId });
      option.addEventListener('click', () => {
        row.__vaultRoleVisual.icon = { kind: 'builtin', id: iconId };
        iconPicker.hidden = true;
        applyVisualChange();
      });
      iconPicker.appendChild(option);
    });

    (localIcons || []).forEach((localIcon) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'settings-vault-picker-icon';
      option.title = localIcon.path;
      option.setAttribute('aria-label', 'Use local Vault SVG ' + localIcon.path);
      appendVisualIcon(option, localIcon);
      option.addEventListener('click', () => {
        row.__vaultRoleVisual.icon = { kind: 'custom', path: localIcon.path, src: localIcon.src };
        iconPicker.hidden = true;
        applyVisualChange();
      });
      iconPicker.appendChild(option);
    });

    colorKeys.forEach((colorId) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'settings-vault-picker-swatch folder-visual-color';
      option.setAttribute('data-folder-color', colorId);
      option.title = colorId;
      option.setAttribute('aria-label', 'Use ' + colorId + ' color');
      option.addEventListener('click', () => {
        row.__vaultRoleVisual.color = { kind: 'token', id: colorId };
        colorPicker.hidden = true;
        applyVisualChange();
      });
      colorPicker.appendChild(option);
    });

    iconButton.addEventListener('click', () => toggleVaultRolePicker(row, iconPicker));
    colorButton.addEventListener('click', () => toggleVaultRolePicker(row, colorPicker));
  }

  function toggleVaultRolePicker(row, target) {
    const root = row.closest('[data-settings-vault-role-list]');
    if (root) root.querySelectorAll('.settings-vault-picker').forEach((picker) => { if (picker !== target) picker.hidden = true; });
    target.hidden = !target.hidden;
  }

  function renderVaultRolePreview(row) {
    const visual = row.__vaultRoleVisual || createFallbackVisual();
    const preview = row.querySelector('.settings-vault-role-preview');
    const iconButton = row.querySelector('[data-vault-icon-picker]');
    const colorButton = row.querySelector('[data-vault-color-picker]');
    preview.textContent = '';
    iconButton.textContent = '';
    appendVisualIcon(preview, visual.icon);
    appendVisualIcon(iconButton, visual.icon);
    colorButton.innerHTML = '<span class="settings-vault-color-swatch"></span>';
    applyVisualColor(preview, visual);
    applyVisualColor(colorButton.querySelector('.settings-vault-color-swatch'), visual);
  }

  function appendVisualIcon(target, icon) {
    const renderer = getIconRenderer();
    const registry = typeof window !== 'undefined' ? window.VitruviosIconRegistry : null;
    const visualRenderer = getVaultProfileVisualIconRenderer();
    if (!renderer || !registry || !registry.resolveFolderVisualIconName) return;
    const visual = { icon: icon || { kind: 'builtin', id: 'folder' } };
    const rendered = visualRenderer && typeof visualRenderer.createFolderVisualIcon === 'function'
      ? visualRenderer.createFolderVisualIcon({
        renderer,
        visual,
        className: 'file-row-type-icon',
        resolveBuiltinIconName: (iconId) => registry.resolveFolderVisualIconName(iconId)
      })
      : null;
    target.appendChild(rendered || renderer.createIconElement(registry.resolveFolderVisualIconName(visual.icon.id), 'file-row-type-icon'));
  }

  function getVaultProfileVisualIconRenderer() {
    return typeof window !== 'undefined' ? window.VitruviosVaultProfileVisualIconRenderer : null;
  }

  function applyVisualColor(target, visual) {
    if (!target) return;
    const helpers = getFolderVisualHelpers();
    const token = helpers && helpers.getVisualColorToken ? helpers.getVisualColorToken(visual) : '';
    if (token) target.setAttribute('data-folder-color', token);
    else target.removeAttribute('data-folder-color');
    target.classList.add('folder-visual-color');
  }
  function serializeVaultRoleVisual(visual) {
    return {
      icon: visual && visual.icon && visual.icon.kind === 'custom'
        ? { kind: 'custom', path: visual.icon.path }
        : { kind: 'builtin', id: visual && visual.icon ? visual.icon.id : 'folder' },
      color: { kind: 'token', id: visual && visual.color ? visual.color.id : 'amber-400' }
    };
  }
  function cloneVaultRoleVisual(visual) {
    return { icon: Object.assign({}, visual.icon), color: Object.assign({}, visual.color) };
  }

  function createFallbackVisual() {
    return { icon: { kind: 'builtin', id: 'folder' }, color: { kind: 'token', id: 'amber-400' } };
  }

  function appendOption(select, value, label, selected) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    option.selected = selected;
    option.setAttribute('data-folder-label', label);
    select.appendChild(option);
    return option;
  }

  function createVaultProfileDraftState() {
    const module = typeof window !== 'undefined' ? window.VitruviosVaultProfileDraftState : null;
    return module && typeof module.createVaultProfileDraftState === 'function'
      ? module.createVaultProfileDraftState({ helpers: getFolderVisualHelpers() })
      : null;
  }
  function getFolderVisualHelpers() {
    return typeof window !== 'undefined' ? window.VitruviosFolderVisuals : null;
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
    return labels.length > 0 ? labels.join(' ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· ') : 'No declared capabilities';
  }

  function getDefaultVaultRoles() {
    const defaults = window.VitruviosVaultProfile && window.VitruviosVaultProfile.DEFAULT_FOLDERS
      ? window.VitruviosVaultProfile.DEFAULT_FOLDERS
      : { inbox: '00_Inbox', daily: '01_Daily', projects: '02_Projects', knowledge: '03_Knowledge', brain: '90_AI_Brain', archive: '99_Archive' };
    return Object.keys(defaults).map((id) => ({
      id,
      label: id,
      path: defaults[id]
    }));
  }

  function notifySettingsUpdated() {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('vitruvios:settings-updated'));
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
    window.VitruviosSettingsPanel = Object.freeze({ mountSettingsPanel });
  }
})();
