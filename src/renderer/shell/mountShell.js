(function() {
  'use strict';

  async function mountShell(root, api) {
    if (!root) return;

    let info = { name: 'ZEUS Agent', version: '0.1.0' };
    if (api && typeof api.appInfo === 'function') {
      try {
        info = await api.appInfo();
      } catch (error) {
        info = { name: 'ZEUS Agent', version: 'unavailable' };
      }
    }

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
      '<aside class="left-nav">',
      '  <div class="brand">ZEUS Agent</div>',
      '  <button type="button" data-open-vault>Open Vault</button>',
      '  <button type="button">New Project</button>',
      '  <button type="button">Inbox Review</button>',
      '  <button type="button">Review</button>',
      '  <button type="button">Settings</button>',
      '</aside>',
      '<section class="main-workspace">',
      '  <div class="workspace-stack">',
      '    <div class="chat-placeholder">Chat history</div>',
      '    <div class="review-placeholder">Review Basket</div>',
      '    <div id="context-bar" class="context-placeholder">Context: no vault open</div>',
      '    <div class="input-placeholder">Input field</div>',
      '  </div>',
      '</section>',
      '<aside class="vault-panel">',
      '  <div class="files-placeholder">',
      '    <div class="panel-title">Vault files</div>',
      '    <div id="file-panel"></div>',
      '  </div>',
      '  <div class="preview-placeholder">',
      '    <div class="panel-title">Markdown preview</div>',
      '    <pre id="markdown-preview" class="markdown-preview">No file selected.</pre>',
      '  </div>',
      '</aside>'
    ].join('');

    const status = document.createElement('footer');
    status.id = 'status-bar';
    status.className = 'status-bar';
    status.textContent = info.name + ' ' + info.version + ' - local first';

    app.appendChild(status);
    root.appendChild(app);
    wireVaultShell(api, app);
  }

  function wireVaultShell(api, app) {
    const openButtons = app.querySelectorAll('[data-open-vault]');
    const filePanelRoot = app.querySelector('#file-panel');
    const preview = app.querySelector('#markdown-preview');
    const contextBar = app.querySelector('#context-bar');
    const statusBar = app.querySelector('#status-bar');

    if (!api || !api.vault || !window.ZeusFilePanel) {
      setText(statusBar, 'Vault API unavailable.');
      return;
    }

    const filePanel = window.ZeusFilePanel.mountFilePanel({
      api,
      root: filePanelRoot,
      preview,
      status: statusBar,
      context: contextBar
    });

    openButtons.forEach((openButton) => openButton.addEventListener('click', async () => {
      setText(statusBar, 'Opening vault...');
      const selected = await api.vault.selectFolder();
      if (!selected.ok) {
        setText(statusBar, selected.message || 'Vault selection cancelled.');
        return;
      }
      setText(contextBar, 'Vault: ' + selected.root);
      setText(statusBar, 'Vault opened.');
      app.classList.remove('is-start');
      await filePanel.openRoot();
    }));
  }

  function setText(node, value) {
    if (node) node.textContent = value;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { mountShell };
  }

  if (typeof window !== 'undefined') {
    window.ZeusShell = Object.freeze({ mountShell });
  }
})();
