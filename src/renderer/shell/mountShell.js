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
    app.className = 'app-shell';
    app.innerHTML = [
      '<aside class="left-nav">',
      '  <div class="brand">ZEUS Agent</div>',
      '  <button id="open-vault" type="button">Open Vault</button>',
      '  <button type="button">New Project</button>',
      '  <button type="button">Inbox Review</button>',
      '  <button type="button">Review</button>',
      '  <button type="button">Settings</button>',
      '</aside>',
      '<section class="main-workspace">',
      '  <div class="chat-placeholder">Chat history</div>',
      '  <div class="review-placeholder">Review Basket</div>',
      '  <div id="context-bar" class="context-placeholder">Context: no vault open</div>',
      '  <div class="input-placeholder">Input field</div>',
      '</section>',
      '<aside class="vault-panel">',
      '  <div class="files-placeholder">',
      '    <div class="panel-title">Vault files</div>',
      '    <div id="file-list" class="file-list muted">Open a vault to list files.</div>',
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
    const openButton = app.querySelector('#open-vault');
    const fileList = app.querySelector('#file-list');
    const preview = app.querySelector('#markdown-preview');
    const contextBar = app.querySelector('#context-bar');
    const statusBar = app.querySelector('#status-bar');

    if (!api || !api.vault) {
      setText(statusBar, 'Vault API unavailable.');
      return;
    }

    openButton.addEventListener('click', async () => {
      setText(statusBar, 'Opening vault...');
      const selected = await api.vault.selectFolder();
      if (!selected.ok) {
        setText(statusBar, selected.message || 'Vault selection cancelled.');
        return;
      }
      setText(contextBar, 'Vault: ' + selected.root);
      setText(statusBar, 'Vault opened.');
      await renderFolder(api, fileList, preview, statusBar, '');
    });
  }

  async function renderFolder(api, fileList, preview, statusBar, folderPath) {
    const result = await api.vault.listFolder(folderPath || '');
    fileList.innerHTML = '';
    if (!result.ok) {
      fileList.className = 'file-list error';
      fileList.textContent = result.message || 'Could not list folder.';
      return;
    }

    fileList.className = 'file-list';
    if (!result.entries.length) {
      fileList.className = 'file-list muted';
      fileList.textContent = 'No Markdown files or visible folders here.';
      return;
    }

    result.entries.forEach((entry) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'file-row file-row-' + entry.kind;
      button.textContent = (entry.kind === 'folder' ? '▸ ' : '• ') + entry.name;
      button.addEventListener('click', async () => {
        if (entry.kind === 'folder') {
          setText(statusBar, 'Listing ' + entry.path + '...');
          await renderFolder(api, fileList, preview, statusBar, entry.path);
          setText(statusBar, 'Folder listed: ' + entry.path);
        } else {
          setText(statusBar, 'Reading ' + entry.path + '...');
          const read = await api.vault.readMarkdown(entry.path);
          if (!read.ok) {
            setText(preview, read.message || 'Could not read file.');
            setText(statusBar, 'Read failed.');
            return;
          }
          setText(preview, read.content);
          setText(statusBar, 'Read: ' + read.path);
        }
      });
      fileList.appendChild(button);
    });
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