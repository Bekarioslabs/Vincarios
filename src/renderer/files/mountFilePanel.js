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
    const entriesByFolder = new Map();
    const loadingFolders = new Set();

    if (!root) return null;

    root.innerHTML = [
      '<div class="file-toolbar">',
      '  <div class="file-title-wrap">',
      '    <div class="file-label">Files</div>',
      '    <div id="file-vault-name" class="file-vault-name">No vault</div>',
      '  </div>',
      '  <button id="file-refresh" class="file-refresh-button" type="button" disabled title="Refresh file tree">↻</button>',
      '</div>',
      '<div id="file-breadcrumb" class="file-breadcrumb">Vault root</div>',
      '<div id="file-tree" class="file-tree muted">Open a vault to list files.</div>'
    ].join('');

    const refreshButton = root.querySelector('#file-refresh');
    const breadcrumb = root.querySelector('#file-breadcrumb');
    const tree = root.querySelector('#file-tree');
    const vaultName = root.querySelector('#file-vault-name');

    refreshButton.addEventListener('click', async () => {
      entriesByFolder.clear();
      await openRoot();
    });

    function setVaultName(name) {
      setText(vaultName, name || 'Vault');
    }

    async function openRoot() {
      refreshButton.disabled = false;
      navigator.openFolder('');
      await ensureFolderLoaded('');
      renderTree();
    }

    async function ensureFolderLoaded(folderPath) {
      const normalized = window.ZeusFileNavigator.normalizePath(folderPath || '');
      if (entriesByFolder.has(normalized) || loadingFolders.has(normalized)) return;
      if (!api || !api.vault) {
        setStatus('Vault API unavailable.');
        return;
      }

      loadingFolders.add(normalized);
      const result = await api.vault.listFolder(normalized);
      loadingFolders.delete(normalized);

      if (!result.ok) {
        entriesByFolder.set(normalized, { ok: false, message: result.message || 'Could not list folder.', entries: [] });
        return;
      }

      entriesByFolder.set(normalized, { ok: true, entries: result.entries || [] });
    }

    function renderTree() {
      const state = navigator.snapshot();
      updateNavigation(state);
      tree.innerHTML = '';
      tree.className = 'file-tree';

      const rootData = entriesByFolder.get('');
      if (!rootData) {
        tree.className = 'file-tree muted';
        tree.textContent = 'Open a vault to list files.';
        return;
      }

      if (!rootData.ok) {
        tree.className = 'file-tree error';
        tree.textContent = rootData.message;
        return;
      }

      if (!rootData.entries.length) {
        tree.className = 'file-tree muted';
        tree.textContent = 'No Markdown files or visible folders here.';
        return;
      }

      renderEntries(rootData.entries, 0, tree);
    }

    function renderEntries(entries, depth, parentNode) {
      entries.forEach((entry) => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'file-row file-row-' + entry.kind;
        row.dataset.path = entry.path;
        row.style.setProperty('--tree-depth', String(depth));

        const icon = document.createElement('span');
        icon.className = 'file-row-icon';
        icon.textContent = entry.kind === 'folder'
          ? (navigator.isExpanded(entry.path) ? '▾' : '▸')
          : '•';

        const label = document.createElement('span');
        label.className = 'file-row-label';
        label.textContent = entry.name;

        row.appendChild(icon);
        row.appendChild(label);

        const selected = navigator.snapshot().selectedPath === entry.path;
        if (selected) row.classList.add('is-selected');

        row.addEventListener('click', async () => {
          if (entry.kind === 'folder') {
            navigator.toggleFolder(entry.path);
            if (navigator.isExpanded(entry.path)) {
              setStatus('Listing ' + entry.path + '...');
              await ensureFolderLoaded(entry.path);
              setStatus('Folder listed: ' + entry.path);
            }
            renderTree();
            return;
          }

          navigator.selectFile(entry.path);
          updateNavigation(navigator.snapshot());
          renderTree();
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
        });

        parentNode.appendChild(row);

        if (entry.kind === 'folder' && navigator.isExpanded(entry.path)) {
          const childData = entriesByFolder.get(entry.path);
          if (childData && childData.ok) {
            renderEntries(childData.entries, depth + 1, parentNode);
          } else if (childData && !childData.ok) {
            const error = document.createElement('div');
            error.className = 'file-tree-inline-error';
            error.style.setProperty('--tree-depth', String(depth + 1));
            error.textContent = childData.message;
            parentNode.appendChild(error);
          } else if (loadingFolders.has(entry.path)) {
            const loading = document.createElement('div');
            loading.className = 'file-tree-inline-muted';
            loading.style.setProperty('--tree-depth', String(depth + 1));
            loading.textContent = 'Loading...';
            parentNode.appendChild(loading);
          }
        }
      });
    }

    function updateNavigation(state) {
      const parts = state.breadcrumb.length
        ? state.breadcrumb.map((part) => part.label).join(' / ')
        : 'Vault root';
      breadcrumb.textContent = state.selectedKind === 'markdown'
        ? parts + ' / ' + state.selectedPath.split('/').pop()
        : parts;
    }

    function setStatus(value) {
      setText(status, value);
    }

    return {
      openRoot,
      renderTree,
      ensureFolderLoaded,
      setVaultName,
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
