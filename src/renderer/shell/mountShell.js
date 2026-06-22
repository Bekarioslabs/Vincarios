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
      '  <button type="button">New Project</button>',
      '  <button type="button">Inbox Review</button>',
      '  <button type="button">Review</button>',
      '  <button type="button">Settings</button>',
      '</aside>',
      '<section class="main-workspace">',
      '  <div class="chat-placeholder">Chat history</div>',
      '  <div class="review-placeholder">Review Basket</div>',
      '  <div class="context-placeholder">Context: none</div>',
      '  <div class="input-placeholder">Input field</div>',
      '</section>',
      '<aside class="vault-panel">',
      '  <div class="files-placeholder">Vault files</div>',
      '  <div class="preview-placeholder">Markdown preview</div>',
      '</aside>'
    ].join('');

    const status = document.createElement('footer');
    status.className = 'status-bar';
    status.textContent = info.name + ' ' + info.version + ' - local first';

    app.appendChild(status);
    root.appendChild(app);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { mountShell };
  }

  if (typeof window !== 'undefined') {
    window.ZeusShell = Object.freeze({ mountShell });
  }
})();