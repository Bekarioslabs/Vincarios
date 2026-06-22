(function() {
  'use strict';

  function mountFilePanel(options) {
    options = options || {};
    const api = options.api;
    const root = options.root;
    const preview = options.preview;
    const status = options.status;
    const context = options.context;
    const navigator = options.navigator || window.ZeusFileNavigator.createFileNavigator();

    if (!root) return null;

    root.innerHTML = [
      '<div class="file-toolbar">',
      '  <button id="file-back" type="button" disabled>Back</button>',
      '  <div id="file-breadcrumb" class="file-breadcrumb">Vault root</div>',
      '</div>',
      '<div id="file-list" class="file-list muted">Open a vault to list files.</div>'
    ].join('');

    const backButton = root.querySelector('#file-back');
    const breadcrumb = root.querySelector('#file-breadcrumb');
    const list = root.querySelector('#file-list');

    backButton.addEventListener('click', async () => {
      const state = navigator.goBack();
      await renderFolder(state.currentFolder);
    });

    async function openRoot() {
      navigator.openFolder('');
      await renderFolder('');
    }

    async function renderFolder(folderPath) {
      if (!api || !api.vault) {
        setStatus('Vault API unavailable.');
        return;
      }

      const result = await api.vault.listFolder(folderPath || '');
      list.innerHTML = '';
      if (!result.ok) {
        list.className = 'file-list error';
        list.textContent = result.message || 'Could not list folder.';
        updateNavigation();
        return;
      }

      navigator.openFolder(result.folder || '');
      updateNavigation();

      list.className = 'file-list';
      if (!result.entries.length) {
        list.className = 'file-list muted';
        list.textContent = 'No Markdown files or visible folders here.';
        return;
      }

      result.entries.forEach((entry) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'file-row file-row-' + entry.kind;
        button.textContent = (entry.kind === 'folder' ? '▸ ' : '• ') + entry.name;
        button.addEventListener('click', async () => {
          if (entry.kind === 'folder') {
            setStatus('Listing ' + entry.path + '...');
            await renderFolder(entry.path);
            setStatus('Folder listed: ' + entry.path);
          } else {
            navigator.selectFile(entry.path);
            updateNavigation();
            setStatus('Reading ' + entry.path + '...');
            const read = await api.vault.readMarkdown(entry.path);
            if (!read.ok) {
              setText(preview, read.message || 'Could not read file.');
              setStatus('Read failed.');
              return;
            }
            setText(preview, read.content);
            setText(context, 'Context target: ' + read.path);
            setStatus('Read: ' + read.path);
          }
        });
        list.appendChild(button);
      });
    }

    function updateNavigation() {
      const state = navigator.snapshot();
      backButton.disabled = !state.canGoBack;
      breadcrumb.textContent = state.breadcrumb.length
        ? state.breadcrumb.map((part) => part.label).join(' / ')
        : 'Vault root';
    }

    function setStatus(value) {
      setText(status, value);
    }

    return {
      openRoot,
      renderFolder,
      navigator
    };
  }

  function setText(node, value) {
    if (node) node.textContent = value;
  }

  const api = { mountFilePanel };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusFilePanel = Object.freeze(api);
})();