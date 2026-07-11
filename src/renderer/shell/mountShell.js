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
        '    <span id="provider-privacy-badge" class="provider-privacy-badge" data-provider-privacy="local" title="Local provider">Local</span>',
        '    <button id="provider-refresh" type="button" class="provider-refresh-button" aria-label="Refresh provider status" title="Refresh provider status"></button>',
        '    <select id="provider-select" class="provider-select" aria-label="Provider">',
        '      <option value="lm-studio">LM Studio</option>',
        '    </select>',
        '    <select id="provider-model-select" class="provider-select provider-model-select" aria-label="Model">',
        '      <option value="auto">Auto</option>',
        '    </select>',
        '  </div>',
        '</header>',
        '<section class="workspace">',
        '  <aside class="left-nav" aria-label="Application navigation">',
        '    <div class="left-nav-actions">',
        '      <section class="left-nav-group left-nav-group-workspace" aria-label="Workspace">',
        '        <div class="left-section-title">Workspace</div>',
        '        <button type="button" class="left-button left-button-current" data-workspace-tab="chat" aria-current="page">Chat</button>',
        '        <button type="button" class="left-button" data-workspace-tab="suggestions"><span>Suggestions</span><span class="left-button-count" data-suggestions-count hidden>0</span></button>',
        '        <button type="button" class="left-button" data-workspace-tab="sessionLog">Session Log</button>',
        '      </section>',
        '      <section class="left-nav-group left-nav-group-create" aria-label="Create">',
        '        <div class="left-section-title">Create</div>',
        '        <button type="button" class="left-button" data-toggle="note-presets" aria-expanded="false" aria-controls="note-presets">New Note</button>',
        '        <div id="note-presets" class="left-subactions" data-preset-list="note" hidden>',
        '        </div>',
        '        <button type="button" class="left-button" data-toggle="project-presets" aria-expanded="false" aria-controls="project-presets">New Project</button>',
        '        <div id="project-presets" class="left-subactions" data-preset-list="project" hidden>',
        '        </div>',
        '      </section>',
        '      <section class="left-nav-group left-nav-group-vault" aria-label="Vault">',
        '        <div class="left-section-title">Vault</div>',
        '        <button type="button" class="left-button left-button-accent" data-open-vault>Open Vault</button>',
        '        <button type="button" class="left-button" data-inbox-review>Inbox Review</button>',
        '        <button type="button" class="left-button left-button-placeholder" data-future-slot="review-basket-nav" disabled>Review Basket</button>',
        '      </section>',
        '      <section class="left-nav-group left-nav-group-settings" aria-label="Settings">',
        '        <button type="button" class="left-button" data-open-settings data-left-icon="settings">Settings</button>',
        '      </section>',
        '    </div>',
        '  </aside>',
        '  <section class="main-workspace">',
        '    <section class="workspace-panel is-active" data-workspace-panel="chat">',
        '    <div class="workspace-stack">',
        '      <section id="chat-log" class="chat-log" aria-label="Chat messages" aria-live="polite" aria-relevant="additions">',
        '        <div class="chat-empty-state">Vault loaded. How can I help?</div>',
        '      </section>',
        '      <section id="review-basket" class="review-slot" aria-label="Review Basket" data-future-slot="review-basket">',
        '        <div class="review-basket-header">',
        '          <button type="button" class="mini-panel-toggle" data-panel-toggle="review-basket" aria-expanded="true" aria-controls="review-basket-items">',
        '            <span class="mini-panel-toggle-icon" aria-hidden="true"></span>',
        '            <span>Review Basket</span>',
        '            <span id="review-basket-count" class="mini-panel-count" hidden>0</span>',
        '          </button>',
        '          <div class="review-basket-actions">',
        '            <button id="review-clear" class="review-clear-button review-danger-button" type="button" title="Remove pending review items" aria-label="Clear pending review items" disabled>Clear pending</button>',
        '            <button id="review-clear-done" class="review-clear-button review-danger-button" type="button" title="Remove executed review items" aria-label="Clear executed review items" disabled>Clear executed</button>',
        '            <button id="review-execute" class="review-execute-button" type="button" disabled>Execute selected</button>',
        '          </div>',
        '        </div>',
        '        <div id="review-basket-items" class="review-basket-items">',
        '          <div class="mini-panel-empty">No suggestions yet.</div>',
        '        </div>',
        '      </section>',
        '      <section id="context-basket" class="context-slot" aria-label="Context Basket">',
        '        <div class="context-basket-header">',
        '          <button type="button" class="mini-panel-toggle" data-panel-toggle="context-basket" aria-expanded="true" aria-controls="context-basket-items">',
        '            <span class="mini-panel-toggle-icon" aria-hidden="true"></span>',
        '            <span>Context Basket</span>',
        '            <span id="context-basket-count" class="mini-panel-count" hidden>0</span>',
        '          </button>',
        '          <button id="context-clear-all" class="context-clear-button" type="button" disabled>Clear all</button>',
        '        </div>',
        '        <div id="context-basket-items" class="context-basket-items">',
        '          <div class="mini-panel-empty">No context items.</div>',
        '        </div>',
        '      </section>',
        '      <section class="input-slot" aria-label="Chat input">',
        '        <textarea id="chat-input" class="chat-input-shell" rows="1" placeholder="Write something..." readonly aria-disabled="true" aria-label="Chat message"></textarea>',
        '        <button id="chat-send" type="button" class="send-button-shell" disabled aria-label="Send message">&gt;</button>',
        '      </section>',
        '    </div>',
        '    </section>',
        '    <section id="suggestions-workspace" class="workspace-panel" data-workspace-panel="suggestions" hidden></section>',
        '    <section id="session-log-workspace" class="workspace-panel" data-workspace-panel="sessionLog" hidden></section>',
        '  </section>',
        '  <div class="pane-resizer" data-resize="vault" title="Resize chat and vault" role="separator" aria-label="Resize chat and vault" aria-orientation="vertical"></div>',
        '  <aside class="vault-panel">',
        '    <section class="files-pane">',
        '      <div id="file-panel"></div>',
        '    </section>',
        '    <div class="pane-resizer" data-resize="files" title="Resize files and actions" role="separator" aria-label="Resize files and actions" aria-orientation="vertical"></div>',
        '    <aside class="selection-actions-pane" data-future-slot="selection-actions" aria-label="Selection actions">',
        '      <div class="selection-actions-header">Selection Actions</div>',
        '      <div class="selection-actions-empty">Select a file or folder.</div>',
        '    </aside>',
        '    <div class="pane-resizer pane-resizer-horizontal" data-resize="preview" title="Resize preview" role="separator" aria-label="Resize Markdown preview" aria-orientation="horizontal"></div>',
        '    <section class="preview-pane">',
        '      <div class="markdown-preview-shell">',
        '        <div class="markdown-preview-toolbar">',
        '          <div id="markdown-preview-title" class="markdown-preview-title">Markdown Preview</div>',
        '          <button id="markdown-history-back" class="markdown-history-button" type="button" title="Back" aria-label="Back in preview history" disabled>&lt;</button>',
        '          <button id="markdown-history-forward" class="markdown-history-button" type="button" title="Forward" aria-label="Forward in preview history" disabled>&gt;</button>',
        '          <button id="markdown-reveal-current" class="markdown-reveal-current" type="button" aria-label="Reveal current note in Files" disabled>Reveal in Files</button>',
        '          <button id="markdown-edit-toggle" class="markdown-edit-toggle" type="button" aria-label="Edit Markdown source" disabled>Edit</button>',
        '          <button id="markdown-propose-update" class="markdown-propose-update" type="button" aria-label="Propose Markdown update" disabled>Update</button>',
        '        </div>',
        '        <article id="markdown-preview" class="markdown-preview" aria-label="Markdown preview">No file selected.</article>',
        '        <textarea id="markdown-source-editor" class="markdown-source-editor" spellcheck="false" aria-label="Markdown source editor" hidden></textarea>',
        '      </div>',
        '      <div id="markdown-preview-status" class="markdown-preview-status is-empty" aria-live="polite" aria-atomic="true"></div>',
        '    </section>',
        '  </aside>',
        '</section>'
      ].join('');

      const status = document.createElement('footer');
      status.id = 'status-bar';
      status.className = 'status-bar';
      status.innerHTML = '<div id="status-bar-global" class="status-bar-global" role="status" aria-live="polite"></div>';
      const globalStatus = status.querySelector('#status-bar-global');
      globalStatus.textContent = info.name + ' ' + info.version + ' - local first';

      app.appendChild(status);
      root.appendChild(app);
      renderLeftNavigationIcons(app);
      wireShellInteractions(app);
      const workspaceState = createWorkspaceState();
      wireWorkspaceTabs(app, workspaceState);
      const activityState = createActivityState();
      app.__zeusActivityState = activityState;
      const contextState = createContextState();
      const suggestionState = createSuggestionState();
      wireSuggestionIndicator(app, suggestionState);
      const updateFlashState = createUpdateFlashState();
      const vaultUi = { filePanel: null, updateFlashState };
      const reviewBasket = mountOptional('review basket', status, () => window.ZeusReviewBasket
        ? window.ZeusReviewBasket.mountReviewBasket({ app, status, executeProposal: (proposal) => executeReviewProposalWithActivity(api, proposal, vaultUi, activityState) })
        : null);
      mountOptional('creation presets', status, () => window.ZeusCreationPresets && window.ZeusCreationPresets.mountCreationPresets({ app, api, reviewBasket, status }));
      wireVaultShell(api, app, contextState, vaultUi, reviewBasket);

      mountOptional('provider status', status, () => window.ZeusProviderStatus && window.ZeusProviderStatus.mountProviderStatus({ api, app }));
      mountOptional('settings panel', status, () => window.ZeusSettingsPanel && window.ZeusSettingsPanel.mountSettingsPanel({ api, app, status }));
      mountOptional('inbox cleanup', status, () => window.ZeusInboxCleanup && window.ZeusInboxCleanup.mountInboxCleanup({ api, app, status }));
      mountOptional('chat', status, () => window.ZeusChat && window.ZeusChat.mountChat({ api, app, status, reviewBasket, contextState }));
      mountOptional('context basket', status, () => window.ZeusContextBasket && window.ZeusContextBasket.mountContextBasket({ app, contextState, onActivate: (item) => revealContextItem(vaultUi, item) }));
      mountOptional('suggestions workspace', status, () => window.ZeusSuggestionsWorkspace && window.ZeusSuggestionsWorkspace.mountSuggestionsWorkspace({ root: app.querySelector('#suggestions-workspace'), suggestionState, reviewBasket, status }));
      mountOptional('session log', status, () => window.ZeusSessionLog && window.ZeusSessionLog.mountSessionLog({ root: app.querySelector('#session-log-workspace'), activityState }));
      mountOptional('selection actions', status, () => window.ZeusSelectionActions && window.ZeusSelectionActions.mountSelectionActions({ api, app, contextState, reviewBasket, status, suggestionState }));
      mountOptional('pane resize', status, () => window.ZeusPaneResize && window.ZeusPaneResize.mountPaneResize(app));
      mountOptional('scoped selection', status, () => window.ZeusScopedSelection && window.ZeusScopedSelection.mountScopedSelection({ app }));
    });
  }


  function createWorkspaceState() {
    if (!window.ZeusWorkspaceState) return null;
    return window.ZeusWorkspaceState.createWorkspaceState();
  }

  function createSuggestionState() {
    if (!window.ZeusSuggestionState) return null;
    return window.ZeusSuggestionState.createSuggestionState();
  }

  function createActivityState() {
    if (!window.ZeusActivityState) return null;
    return window.ZeusActivityState.createActivityState();
  }

  function createUpdateFlashState() {
    if (!window.ZeusUpdateFlashState || typeof window.ZeusUpdateFlashState.createUpdateFlashState !== 'function') return null;
    return window.ZeusUpdateFlashState.createUpdateFlashState({ normalizePath });
  }

  function wireWorkspaceTabs(app, workspaceState) {
    if (!app || !workspaceState) return;
    const buttons = Array.from(app.querySelectorAll('[data-workspace-tab]'));
    const panels = Array.from(app.querySelectorAll('[data-workspace-panel]'));
    function render(snapshot) {
      const active = snapshot && snapshot.activeWorkspace ? snapshot.activeWorkspace : 'chat';
      buttons.forEach((button) => {
        const isActive = button.dataset.workspaceTab === active;
        button.classList.toggle('left-button-current', isActive);
        if (isActive) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
      });
      panels.forEach((panel) => {
        const isActive = panel.dataset.workspacePanel === active;
        panel.hidden = !isActive;
        panel.classList.toggle('is-active', isActive);
      });
    }
    buttons.forEach((button) => {
      button.addEventListener('click', () => workspaceState.setActiveWorkspace(button.dataset.workspaceTab));
    });
    workspaceState.subscribe(render);
    render(workspaceState.snapshot());
  }

  function wireSuggestionIndicator(app, suggestionState) {
    if (!app || !suggestionState || typeof suggestionState.subscribe !== 'function') return;
    const count = app.querySelector('[data-suggestions-count]');
    const button = app.querySelector('[data-workspace-tab="suggestions"]');
    if (!count || !button) return;

    function render(snapshot) {
      const total = countSuggestionItems(snapshot);
      count.hidden = total === 0;
      count.textContent = String(total);
      if (total > 0) button.setAttribute('aria-label', 'Suggestions, ' + total + ' open item' + (total === 1 ? '' : 's'));
      else button.setAttribute('aria-label', 'Suggestions');
    }

    suggestionState.subscribe(render);
    render(suggestionState.snapshot());
  }

  function countSuggestionItems(snapshot) {
    const groups = snapshot && Array.isArray(snapshot.groups) ? snapshot.groups : [];
    return groups.reduce((total, group) => {
      const items = group && Array.isArray(group.items) ? group.items : [];
      return total + items.filter((item) => item && item.dismissed !== true).length;
    }, 0);
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
  function renderLeftNavigationIcons(app) {
    const renderer = getIconRenderer();
    if (!app || !renderer || typeof renderer.createIconElement !== 'function') return;
    app.querySelectorAll('[data-left-icon]').forEach((button) => {
      const iconName = button.getAttribute('data-left-icon');
      if (!iconName) return;
      const label = button.textContent;
      button.textContent = '';
      button.appendChild(renderer.createIconElement(iconName, 'left-button-icon'));
      const text = document.createElement('span');
      text.textContent = label;
      button.appendChild(text);
    });
  }
  function wireShellInteractions(app) {
    app.querySelectorAll('[data-toggle]').forEach((button) => {
      const targetId = button.getAttribute('aria-controls');
      const target = targetId ? app.querySelector('#' + targetId) : null;
      if (!target) return;
      button.addEventListener('click', () => {
        const isExpanded = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!isExpanded));
        target.hidden = isExpanded;
      });
    });

    app.querySelectorAll('[data-panel-toggle]').forEach((button) => {
      renderPanelToggleIcon(button);
      button.addEventListener('click', () => {
        const panelId = button.getAttribute('data-panel-toggle');
        const panel = panelId ? app.querySelector('#' + panelId) : null;
        if (!panel) return;
        const isExpanded = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!isExpanded));
        panel.classList.toggle('is-collapsed', isExpanded);
        renderPanelToggleIcon(button);
      });
    });
  }




  function renderPanelToggleIcon(button) {
    if (!button) return;
    const slot = button.querySelector('.mini-panel-toggle-icon');
    if (!slot) return;
    slot.textContent = '';
    const iconName = button.getAttribute('aria-expanded') === 'false' ? 'chevronRight' : 'chevronDown';
    const renderer = getIconRenderer();
    if (renderer && typeof renderer.createIconElement === 'function') {
      slot.appendChild(renderer.createIconElement(iconName, 'mini-panel-chevron-icon'));
      return;
    }
    slot.textContent = iconName === 'chevronRight' ? '>' : 'v';
  }

  function getIconRenderer() {
    return (typeof window !== 'undefined' && window.ZeusIconRenderer) ? window.ZeusIconRenderer : null;
  }
  function addPreviewUpdateProposal(reviewBasket, statusBar, proposal, contextState, permissionState) {
    const permission = validatePreviewUpdatePermission(proposal, contextState, permissionState);
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
  function validatePreviewUpdatePermission(proposal, contextState, permissionState) {
    const targetPath = normalizePath(proposal && proposal.targetPath);
    const selection = contextState && typeof contextState.snapshot === 'function' ? contextState.snapshot() : null;
    if (!targetPath) return { ok: false, message: 'Update target unavailable.' };
    if (permissionState && typeof permissionState.resolve === 'function') {
      if (permissionState.resolve(targetPath).write === true) return { ok: true };
      return { ok: false, message: 'Please enable W for this file before updating: ' + targetPath };
    }
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
  async function executeReviewProposalWithActivity(api, proposal, vaultUi, activityState) {
    const result = await executeReviewProposal(api, proposal, vaultUi);
    recordReviewActivity(activityState, proposal, result);
    return result;
  }

  function recordReviewActivity(activityState, proposal, result) {
    if (!activityState || typeof activityState.record !== 'function' || !proposal || !result) return;
    const ok = result.ok === true;
    activityState.record({
      type: ok ? 'success' : 'error',
      action: reviewActivityLabel(proposal),
      targetPath: result.path || proposal.targetPath || proposal.targetFolder || '',
      detail: ok ? 'Review action executed.' : (result.message || 'Review action failed.')
    });
  }

  function reviewActivityLabel(proposal) {
    if (proposal.type === 'create_note') return 'Created note';
    if (proposal.type === 'create_from_template') return 'Created template';
    if (proposal.type === 'update_note') return 'Updated note';
    return 'Review action';
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
      if (result && result.ok) {
        await refreshFilePanelAfterWrite(vaultUi);
        flashReviewedWriteResult(vaultUi, proposal, result);
      }
      return result;
    }
    if (proposal.type === 'create_from_template') {
      if (typeof api.vault.createFolder !== 'function') {
        return { ok: false, code: 'write_unavailable', message: 'Vault folder create API unavailable.' };
      }
      if (typeof api.vault.createNote !== 'function') {
        return { ok: false, code: 'write_unavailable', message: 'Vault create API unavailable.' };
      }
      const folders = Array.isArray(proposal.folders) ? proposal.folders : [];
      const files = Array.isArray(proposal.files) ? proposal.files : [];
      const createdFolders = [];
      const created = [];
      for (const folder of folders) {
        const result = await api.vault.createFolder({ targetFolder: folder });
        if (!result || !result.ok) {
          return Object.assign({}, result || {}, {
            ok: false,
            code: (result && result.code) || 'template_folder_create_failed',
            message: (result && result.message) || 'Template folder creation failed.',
            createdFolders,
            created
          });
        }
        createdFolders.push(result.path);
      }
      for (const file of files) {
        const parts = splitPath(file.path);
        const fileName = parts.pop() || 'Untitled.md';
        const result = await api.vault.createNote({
          targetFolder: parts.join('/'),
          title: fileName.replace(/\.md$/i, ''),
          content: file.content || ''
        });
        if (!result || !result.ok) {
          return Object.assign({}, result || {}, {
            ok: false,
            code: (result && result.code) || 'template_create_failed',
            message: (result && result.message) || 'Template creation failed.',
            createdFolders,
            created
          });
        }
        created.push(result.path);
      }
      await refreshFilePanelAfterWrite(vaultUi);
      const result = { ok: true, action: 'create_from_template', path: proposal.targetPath || proposal.templatePlanRootPath || '', createdFolders, created };
      flashReviewedWriteResult(vaultUi, proposal, result);
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
      if (result && result.ok) {
        await refreshCurrentPreviewAfterUpdate(vaultUi, proposal.targetPath);
        flashReviewedWriteResult(vaultUi, proposal, result);
      }
      return result;
    }
    return { ok: false, code: 'unsupported_action', message: 'Unsupported review action.' };
  }

  function splitPath(value) {
    return String(value || '').replace(/\\/g, '/').split('/').map((part) => part.trim()).filter(Boolean);
  }

  function flashReviewedWriteResult(vaultUi, proposal, result) {
    const flashState = vaultUi && vaultUi.updateFlashState;
    if (!flashState || typeof flashState.flashTargets !== 'function') return;
    const targets = reviewedWriteFlashTargets(proposal, result);
    if (targets.length) flashState.flashTargets(targets);
  }

  function reviewedWriteFlashTargets(proposal, result) {
    if (!proposal || !result || result.ok !== true) return [];
    if (proposal.type === 'create_note') {
      return compactFlashTargets([{ path: result.path || proposal.targetPath, kind: 'file', reason: 'created' }]);
    }
    if (proposal.type === 'update_note') {
      return compactFlashTargets([{ path: proposal.targetPath, kind: 'file', reason: 'updated' }]);
    }
    if (proposal.type === 'create_from_template') {
      return compactFlashTargets([
        { path: result.path || proposal.templatePlanRootPath || proposal.targetPath, kind: 'folder', reason: 'template_created' },
        { path: Array.isArray(result.created) ? result.created[0] : '', kind: 'file', reason: 'created' }
      ]);
    }
    return [];
  }

  function compactFlashTargets(targets) {
    const seen = new Set();
    return (Array.isArray(targets) ? targets : []).filter((target) => {
      const path = normalizePath(target && target.path);
      if (!path || seen.has(path)) return false;
      seen.add(path);
      target.path = path;
      return true;
    });
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
    const statusBar = app.querySelector('#status-bar-global');
    let filePanel = null;
    const previewController = window.ZeusMarkdownPreview
      ? window.ZeusMarkdownPreview.mountMarkdownPreview({
        app,
        api,
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
        onProposeUpdate: (proposal) => addPreviewUpdateProposal(reviewBasket, statusBar, proposal, contextState, permissionState)
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
        permissionState,
        updateFlashState: vaultUi && vaultUi.updateFlashState
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
      recordActivityFromStatus(app, 'success', 'Vault opened', vaultName || 'Vault', '');
      app.classList.remove('is-start');
      filePanel.setVaultName(vaultName || 'Vault');
      await filePanel.openRoot();
    }));
  }

  function baseName(value) {
    const normalized = String(value || '').replace(/\\/g, '/').replace(/\/+$/g, '');
    return normalized.split('/').pop() || normalized;
  }

  function recordActivityFromStatus(app, type, action, targetPath, detail) {
    const state = app && app.__zeusActivityState;
    if (!state || typeof state.record !== 'function') return;
    state.record({ type, action, targetPath, detail });
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
