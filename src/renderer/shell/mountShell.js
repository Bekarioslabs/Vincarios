(function() {
  'use strict';

  function mountShell(root, api) {
    if (!root) return Promise.resolve();

    const themeController = createThemeController(api);
    return themeController.load().catch(() => themeController.snapshot()).then(() => getAppInfo(api)).then(async (info) => {
      root.innerHTML = '';
      const app = document.createElement('main');
      app.className = 'app-shell is-start';
      app.innerHTML = [
        '<section class="start-screen" data-startup-screen aria-label="Welcome to vincarios">',
        '  <div class="start-screen-content">',
        '    <div class="start-logo-slot" aria-hidden="true">',
        '      <img class="start-logo start-logo-dark" src="./src/renderer/assets/brand/vincarios-logo-dark.svg" alt="">',
        '      <img class="start-logo start-logo-light" src="./src/renderer/assets/brand/vincarios-logo-light.svg" alt="">',
        '    </div>',
        '    <h1 class="start-wordmark"><span>vinca</span><span>rios</span></h1>',
        '    <p class="start-kicker">Local-first Markdown assistant</p>',
        '    <p class="start-version" data-start-version></p>',
        '    <button type="button" class="start-open" data-open-vault>Open Vault</button>',
        '    <section class="startup-recent" data-startup-recent aria-live="polite"></section>',
        '    <section class="startup-providers" data-startup-providers aria-label="Local provider availability"></section>',
        '  </div>',
        '</section>',
        '<header class="titlebar">',
        '  <div class="titlebar-brand" aria-label="vincarios"><span>vinca</span><span>rios</span></div>',
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
        '    <div class="left-nav-header">',
        '      <button type="button" class="left-nav-collapse-toggle ui-tool-button" data-left-nav-toggle aria-label="Collapse navigation" title="Collapse navigation" aria-expanded="true" aria-controls="left-nav-actions"><span class="left-nav-collapse-icon" aria-hidden="true"></span></button>',
        '    </div>',
        '    <div id="left-nav-actions" class="left-nav-actions">',
        '      <section class="left-nav-group left-nav-group-workspace" aria-label="Workspace">',
        '        <div class="left-section-title">Workspace</div>',
        '        <button type="button" class="left-button ui-flat-row" data-workspace-tab="home" data-left-icon="navigationHome" aria-label="Vault Home"><span class="left-button-label">Home</span></button>',
        '        <button type="button" class="left-button ui-flat-row left-button-current" data-workspace-tab="chat" data-left-icon="navigationChat" aria-current="page" aria-label="Chat"><span class="left-button-label">Chat</span></button>',
        '        <button type="button" class="left-button ui-flat-row" data-workspace-tab="search" data-left-icon="navigationSearch" aria-label="Search"><span class="left-button-label">Search</span></button>',
        '        <button type="button" class="left-button ui-flat-row" data-workspace-tab="suggestions" data-left-icon="navigationSuggestions" aria-label="Suggestions"><span class="left-button-label">Suggestions</span><span class="left-button-count" data-suggestions-count hidden>0</span></button>',
        '        <button type="button" class="left-button ui-flat-row" data-workspace-tab="review" data-left-icon="navigationReviewBasket" aria-label="Review Basket" aria-controls="review-workspace"><span class="left-button-label">Review</span><span class="left-button-count" data-review-count hidden>0</span></button>',
        '      </section>',
        '      <section class="left-nav-group left-nav-group-create" aria-label="Create">',
        '        <div class="left-section-title">Create</div>',
        '        <button type="button" class="left-button ui-flat-row" data-toggle="note-presets" data-left-icon="navigationNewNote" aria-expanded="false" aria-controls="note-presets" aria-label="New Note"><span class="left-button-label">New Note</span></button>',
        '        <div id="note-presets" class="left-subactions" data-preset-list="note" hidden>',
        '        </div>',
        '        <button type="button" class="left-button ui-flat-row" data-toggle="project-presets" data-left-icon="navigationNewProject" aria-expanded="false" aria-controls="project-presets" aria-label="New Project"><span class="left-button-label">New Project</span></button>',
        '        <div id="project-presets" class="left-subactions" data-preset-list="project" hidden>',
        '        </div>',
        '      </section>',
        '      <section class="left-nav-group left-nav-group-vault" aria-label="Vault">',
        '        <div class="left-section-title">Vault</div>',
        '        <button type="button" class="left-button ui-flat-row left-button-accent" data-open-vault data-left-icon="navigationOpenVault" aria-label="Open Vault"><span class="left-button-label">Open Vault</span></button>',
        '        <button type="button" class="left-button ui-flat-row" data-inbox-review data-left-icon="navigationInboxReview" aria-label="Inbox Review"><span class="left-button-label">Inbox Review</span></button>',
        '      </section>',
        '      <section class="left-nav-group left-nav-group-settings" aria-label="Settings">',
        '        <button type="button" class="left-button ui-flat-row" data-open-settings data-left-icon="settings" aria-label="Settings"><span class="left-button-label">Settings</span></button>',
        '      </section>',
        '    </div>',
        '  </aside>',
        '  <section class="main-workspace">',
        '    <section class="workspace-panel is-active" data-workspace-panel="chat">',
        '    <div class="workspace-stack">',
        '      <section id="chat-log" class="chat-log" aria-label="Chat messages" aria-live="polite" aria-relevant="additions">',
        '        <div class="chat-empty-state">Vault loaded. How can I help?</div>',
        '      </section>',
        '      <section id="context-basket" class="context-slot is-collapsed" aria-label="Context Basket">',
        '        <div class="context-basket-header">',
        '          <button type="button" class="mini-panel-toggle" data-panel-toggle="context-basket" aria-expanded="false" aria-controls="context-basket-items">',
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
        '    <section id="review-workspace" class="workspace-panel review-workspace" data-workspace-panel="review" hidden>',
        '      <section id="review-basket" class="review-slot review-workspace-slot" aria-label="Review Basket">',
        '        <div class="review-basket-header">',
        '          <div class="review-workspace-title"><span>Review Basket</span><span id="review-basket-count" class="mini-panel-count" hidden>0</span></div>',
        '          <div class="review-basket-actions">',
        '            <button id="review-clear" class="review-clear-button review-danger-button" type="button" title="Remove pending review items" aria-label="Clear pending review items" disabled>Clear pending</button>',
        '            <button id="review-clear-done" class="review-clear-button review-warning-button" type="button" title="Remove executed review items" aria-label="Clear executed review items" disabled>Clear executed</button>',
        '            <button id="review-execute" class="review-execute-button" type="button" disabled>Execute selected</button>',
        '          </div>',
        '        </div>',
        '        <div id="review-basket-items" class="review-basket-items">',
        '          <div class="mini-panel-empty">No review items.</div>',
        '        </div>',
        '      </section>',
        '    </section>',
        '    <section id="vault-home-workspace" class="workspace-panel" data-workspace-panel="home" hidden></section>',
        '    <section id="suggestions-workspace" class="workspace-panel" data-workspace-panel="suggestions" hidden></section>',
        '    <section id="search-workspace" class="workspace-panel" data-workspace-panel="search" hidden></section>',
        '    <section id="session-log-workspace" class="workspace-panel" data-workspace-panel="sessionLog" hidden></section>',
        '  </section>',
        '  <div class="pane-resizer" data-resize="vault" title="Resize chat and vault" role="separator" aria-label="Resize chat and vault" aria-orientation="vertical"></div>',
        '  <aside class="vault-panel">',
        '    <section class="files-pane">',
        '      <div id="file-panel"></div>',
        '    </section>',
        '    <div class="pane-resizer" data-resize="files" title="Resize files and actions" role="separator" aria-label="Resize files and actions" aria-orientation="vertical"></div>',
        '    <aside id="selection-actions-panel" class="selection-actions-pane" data-future-slot="selection-actions" aria-label="Selection actions">',
        '      <div class="selection-actions-header ui-panel-header">',
        '        <span class="selection-actions-title ui-panel-header-label">Selection Actions</span>',
        '        <button type="button" class="selection-actions-collapse-toggle ui-tool-button" data-selection-actions-toggle aria-label="Collapse Selection Actions" title="Collapse Selection Actions" aria-expanded="true" aria-controls="selection-actions-panel"><span class="selection-actions-toggle-icon" aria-hidden="true"></span></button>',
        '      </div>',
        '      <div class="selection-actions-content">',
        '        <div class="selection-actions-empty">Select a file or folder.</div>',
        '      </div>',
        '    </aside>',
        '    <div class="pane-resizer" data-resize="actions" title="Resize Selection Actions and Preview" role="separator" aria-label="Resize Selection Actions and Preview" aria-orientation="vertical"></div>',
        '    <section class="preview-pane">',
        '      <div class="markdown-preview-shell">',
        '        <div class="markdown-preview-toolbar">',
        '          <div id="markdown-preview-title" class="markdown-preview-title" aria-live="polite"></div>',
        '          <button id="markdown-history-back" class="markdown-history-button ui-tool-button" type="button" title="Back" aria-label="Back in preview history" disabled>&lt;</button>',
        '          <button id="markdown-history-forward" class="markdown-history-button ui-tool-button" type="button" title="Forward" aria-label="Forward in preview history" disabled>&gt;</button>',
        '          <button id="markdown-reveal-current" class="markdown-reveal-current ui-tool-button" type="button" aria-label="Reveal current note in Files" title="Reveal current note in Files" disabled>Reveal in Files</button>',
        '          <button id="markdown-edit-toggle" class="markdown-edit-toggle ui-tool-button" type="button" aria-label="Edit Markdown source" title="Edit Markdown source" disabled>Edit</button>',
        '          <button id="markdown-propose-update" class="markdown-propose-update ui-tool-button" type="button" aria-label="Propose Markdown update" title="Propose Markdown update" disabled>Update</button>',
        '        </div>',
        '        <div id="markdown-editor-toolbar" class="markdown-editor-toolbar" role="toolbar" aria-label="Markdown formatting" hidden>',
        '          <button type="button" class="editor-format-button ui-tool-button" data-editor-format="bold" aria-label="Bold" title="Bold">B</button>',
        '          <button type="button" class="editor-format-button ui-tool-button" data-editor-format="italic" aria-label="Italic" title="Italic">I</button>',
        '          <button type="button" class="editor-format-button ui-tool-button" data-editor-format="strikethrough" aria-label="Strikethrough" title="Strikethrough">S</button>',
        '          <button type="button" class="editor-format-button ui-tool-button" data-editor-format="heading2" aria-label="Toggle heading level 2" title="Toggle heading level 2">H2</button>',
        '          <button type="button" class="editor-format-button ui-tool-button" data-editor-format="bulletList" aria-label="Toggle bullet list" title="Toggle bullet list">UL</button>',
        '          <button type="button" class="editor-format-button ui-tool-button" data-editor-format="orderedList" aria-label="Toggle numbered list" title="Toggle numbered list">OL</button>',
        '          <button type="button" class="editor-format-button ui-tool-button" data-editor-format="taskList" aria-label="Toggle task list" title="Toggle task list">Task</button>',
        '          <button type="button" class="editor-format-button ui-tool-button" data-editor-link-picker aria-label="Insert internal Markdown link" title="Insert internal Markdown link">Link</button>',
        '          <button type="button" class="editor-format-button ui-tool-button" data-editor-format="highlight" aria-label="Highlight" title="Highlight">Mark</button>',
        '        </div>',
        '        <div id="markdown-link-picker" hidden></div>',
        '        <article id="markdown-preview" class="markdown-preview" aria-label="Markdown preview">No file selected.</article>',
        '        <textarea id="markdown-source-editor" class="markdown-source-editor" spellcheck="false" aria-label="Markdown source editor" hidden></textarea>',
        '      </div>',
        '    </section>',
        '  </aside>',
        '</section>'
      ].join('');

      const status = document.createElement('footer');
      status.id = 'status-bar';
      status.className = 'status-bar';
      status.innerHTML = [
        '<button id="status-bar-global" class="status-bar-global status-bar-global-button" type="button" data-activity-drawer-toggle aria-label="Open session activity" aria-expanded="false" aria-controls="session-log-workspace" aria-live="polite" aria-atomic="true"></button>',
        '<div id="markdown-preview-status" class="markdown-preview-status is-empty" aria-live="polite" aria-atomic="true"></div>'
      ].join('');
      const globalStatus = status.querySelector('#status-bar-global');
      globalStatus.textContent = info.name + ' ' + info.version + ' - local first';

      app.appendChild(status);
      const startVersion = app.querySelector('[data-start-version]');
      if (startVersion) startVersion.textContent = 'v' + String(info.version || 'unavailable');

      root.appendChild(app);
      renderLeftNavigationIcons(app);
      wireShellInteractions(app);
      const workspaceState = createWorkspaceState();
      wireWorkspaceTabs(app, workspaceState);
      wireActivityDrawer(app, workspaceState);
      const activityState = createActivityState();
      const activityReporter = createActivityReporter({ status: globalStatus, activityState });
      const activityStatus = activityReporter.createStatusSink();
      app.__vincariosActivityState = activityState;
      const contextState = createContextState();
      const suggestionState = createSuggestionState();
      const panelLayoutState = createPanelLayoutState();
      await hydratePanelLayoutPreferences(api, panelLayoutState);
      app.__vincariosPanelLayoutState = panelLayoutState;
      let selectionActionsController = null;
      wireLeftNavigationPanelLayout(app, api, panelLayoutState, activityStatus);
      const filesPanelLayout = wireFilesPanelLayout(app, api, panelLayoutState, activityStatus);
      const requestSelectionActionsPanelExpand = wireSelectionActionsPanelLayout(app, api, panelLayoutState, activityStatus, () => {
        if (selectionActionsController && typeof selectionActionsController.closeOpenForms === 'function') selectionActionsController.closeOpenForms();
      });
      wireSuggestionIndicator(app, suggestionState);
      const updateFlashState = createUpdateFlashState();
      const vaultProfileState = window.VincariosVaultProfileState
        ? window.VincariosVaultProfileState.createVaultProfileState({ api })
        : null;
      const vaultUi = { filePanel: null, vaultProfileState, updateFlashState, themeController };
      const reviewExecution = window.VincariosReviewExecution.createReviewExecutionController({ api, vaultUi, activityReporter });
      const reviewBasket = mountOptional('review basket', activityStatus, () => window.VincariosReviewBasket
        ? window.VincariosReviewBasket.mountReviewBasket({ app, api, status: activityStatus, executeProposal: reviewExecution.executeProposal, onSnapshotChange: (snapshot) => renderReviewWorkspaceIndicator(app, snapshot) })
        : null);
      if (reviewBasket && typeof reviewBasket.getSnapshot === 'function') renderReviewWorkspaceIndicator(app, reviewBasket.getSnapshot());
      mountOptional('creation presets', activityStatus, () => window.VincariosCreationPresets && window.VincariosCreationPresets.mountCreationPresets({ app, api, reviewBasket, status: activityStatus, vaultProfileState }));
      wireVaultShell(api, app, contextState, vaultUi, reviewBasket, filesPanelLayout, activityReporter);

      mountOptional('provider status', activityStatus, () => window.VincariosProviderStatus && window.VincariosProviderStatus.mountProviderStatus({ api, app }));
      mountOptional('settings panel', activityStatus, () => window.VincariosSettingsPanel && window.VincariosSettingsPanel.mountSettingsPanel({ api, app, status: activityStatus, vaultProfileState, themeController }));
      mountOptional('workspace shortcuts', activityStatus, () => window.VincariosWorkspaceShortcuts && window.VincariosWorkspaceShortcuts.mountWorkspaceShortcuts({ app, workspaceState, appMenu: api && api.appMenu }));
      mountOptional('inbox cleanup', activityStatus, () => window.VincariosInboxCleanup && window.VincariosInboxCleanup.mountInboxCleanup({ api, app, status: activityStatus, reviewBasket, onOpenChat: () => workspaceState.setActiveWorkspace('chat') }));
      mountOptional('chat', activityStatus, () => window.VincariosChat && window.VincariosChat.mountChat({ api, app, status: activityStatus, activityReporter, reviewBasket, contextState }));
      mountOptional('context basket', activityStatus, () => window.VincariosContextBasket && window.VincariosContextBasket.mountContextBasket({ app, contextState, onActivate: (item) => revealContextItem(vaultUi, item) }));
      mountOptional('suggestions workspace', activityStatus, () => window.VincariosSuggestionsWorkspace && window.VincariosSuggestionsWorkspace.mountSuggestionsWorkspace({ root: app.querySelector('#suggestions-workspace'), suggestionState, reviewBasket, status: activityStatus, onOpenSuggestion: (path) => vaultUi.filePanel && vaultUi.filePanel.openMarkdownPath ? vaultUi.filePanel.openMarkdownPath(path) : { ok: false, message: 'File panel unavailable.' } }));
      mountOptional('search workspace', activityStatus, () => window.VincariosSearchWorkspace && window.VincariosSearchWorkspace.mountSearchWorkspace({ root: app.querySelector('#search-workspace'), api, status: activityStatus, onOpenResult: (path) => vaultUi.filePanel && vaultUi.filePanel.openMarkdownPreview ? vaultUi.filePanel.openMarkdownPreview(path) : { ok: false, message: 'File preview unavailable.' }, onRevealResult: (path) => vaultUi.filePanel && vaultUi.filePanel.revealPath ? vaultUi.filePanel.revealPath(path) : { ok: false, message: 'File panel unavailable.' } }));
      vaultUi.vaultHomeController = mountOptional('vault home', activityStatus, () => window.VincariosVaultHome && window.VincariosVaultHome.mountVaultHome({ root: app.querySelector('#vault-home-workspace'), api, workspaceState, onOpen: (path) => vaultUi.filePanel && vaultUi.filePanel.openMarkdownPreview ? vaultUi.filePanel.openMarkdownPreview(path) : { ok: false, message: 'File preview unavailable.' }, onReveal: (path) => vaultUi.filePanel && vaultUi.filePanel.revealPath ? vaultUi.filePanel.revealPath(path) : { ok: false, message: 'File panel unavailable.' }, onRevealFolder: (path) => vaultUi.filePanel && vaultUi.filePanel.revealFolder ? vaultUi.filePanel.revealFolder(path) : { ok: false, message: 'File panel unavailable.' }, onOpenReviewBasket: () => { if (workspaceState && typeof workspaceState.setActiveWorkspace === 'function') workspaceState.setActiveWorkspace('review'); if (reviewBasket && typeof reviewBasket.reveal === 'function') reviewBasket.reveal(); } }));
      mountOptional('session log', activityStatus, () => window.VincariosSessionLog && window.VincariosSessionLog.mountSessionLog({ root: app.querySelector('#session-log-workspace'), activityState }));
      selectionActionsController = mountOptional('selection actions', activityStatus, () => window.VincariosSelectionActions && window.VincariosSelectionActions.mountSelectionActions({ api, app, contextState, reviewBasket, status: activityStatus, suggestionState, onRequestPanelExpand: requestSelectionActionsPanelExpand, isTargetAvailable: () => filesPanelLayout.isCollapsed() !== true, openSourceEditor: (targetPath) => vaultUi.previewController && typeof vaultUi.previewController.openSource === 'function' ? vaultUi.previewController.openSource(targetPath) : false }));
      mountOptional('pane resize', activityStatus, () => window.VincariosPaneResize && window.VincariosPaneResize.mountPaneResize(app));
      mountOptional('scoped selection', activityStatus, () => window.VincariosScopedSelection && window.VincariosScopedSelection.mountScopedSelection({ app }));
    });
  }


  function createThemeController(api) {
    if (!window.VincariosThemeController || typeof window.VincariosThemeController.createThemeController !== 'function') {
      throw new Error('vincarios theme controller is not available.');
    }
    return window.VincariosThemeController.createThemeController({ api });
  }

  function createPanelLayoutState() {
    if (!window.VincariosPanelLayoutState || typeof window.VincariosPanelLayoutState.createPanelLayoutState !== 'function') {
      throw new Error('vincarios panel layout state is not available.');
    }
    return window.VincariosPanelLayoutState.createPanelLayoutState();
  }

  async function hydratePanelLayoutPreferences(api, panelLayoutState) {
    if (!api || !api.settings || typeof api.settings.get !== 'function') return;
    try {
      const settings = await api.settings.get();
      panelLayoutState.replace(settings && settings.layout && settings.layout.panels);
    } catch (error) {
      // The default open layout remains usable when app-local settings are unavailable.
    }
  }

  function wireLeftNavigationPanelLayout(app, api, panelLayoutState, status) {
    const navigation = app.querySelector('.left-nav');
    const toggle = app.querySelector('[data-left-nav-toggle]');
    if (!navigation || !toggle || !panelLayoutState) return;

    function apply(snapshot) {
      const collapsed = snapshot.leftNavCollapsed === true;
      app.classList.toggle('is-left-nav-collapsed', collapsed);
      toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      toggle.setAttribute('aria-label', collapsed ? 'Expand navigation' : 'Collapse navigation');
      toggle.title = collapsed ? 'Expand navigation' : 'Collapse navigation';
      if (collapsed) closeLeftNavigationSubactions(app);
      renderLeftNavigationToggleIcon(toggle, collapsed);
    }

    function setCollapsed(collapsed) {
      const snapshot = panelLayoutState.setPanelCollapsed('leftNav', collapsed);
      persistPanelLayoutPreference(api, panelLayoutState, status);
      return snapshot;
    }

    panelLayoutState.subscribe(apply);
    apply(panelLayoutState.snapshot());
    toggle.addEventListener('click', () => setCollapsed(!panelLayoutState.snapshot().leftNavCollapsed));
    navigation.querySelectorAll('[data-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        if (panelLayoutState.snapshot().leftNavCollapsed) setCollapsed(false);
      });
    });
  }

  function closeLeftNavigationSubactions(app) {
    app.querySelectorAll('.left-subactions').forEach((target) => {
      target.hidden = true;
    });
    app.querySelectorAll('[data-toggle][aria-controls]').forEach((button) => {
      button.setAttribute('aria-expanded', 'false');
    });
  }

  function renderLeftNavigationToggleIcon(toggle, collapsed) {
    const slot = toggle && toggle.querySelector('.left-nav-collapse-icon');
    if (!slot) return;
    slot.textContent = '';
    const renderer = getIconRenderer();
    const iconName = collapsed ? 'chevronRight' : 'chevronLeft';
    if (renderer && typeof renderer.createIconElement === 'function') {
      slot.appendChild(renderer.createIconElement(iconName, 'left-nav-collapse-icon-svg'));
      return;
    }
    slot.textContent = collapsed ? '>' : '<';
  }

  async function persistPanelLayoutPreference(api, panelLayoutState, status) {
    if (!api || !api.settings || typeof api.settings.setLayout !== 'function') return;
    try {
      const result = await api.settings.setLayout({ panels: panelLayoutState.snapshot() });
      if (result && result.ok === false && status) status.textContent = result.message || 'Could not save layout preference.';
    } catch (error) {
      if (status) status.textContent = 'Could not save layout preference.';
    }
  }
  function wireFilesPanelLayout(app, api, panelLayoutState, status) {
    const vaultPanel = app.querySelector('.vault-panel');
    const filesResizer = app.querySelector('[data-resize="files"]');
    let filePanel = null;
    if (!vaultPanel || !panelLayoutState) return { attachFilePanel() {}, requestExpand() {} };

    function apply(snapshot) {
      const collapsed = snapshot.filesCollapsed === true;
      vaultPanel.classList.toggle('is-files-collapsed', collapsed);
      if (filePanel && typeof filePanel.setCollapsed === 'function') filePanel.setCollapsed(collapsed);
      app.dispatchEvent(new CustomEvent('vincarios:files-collapse-change', { detail: { collapsed } }));
    }

    function setCollapsed(collapsed) {
      const snapshot = panelLayoutState.setPanelCollapsed('files', collapsed);
      persistPanelLayoutPreference(api, panelLayoutState, status);
      return snapshot;
    }

    if (filesResizer) {
      filesResizer.addEventListener('vincarios:panel-resize-start', () => {
        if (panelLayoutState.snapshot().filesCollapsed) setCollapsed(false);
      });
    }
    panelLayoutState.subscribe(apply);
    apply(panelLayoutState.snapshot());

    return {
      attachFilePanel(nextFilePanel) {
        filePanel = nextFilePanel || null;
        apply(panelLayoutState.snapshot());
      },
      requestExpand() {
        if (!panelLayoutState.snapshot().filesCollapsed) return;
        setCollapsed(false);
      },
      isCollapsed() {
        return panelLayoutState.snapshot().filesCollapsed === true;
      },
      toggle() {
        setCollapsed(!panelLayoutState.snapshot().filesCollapsed);
      }
    };
  }
  function wireSelectionActionsPanelLayout(app, api, panelLayoutState, status, onBeforeCollapse) {
    const vaultPanel = app.querySelector('.vault-panel');
    const toggle = app.querySelector('[data-selection-actions-toggle]');
    const actionsResizer = app.querySelector('[data-resize="actions"]');
    if (!vaultPanel || !toggle || !panelLayoutState) return function noop() {};

    function apply(snapshot) {
      const collapsed = snapshot.selectionActionsCollapsed === true;
      vaultPanel.classList.toggle('is-selection-actions-collapsed', collapsed);
      toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      toggle.setAttribute('aria-label', collapsed ? 'Expand Selection Actions' : 'Collapse Selection Actions');
      toggle.title = collapsed ? 'Expand Selection Actions' : 'Collapse Selection Actions';
      renderSelectionActionsToggleIcon(toggle, collapsed);
    }


    function setCollapsed(collapsed) {
      if (collapsed && typeof onBeforeCollapse === 'function') onBeforeCollapse();
      const snapshot = panelLayoutState.setPanelCollapsed('selectionActions', collapsed);
      persistPanelLayoutPreference(api, panelLayoutState, status);
      return snapshot;
    }

    if (actionsResizer) {
      actionsResizer.addEventListener('vincarios:panel-resize-start', () => {
        if (panelLayoutState.snapshot().selectionActionsCollapsed) setCollapsed(false);
      });
    }
    panelLayoutState.subscribe(apply);
    apply(panelLayoutState.snapshot());
    toggle.addEventListener('click', () => setCollapsed(!panelLayoutState.snapshot().selectionActionsCollapsed));

    return function requestSelectionActionsPanelExpand() {
      if (!panelLayoutState.snapshot().selectionActionsCollapsed) return;
      setCollapsed(false);
    };
  }


  function renderSelectionActionsToggleIcon(toggle, collapsed) {
    const slot = toggle && toggle.querySelector('.selection-actions-toggle-icon');
    if (!slot) return;
    slot.textContent = '';
    const renderer = getIconRenderer();
    const iconName = collapsed ? 'chevronRight' : 'chevronLeft';
    if (renderer && typeof renderer.createIconElement === 'function') {
      slot.appendChild(renderer.createIconElement(iconName, 'selection-actions-toggle-icon-svg'));
      return;
    }
    slot.textContent = collapsed ? '<' : '>';
  }
  function createWorkspaceState() {
    if (!window.VincariosWorkspaceState) return null;
    return window.VincariosWorkspaceState.createWorkspaceState();
  }

  function createSuggestionState() {
    if (!window.VincariosSuggestionState) return null;
    return window.VincariosSuggestionState.createSuggestionState();
  }

  function createActivityState() {
    if (!window.VincariosActivityState) return null;
    return window.VincariosActivityState.createActivityState();
  }

  function createActivityReporter(options) {
    if (!window.VincariosActivityReporter || typeof window.VincariosActivityReporter.createActivityReporter !== 'function') return null;
    return window.VincariosActivityReporter.createActivityReporter(options);
  }

  function createUpdateFlashState() {
    if (!window.VincariosUpdateFlashState || typeof window.VincariosUpdateFlashState.createUpdateFlashState !== 'function') return null;
    return window.VincariosUpdateFlashState.createUpdateFlashState({ normalizePath });
  }

  function wireActivityDrawer(app, workspaceState) {
    if (!app || !workspaceState || typeof workspaceState.snapshot !== 'function') return;
    const toggle = app.querySelector('[data-activity-drawer-toggle]');
    if (!toggle) return;
    let previousWorkspace = 'chat';

    function render(snapshot) {
      const active = snapshot && snapshot.activeWorkspace ? snapshot.activeWorkspace : 'chat';
      const isOpen = active === 'sessionLog';
      if (!isOpen) previousWorkspace = active;
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Close session activity' : 'Open session activity');
    }

    toggle.addEventListener('click', () => {
      const active = workspaceState.snapshot().activeWorkspace;
      workspaceState.setActiveWorkspace(active === 'sessionLog' ? previousWorkspace : 'sessionLog');
    });
    workspaceState.subscribe(render);
    render(workspaceState.snapshot());
  }

  function renderReviewWorkspaceIndicator(app, snapshot) {
    if (!app) return;
    const badge = app.querySelector('[data-review-count]');
    const button = app.querySelector('[data-workspace-tab="review"]');
    const items = snapshot && Array.isArray(snapshot.items) ? snapshot.items : [];
    const openCount = items.filter((item) => item && item.status === 'open').length;
    if (badge) {
      badge.hidden = openCount === 0;
      badge.textContent = String(openCount);
    }
    if (button) button.setAttribute('aria-label', 'Review Basket' + (openCount ? ', ' + openCount + ' open item' + (openCount === 1 ? '' : 's') : ''));
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
    if (!window.VincariosContextState) return null;
    return window.VincariosContextState.createContextState();
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
    if (!window.VincariosPermissionState) return null;
    return window.VincariosPermissionState.createPermissionState({
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
      if (button.querySelector('.left-button-icon')) return;
      const iconName = button.getAttribute('data-left-icon');
      if (!iconName) return;
      if (!button.title) button.title = button.getAttribute('aria-label') || '';
      button.prepend(renderer.createIconElement(iconName, 'left-button-icon'));
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
    return (typeof window !== 'undefined' && window.VincariosIconRenderer) ? window.VincariosIconRenderer : null;
  }
  function addPreviewUpdateProposal(reviewBasket, statusBar, proposal, contextState, permissionState) {
    const permission = validatePreviewUpdatePermission(proposal, contextState, permissionState);
    if (!permission.ok) {
      setText(statusBar, permission.message);
      return permission;
    }
    if (!reviewBasket || typeof reviewBasket.upsertOpenManualUpdateProposal !== 'function') {
      return { ok: false, message: 'Review Basket unavailable.' };
    }
    const item = reviewBasket.upsertOpenManualUpdateProposal(proposal);
    const refreshed = item && item.replaced === true;
    setText(statusBar, refreshed ? 'Update proposal refreshed in Review Basket.' : 'Update proposal added to Review Basket.');
    return { ok: true, refreshed };
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
    return getVaultPathApi().normalizeRelativePath(value);
  }

  function getVaultPathApi() {
    if (typeof window !== 'undefined' && window.VincariosVaultPath) return window.VincariosVaultPath;
    if (typeof require === 'function') return require('../path/vaultPath');
    throw new Error('Vault path contract unavailable.');
  }
  function revealContextItem(vaultUi, item) {
    const filePanel = vaultUi && vaultUi.filePanel;
    if (!item || !filePanel) return;
    if (item.kind === 'file' && typeof filePanel.revealPath === 'function') filePanel.revealPath(item.path);
    if ((item.kind === 'folder' || item.kind === 'folder_snapshot') && typeof filePanel.revealFolder === 'function') filePanel.revealFolder(item.path);
  }
  async function getAppInfo(api) {
    if (api && typeof api.appInfo === 'function') {
      try {
        return await api.appInfo();
      } catch (error) {
        return { name: 'vincarios', version: 'unavailable' };
      }
    }
    return { name: 'vincarios', version: '0.1.0-beta.1' };
  }

  function wireVaultShell(api, app, contextState, vaultUi, reviewBasket, filesPanelLayout, activityReporter) {
    const openButtons = app.querySelectorAll('[data-open-vault]');
    const filePanelRoot = app.querySelector('#file-panel');
    const rawStatusBar = app.querySelector('#status-bar-global');
    const statusBar = activityReporter && typeof activityReporter.createStatusSink === 'function'
      ? activityReporter.createStatusSink()
      : rawStatusBar;
    let filePanel = null;
    const previewController = window.VincariosMarkdownPreview
      ? window.VincariosMarkdownPreview.mountMarkdownPreview({
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
    if (vaultUi) vaultUi.previewController = previewController;
    const permissionState = createPermissionState(statusBar);

    if (!api || !api.vault) {
      setText(statusBar, 'Vault API unavailable.');
    } else if (!window.VincariosFilePanel) {
      setText(statusBar, 'File panel unavailable.');
    } else {
      filePanel = window.VincariosFilePanel.mountFilePanel({
        api,
        root: filePanelRoot,
        previewController,
        status: statusBar,
        activityReporter,
        contextState,
        permissionState,
        updateFlashState: vaultUi && vaultUi.updateFlashState,
        vaultProfileState: vaultUi && vaultUi.vaultProfileState,
        onToggleCollapse: filesPanelLayout && filesPanelLayout.toggle,
        onRequestExpand: filesPanelLayout && filesPanelLayout.requestExpand,
        onRecentFileRecorded: () => {
          const controller = vaultUi && vaultUi.vaultHomeController;
          if (controller && typeof controller.refreshRecentFiles === 'function') return controller.refreshRecentFiles();
          return null;
        }
      });
      if (filesPanelLayout && typeof filesPanelLayout.attachFilePanel === 'function') filesPanelLayout.attachFilePanel(filePanel);
      if (vaultUi) vaultUi.filePanel = filePanel;
    }

    const startupScreen = window.VincariosStartup && typeof window.VincariosStartup.mountStartupScreen === 'function'
      ? window.VincariosStartup.mountStartupScreen({ app, api, onOpenRecent: openRecentVault })
      : null;

    async function completeVaultOpen(root) {
      const vaultName = baseName(root);
      if (activityReporter && typeof activityReporter.report === 'function') {
        activityReporter.report({
          message: 'Vault opened.',
          activity: { type: 'success', action: 'Vault opened', targetPath: vaultName || 'Vault', detail: '' }
        });
      } else {
        setText(statusBar, 'Vault opened.');
      }
      app.classList.remove('is-start');
      filePanel.setVaultName(vaultName || 'Vault');
      await filePanel.openRoot();
      if (reviewBasket && typeof reviewBasket.restore === 'function') await reviewBasket.restore();
      refreshVaultThemeOverride(vaultUi);
      if (startupScreen && typeof startupScreen.recordRecentVault === 'function') {
        try {
          await startupScreen.recordRecentVault(root);
        } catch (error) {
          // A local recent-history write must not make a successfully opened vault fail.
        }
      }
    }

    async function openRecentVault(root) {
      if (!api || !api.vault || typeof api.vault.setRoot !== 'function') {
        setText(statusBar, 'Vault API unavailable.');
        return;
      }
      if (!filePanel) {
        setText(statusBar, 'File panel unavailable.');
        return;
      }

      setText(statusBar, 'Opening recent vault...');
      const opened = await api.vault.setRoot(root);
      if (!opened || !opened.ok) {
        setText(statusBar, (opened && opened.message) || 'Recent vault is unavailable.');
        return;
      }
      await completeVaultOpen(opened.root || root);
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

      await completeVaultOpen(selected.root);

    }));
  }

  function refreshVaultThemeOverride(vaultUi) {
    const controller = vaultUi && vaultUi.themeController;
    const profileState = vaultUi && vaultUi.vaultProfileState;
    if (!controller || typeof controller.setVaultAppearance !== 'function') return;
    const appearance = profileState && typeof profileState.getThemeAppearance === 'function'
      ? profileState.getThemeAppearance()
      : { themeOverride: 'inherit', themePackId: 'default' };
    controller.setVaultAppearance(appearance);
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
    window.VincariosShell = Object.freeze({ mountShell });
  }
})();
