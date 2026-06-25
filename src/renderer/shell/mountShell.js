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
        '      <section id="review-basket" class="review-slot" aria-label="Review Basket" data-future-slot="review-basket">',
        '        <div class="review-basket-header">',
        '          <div class="mini-panel-title">Review Basket</div>',
        '          <div class="review-basket-actions">',
        '            <button id="review-clear" class="review-clear-button" type="button" disabled>Clear pending</button>',
        '            <button id="review-execute" class="review-execute-button" type="button" disabled>Execute selected</button>',
        '          </div>',
        '        </div>',
        '        <div id="review-basket-items" class="review-basket-items">',
        '          <div class="mini-panel-empty">No suggestions yet.</div>',
        '        </div>',
        '      </section>',
        '      <section class="context-slot" aria-label="Active context" data-future-slot="context-bar">',
        '        <label class="context-toggle" title="Include selected Markdown files as request-scoped context when relevant.">',
        '          <input id="active-context-toggle" type="checkbox" checked>',
        '          <span>Auto-context</span>',
        '        </label>',
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
        '      <div class="markdown-preview-shell">',
        '        <div class="markdown-preview-toolbar">',
        '          <div id="markdown-preview-title" class="markdown-preview-title">Markdown Preview</div>',
        '          <div id="markdown-link-feedback" class="markdown-link-feedback" hidden></div>',
        '          <button id="markdown-history-back" class="markdown-history-button" type="button" title="Back" disabled>&lt;</button>',
        '          <button id="markdown-history-forward" class="markdown-history-button" type="button" title="Forward" disabled>&gt;</button>',
        '          <button id="markdown-reveal-current" class="markdown-reveal-current" type="button" disabled>Reveal in Files</button>',
        '          <button id="markdown-edit-toggle" class="markdown-edit-toggle" type="button" disabled>Edit</button>',
        '        </div>',
        '        <article id="markdown-preview" class="markdown-preview">No file selected.</article>',
        '        <textarea id="markdown-source-editor" class="markdown-source-editor" spellcheck="false" hidden></textarea>',
        '      </div>',
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
      const contextState = createContextState(app.querySelector('#context-value'), app);
      const reviewBasket = window.ZeusReviewBasket ? window.ZeusReviewBasket.mountReviewBasket({ app, status, executeProposal: (proposal) => executeReviewProposal(api, proposal) }) : null;
      if (window.ZeusProviderStatus) window.ZeusProviderStatus.mountProviderStatus({ api, app });
      if (window.ZeusChat) window.ZeusChat.mountChat({ api, app, status, reviewBasket, contextState });
      wireVaultShell(api, app, contextState);
      if (window.ZeusPaneResize) window.ZeusPaneResize.mountPaneResize(app);
    });
  }


  function createContextState(contextValue, app) {
    if (!window.ZeusContextState) return null;
    const toggle = app ? app.querySelector('#active-context-toggle') : null;
    const state = window.ZeusContextState.createContextState({
      onChange(snapshot) {
        setText(contextValue, snapshot.label);
        if (toggle) toggle.checked = snapshot.autoContextEnabled === true;
      }
    });
    if (toggle) {
      toggle.addEventListener('change', () => {
        state.setAutoContextEnabled(toggle.checked);
      });
    }
    return state;
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


  async function executeReviewProposal(api, proposal) {
    if (!proposal) {
      return { ok: false, code: 'unsupported_action', message: 'Unsupported review action.' };
    }
    if (!api || !api.vault) {
      return { ok: false, code: 'write_unavailable', message: 'Vault write API unavailable.' };
    }
    if (proposal.type === 'create_note') {
      if (typeof api.vault.createNote !== 'function') {
        return { ok: false, code: 'write_unavailable', message: 'Vault create API unavailable.' };
      }
      return api.vault.createNote({
        targetFolder: proposal.targetFolder,
        title: proposal.title,
        content: proposal.content
      });
    }
    if (proposal.type === 'update_note') {
      if (typeof api.vault.updateNote !== 'function') {
        return { ok: false, code: 'write_unavailable', message: 'Vault update API unavailable.' };
      }
      return api.vault.updateNote({
        targetPath: proposal.targetPath,
        currentContent: proposal.currentContent,
        proposedContent: proposal.proposedContent
      });
    }
    return { ok: false, code: 'unsupported_action', message: 'Unsupported review action.' };
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

  function wireVaultShell(api, app, contextState) {
    const openButtons = app.querySelectorAll('[data-open-vault]');
    const filePanelRoot = app.querySelector('#file-panel');
    const contextValue = app.querySelector('#context-value');
    const statusBar = app.querySelector('#status-bar');
    let filePanel = null;
    const previewController = window.ZeusMarkdownPreview
      ? window.ZeusMarkdownPreview.mountMarkdownPreview({
        app,
        status: statusBar,
        onOpenLink: (request) => filePanel && filePanel.openLinkedMarkdown
          ? filePanel.openLinkedMarkdown(request.target, request.currentPath)
          : { ok: false, message: 'File panel unavailable.' },
        onRevealCurrentPath: (path) => filePanel && filePanel.revealPath
          ? filePanel.revealPath(path)
          : { ok: false, message: 'File panel unavailable.' },
        onOpenHistoryPath: (path) => {
          setText(statusBar, 'Preview history: ' + path);
          return { ok: true, path };
        }
      })
      : null;
    const permissionState = createPermissionState(statusBar);

    if (!api || !api.vault || !window.ZeusFilePanel) {
      setText(statusBar, 'Vault API unavailable.');
      return;
    }

    filePanel = window.ZeusFilePanel.mountFilePanel({
      api,
      root: filePanelRoot,
      previewController,
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
