(function() {
  'use strict';

  function mountShell(root, api) {
    if (!root) return Promise.resolve();

    return getAppInfo(api).then((info) => {
      root.innerHTML = '';
      const app = document.createElement('main');
      app.className = 'app-shell is-start';
      app.innerHTML = [
        '<section class="start-screen">',
        '  <div class="start-kicker">Local-first Markdown assistant</div>',
        '  <h1>ZEUS Agent</h1>',
        '  <p>Open an Obsidian vault to analyze, organize, and review Markdown changes safely.</p>',
        '  <button type="button" class="start-open" data-open-vault>Open Vault</button>',
        '</section>',
        '<header class="titlebar">',
        '  <div class="titlebar-brand">ZEUS Agent</div>',
        '  <div class="titlebar-spacer"></div>',
        '  <div class="topbar-actions" aria-label="Provider status" data-provider-status-widget>',
        '    <span id="provider-status" class="status-pill" data-provider-status="offline">',
        '      <span id="provider-dot" class="status-dot" aria-hidden="true"></span>',
        '      <span id="provider-status-label">Provider offline</span>',
        '    </span>',
        '    <span id="provider-name" class="provider-pill" data-provider-name="lm-studio">LM Studio</span>',
        '  </div>',
        '</header>',
        '<section class="workspace">',
        '  <aside class="left-nav">',
        '    <div class="left-section-title">Actions</div>',
        '    <div class="left-nav-actions">',
        '      <button type="button" class="left-button left-button-accent" data-open-vault>Open Vault</button>',
        '      <button type="button" class="left-button" data-toggle="new-entry-presets" data-future-slot="new-entry-presets" aria-expanded="false">+ New Entry</button>',
        '      <div id="new-entry-presets" class="left-subactions" data-future-slot="new-entry-preset-list" hidden>',
        '        <button type="button" class="left-subbutton">Project</button>',
        '        <button type="button" class="left-subbutton">Custom Project 1</button>',
        '        <button type="button" class="left-subbutton">Custom Project 2</button>',
        '      </div>',
        '      <button type="button" class="left-button" data-future-slot="inbox-review">Inbox Review</button>',
        '      <button type="button" class="left-button" data-future-slot="review-basket-nav">Review Basket</button>',
        '      <button type="button" class="left-button" data-future-slot="settings">Settings</button>',
        '    </div>',
        '  </aside>',
        '  <section class="main-workspace">',
        '    <div class="workspace-stack">',
        '      <section id="chat-log" class="chat-log" aria-label="Chat messages">',
        '        <div class="chat-empty-state">Vault loaded. How can I help?</div>',
        '      </section>',
        '      <section class="review-slot" aria-label="Review Basket" data-future-slot="review-basket">',
        '        <div class="mini-panel-title">Review Basket</div>',
        '        <div class="mini-panel-empty">No suggestions yet.</div>',
        '      </section>',
        '      <section class="context-slot" aria-label="Active context" data-future-slot="context-bar">',
        '        <span class="context-label">Context</span>',
        '        <span id="context-value" class="context-value">No vault open.</span>',
        '      </section>',
        '      <section class="input-slot" aria-label="Chat input">',
        '        <textarea id="chat-input" class="chat-input-shell" rows="1" placeholder="Write something..." readonly aria-disabled="true"></textarea>',
        '        <button id="chat-send" type="button" class="send-button-shell" disabled>&gt;</button>',
        '      </section>',
        '    </div>',
        '  </section>',
        '  <div class="pane-resizer" data-resize="vault" title="Resize chat and vault"></div>',
        '  <aside class="vault-panel">',
        '    <section class="files-pane">',
        '      <div id="file-panel"></div>',
        '    </section>',
        '    <div class="pane-resizer" data-resize="files" title="Resize files and preview"></div>',
        '    <section class="preview-pane">',
        '      <pre id="markdown-preview" class="markdown-preview">No file selected.</pre>',
        '    </section>',
        '  </aside>',
        '</section>'
      ].join('');

      const status = document.createElement('footer');
      status.id = 'status-bar';
      status.className = 'status-bar';
      status.textContent = info.name + ' ' + info.version + ' - local first';

      app.appendChild(status);
      root.appendChild(app);
      wireShellInteractions(app);
      if (window.ZeusProviderStatus) window.ZeusProviderStatus.mountProviderStatus({ api, app });
      if (window.ZeusChat) window.ZeusChat.mountChat({ api, app, status });
      wireVaultShell(api, app);
      if (window.ZeusPaneResize) window.ZeusPaneResize.mountPaneResize(app);
    });
  }


  function createContextState(contextValue) {
    if (!window.ZeusContextState) return null;
    return window.ZeusContextState.createContextState({
      onChange(state) {
        setText(contextValue, state.label);
      }
    });
  }
  function createPermissionState(statusBar) {
    if (!window.ZeusPermissionState) return null;
    return window.ZeusPermissionState.createPermissionState({
      onChange(entry) {
        const modes = [];
        if (entry.read) modes.push('read');
        if (entry.write) modes.push('write');
        setText(statusBar, modes.length
          ? 'Permission set: ' + entry.path + ' (' + modes.join(', ') + ')'
          : 'Permission cleared: ' + entry.path);
      }
    });
  }
  function wireShellInteractions(app) {
    const presetToggle = app.querySelector('[data-toggle="new-entry-presets"]');
    const presetList = app.querySelector('#new-entry-presets');
    if (!presetToggle || !presetList) return;

    presetToggle.addEventListener('click', () => {
      const isExpanded = presetToggle.getAttribute('aria-expanded') === 'true';
      presetToggle.setAttribute('aria-expanded', String(!isExpanded));
      presetList.hidden = isExpanded;
    });
  }

  async function getAppInfo(api) {
    if (api && typeof api.appInfo === 'function') {
      try {
        return await api.appInfo();
      } catch (error) {
        return { name: 'ZEUS Agent', version: 'unavailable' };
      }
    }
    return { name: 'ZEUS Agent', version: '0.1.0' };
  }

  function wireVaultShell(api, app) {
    const openButtons = app.querySelectorAll('[data-open-vault]');
    const filePanelRoot = app.querySelector('#file-panel');
    const preview = app.querySelector('#markdown-preview');
    const contextValue = app.querySelector('#context-value');
    const statusBar = app.querySelector('#status-bar');
    const contextState = createContextState(contextValue);
    const permissionState = createPermissionState(statusBar);

    if (!api || !api.vault || !window.ZeusFilePanel) {
      setText(statusBar, 'Vault API unavailable.');
      return;
    }

    const filePanel = window.ZeusFilePanel.mountFilePanel({
      api,
      root: filePanelRoot,
      preview,
      status: statusBar,
      context: contextValue,
      contextState,
      permissionState
    });

    openButtons.forEach((openButton) => openButton.addEventListener('click', async () => {
      setText(statusBar, 'Opening vault...');
      const selected = await api.vault.selectFolder();
      if (!selected.ok) {
        setText(statusBar, selected.message || 'Vault selection cancelled.');
        return;
      }

      const vaultName = baseName(selected.root);
      setText(contextValue, 'Vault: ' + selected.root);
      setText(statusBar, 'Vault opened.');
      app.classList.remove('is-start');
      filePanel.setVaultName(vaultName || 'Vault');
      await filePanel.openRoot();
    }));
  }

  function baseName(value) {
    const normalized = String(value || '').replace(/\\/g, '/').replace(/\/+$/g, '');
    return normalized.split('/').pop() || normalized;
  }

  function setText(node, value) {
    if (node) node.textContent = value;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { mountShell, baseName };
  }

  if (typeof window !== 'undefined') {
    window.ZeusShell = Object.freeze({ mountShell });
  }
})();
