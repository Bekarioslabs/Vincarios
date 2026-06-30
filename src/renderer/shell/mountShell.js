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
        '    <select id="provider-select" class="provider-select" aria-label="Provider">',
        '      <option value="lm-studio">LM Studio</option>',
        '    </select>',
        '    <select id="provider-model-select" class="provider-select provider-model-select" aria-label="Model">',
        '      <option value="auto">Auto</option>',
        '    </select>',
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
        '      <button type="button" class="left-button" data-open-settings>Settings</button>',
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
        '            <button id="review-clear-done" class="review-clear-button" type="button" disabled>Clear executed</button>',
        '            <button id="review-execute" class="review-execute-button" type="button" disabled>Execute selected</button>',
        '          </div>',
        '        </div>',
        '        <div id="review-basket-items" class="review-basket-items">',
        '          <div class="mini-panel-empty">No suggestions yet.</div>',
        '        </div>',
        '      </section>',
        '      <section id="context-basket" class="context-slot" aria-label="Context Basket">',
        '        <div class="context-basket-header">',
        '          <div class="mini-panel-title">Context Basket</div>',
        '          <button id="context-clear-all" class="context-clear-button" type="button" disabled>Clear all</button>',
        '        </div>',
        '        <div id="context-basket-items" class="context-basket-items">',
        '          <div class="mini-panel-empty">No context items.</div>',
        '        </div>',
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
        '    <div class="pane-resizer" data-resize="files" title="Resize files and actions"></div>',
        '    <aside class="selection-actions-pane" data-future-slot="selection-actions" aria-label="Selection actions">',
        '      <div class="selection-actions-header">Selection Actions</div>',
        '      <div class="selection-actions-empty">Select a file or folder.</div>',
        '    </aside>',
        '    <div class="pane-resizer pane-resizer-horizontal" data-resize="preview" title="Resize preview"></div>',
        '    <section class="preview-pane">',
        '      <div class="markdown-preview-shell">',
        '        <div class="markdown-preview-toolbar">',
        '          <div id="markdown-preview-title" class="markdown-preview-title">Markdown Preview</div>',
        '          <div id="markdown-link-feedback" class="markdown-link-feedback" hidden></div>',
        '          <button id="markdown-history-back" class="markdown-history-button" type="button" title="Back" disabled>&lt;</button>',
        '          <button id="markdown-history-forward" class="markdown-history-button" type="button" title="Forward" disabled>&gt;</button>',
        '          <button id="markdown-reveal-current" class="markdown-reveal-current" type="button" disabled>Reveal in Files</button>',
        '          <button id="markdown-edit-toggle" class="markdown-edit-toggle" type="button" disabled>Edit</button>',
        '          <button id="markdown-propose-update" class="markdown-propose-update" type="button" disabled>Update</button>',
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
      const contextState = createContextState();
      const vaultUi = { filePanel: null };
      const reviewBasket = mountOptional('review basket', status, () => window.ZeusReviewBasket
        ? window.ZeusReviewBasket.mountReviewBasket({ app, status, executeProposal: (proposal) => executeReviewProposal(api, proposal, vaultUi) })
        : null);
      wireVaultShell(api, app, contextState, vaultUi, reviewBasket);

      mountOptional('provider status', status, () => window.ZeusProviderStatus && window.ZeusProviderStatus.mountProviderStatus({ api, app }));
      mountOptional('settings panel', status, () => window.ZeusSettingsPanel && window.ZeusSettingsPanel.mountSettingsPanel({ api, app, status }));
      mountOptional('chat', status, () => window.ZeusChat && window.ZeusChat.mountChat({ api, app, status, reviewBasket, contextState }));
      mountOptional('context basket', status, () => window.ZeusContextBasket && window.ZeusContextBasket.mountContextBasket({ app, contextState, onActivate: (item) => revealContextItem(vaultUi, item) }));
      mountOptional('selection actions', status, () => window.ZeusSelectionActions && window.ZeusSelectionActions.mountSelectionActions({ api, app, contextState, reviewBasket, status }));
      mountOptional('pane resize', status, () => window.ZeusPaneResize && window.ZeusPaneResize.mountPaneResize(app));
      mountOptional('scoped selection', status, () => window.ZeusScopedSelection && window.ZeusScopedSelection.mountScopedSelection({ app }));
    });
  }


  function createContextState() {
    if (!window.ZeusContextState) return null;
    return window.ZeusContextState.createContextState();
  }

  function mountOptional(name, status, mount) {
    try {
      return mount();
    } catch (error) {
      setText(status, 'Startup warning: ' + name + ' unavailable.');
      return null;
    }
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



  function addPreviewUpdateProposal(reviewBasket, statusBar, proposal, contextState) {
    const permission = validatePreviewUpdatePermission(proposal, contextState);
    if (!permission.ok) {
      setText(statusBar, permission.message);
      return permission;
    }
    if (!reviewBasket || typeof reviewBasket.addProposal !== 'function') {
      return { ok: false, message: 'Review Basket unavailable.' };
    }
    reviewBasket.addProposal(proposal);
    setText(statusBar, 'Update proposal added to Review Basket.');
    return { ok: true };
  }
  function validatePreviewUpdatePermission(proposal, contextState) {
    const targetPath = normalizePath(proposal && proposal.targetPath);
    const selection = contextState && typeof contextState.snapshot === 'function' ? contextState.snapshot() : null;
    if (!targetPath) return { ok: false, message: 'Update target unavailable.' };
    if (!selection || selection.kind !== 'file' || normalizePath(selection.path) !== targetPath) {
      return { ok: false, message: 'Select this file before updating: ' + targetPath };
    }
    if (selection.writeAllowed !== true) {
      return { ok: false, message: 'Please enable W for this file before updating: ' + targetPath };
    }
    return { ok: true };
  }

  function normalizePath(value) {
    return String(value || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/').trim();
  }
  function revealContextItem(vaultUi, item) {
    const filePanel = vaultUi && vaultUi.filePanel;
    if (!item || !filePanel) return;
    if (item.kind === 'file' && typeof filePanel.revealPath === 'function') filePanel.revealPath(item.path);
    if (item.kind === 'folder' && typeof filePanel.revealFolder === 'function') filePanel.revealFolder(item.path);
  }
  async function executeReviewProposal(api, proposal, vaultUi) {
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
      const result = await api.vault.createNote({
        targetFolder: proposal.targetFolder,
        title: proposal.title,
        content: proposal.content
      });
      if (result && result.ok) await refreshFilePanelAfterWrite(vaultUi);
      return result;
    }
    if (proposal.type === 'update_note') {
      if (typeof api.vault.updateNote !== 'function') {
        return { ok: false, code: 'write_unavailable', message: 'Vault update API unavailable.' };
      }
      const result = await api.vault.updateNote({
        targetPath: proposal.targetPath,
        currentContent: proposal.currentContent,
        proposedContent: proposal.proposedContent
      });
      if (result && result.ok) await refreshCurrentPreviewAfterUpdate(vaultUi, proposal.targetPath);
      return result;
    }
    return { ok: false, code: 'unsupported_action', message: 'Unsupported review action.' };
  }

  async function refreshFilePanelAfterWrite(vaultUi) {
    const filePanel = vaultUi && vaultUi.filePanel;
    if (!filePanel || typeof filePanel.refreshTree !== 'function') return;
    try {
      await filePanel.refreshTree();
    } catch (error) {
      // A refresh failure must not turn an already completed vault write into a failed write.
    }
  }

  async function refreshCurrentPreviewAfterUpdate(vaultUi, targetPath) {
    const filePanel = vaultUi && vaultUi.filePanel;
    if (!filePanel || typeof filePanel.refreshLoadedMarkdown !== 'function') return;
    try {
      await filePanel.refreshLoadedMarkdown(targetPath);
    } catch (error) {
      // A preview refresh failure must not turn an already completed vault write into a failed write.
    }
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

  function wireVaultShell(api, app, contextState, vaultUi, reviewBasket) {
    const openButtons = app.querySelectorAll('[data-open-vault]');
    const filePanelRoot = app.querySelector('#file-panel');
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
        },
        onProposeUpdate: (proposal) => addPreviewUpdateProposal(reviewBasket, statusBar, proposal, contextState)
      })
      : null;
    const permissionState = createPermissionState(statusBar);

    if (!api || !api.vault) {
      setText(statusBar, 'Vault API unavailable.');
    } else if (!window.ZeusFilePanel) {
      setText(statusBar, 'File panel unavailable.');
    } else {
      filePanel = window.ZeusFilePanel.mountFilePanel({
        api,
        root: filePanelRoot,
        previewController,
        status: statusBar,
        contextState,
        permissionState
      });
      if (vaultUi) vaultUi.filePanel = filePanel;
    }

    openButtons.forEach((openButton) => openButton.addEventListener('click', async () => {
      if (!api || !api.vault) {
        setText(statusBar, 'Vault API unavailable.');
        return;
      }
      if (!filePanel) {
        setText(statusBar, 'File panel unavailable.');
        return;
      }

      setText(statusBar, 'Opening vault...');
      const selected = await api.vault.selectFolder();
      if (!selected.ok) {
        setText(statusBar, selected.message || 'Vault selection cancelled.');
        return;
      }

      const vaultName = baseName(selected.root);
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
