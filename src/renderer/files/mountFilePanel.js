(function() {
  'use strict';

  function mountFilePanel(options) {
    options = options || {};
    const api = options.api;
    const root = options.root;
    const previewController = options.previewController || null;
    const status = options.status;
    const context = options.context;
    const contextState = options.contextState || null;
    const permissionState = options.permissionState || null;
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
      '  <button id="file-refresh" class="file-refresh-button" type="button" disabled title="Refresh file tree" aria-label="Refresh file tree"></button>',
      '</div>',
      '<div id="file-breadcrumb" class="file-breadcrumb">Vault root</div>',
      '<div id="file-tree" class="file-tree muted">Open a vault to list files.</div>'
    ].join('');

    const refreshButton = root.querySelector('#file-refresh');
    const breadcrumb = root.querySelector('#file-breadcrumb');
    const tree = root.querySelector('#file-tree');
    const vaultName = root.querySelector('#file-vault-name');

    refreshButton.addEventListener('click', refreshTree);

    function setVaultName(name) {
      setText(vaultName, name || 'Vault');
    }

    async function openRoot() {
      refreshButton.disabled = false;
      navigator.openFolder('');
      await ensureFolderLoaded('');
      renderTree();
    }

    async function refreshTree() {
      refreshButton.disabled = true;
      entriesByFolder.clear();
      const expandedFolders = Object.keys(navigator.snapshot().expandedFolders).filter((folderPath) => navigator.isExpanded(folderPath));
      await ensureFolderLoaded('');
      for (const folderPath of expandedFolders) {
        await ensureFolderLoaded(folderPath);
      }
      refreshButton.disabled = false;
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
        const row = document.createElement('div');
        row.setAttribute('role', 'button');
        row.tabIndex = 0;
        row.className = 'file-row file-row-' + entry.kind;
        row.dataset.path = entry.path;
        row.style.setProperty('--tree-depth', String(depth));

        const icon = document.createElement('span');
        icon.className = 'file-row-icon';
        icon.classList.toggle('is-folder', entry.kind === 'folder');
        icon.classList.toggle('is-file', entry.kind !== 'folder');
        icon.classList.toggle('is-expanded', entry.kind === 'folder' && navigator.isExpanded(entry.path));

        const label = document.createElement('span');
        label.className = 'file-row-label';
        label.textContent = entry.name;

        row.appendChild(createPermissionControls(entry.path));
        row.appendChild(icon);
        row.appendChild(label);

        const selected = navigator.snapshot().selectedPath === entry.path;
        if (selected) row.classList.add('is-selected');

        row.addEventListener('click', () => activateEntry(entry));
        row.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            activateEntry(entry);
          }
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

    async function activateEntry(entry) {
      if (entry.kind === 'folder') {
        navigator.toggleFolder(entry.path);
        if (contextState) contextState.setFolder(entry.path, { readAllowed: canUsePathAsContext(entry.path) });
        else setText(context, 'Context folder: ' + entry.path + '/');
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
        setPreviewMessage(read.message || 'Could not read file.');
        setStatus('Read failed.');
        return;
      }
      setPreviewSource(read.content, read.path);
      if (contextState) contextState.setFile(read.path, createContextDetails(read.path, read.content));
      else setText(context, 'Context file: ' + read.path);
      setStatus('Read: ' + read.path);
    }
    async function openLinkedMarkdown(target, currentPath) {
      const resolver = window.ZeusMarkdownLinkResolver;
      if (!resolver || !resolver.createMarkdownLinkCandidates) {
        return { ok: false, message: 'Markdown link resolver unavailable.' };
      }

      const candidates = resolver.createMarkdownLinkCandidates(target, currentPath);
      if (!candidates.length) return { ok: false, message: 'Linked target is not an internal Markdown note.' };

      for (const candidate of candidates) {
        const read = await api.vault.readMarkdown(candidate);
        if (read.ok) {
          navigator.selectFile(read.path);
          setPreviewSource(read.content, read.path);
          if (contextState) contextState.setFile(read.path, createContextDetails(read.path, read.content));
          else setText(context, 'Context file: ' + read.path);
          setStatus('Opened linked note: ' + read.path);
          return { ok: true, path: read.path };
        }
      }

      return { ok: false, message: 'Linked note not found: ' + target };
    }

    async function revealPath(path) {
      const normalizedPath = window.ZeusFileNavigator.normalizePath(path || '');
      if (!normalizedPath) return { ok: false, message: 'No preview file to reveal.' };

      const folders = ancestorFolders(normalizedPath);
      for (const folder of folders) {
        navigator.expandFolder(folder);
        await ensureFolderLoaded(folder);
      }
      navigator.selectFile(normalizedPath);
      renderTree();
      setStatus('Revealed in Files: ' + normalizedPath);
      return { ok: true, path: normalizedPath };
    }

    function ancestorFolders(path) {
      const parent = window.ZeusFileNavigator.parentFolder(path);
      if (!parent) return [''];
      const parts = parent.split('/').filter(Boolean);
      const folders = [''];
      for (let index = 0; index < parts.length; index += 1) {
        folders.push(parts.slice(0, index + 1).join('/'));
      }
      return folders;
    }
    function createContextDetails(path, content) {
      const parentFolder = window.ZeusFileNavigator.parentFolder(path);
      return {
        content,
        readAllowed: canUsePathAsContext(path),
        parentReadAllowed: parentFolder ? canUsePathAsContext(parentFolder) : canUsePathAsContext('')
      };
    }

    function syncSelectedContextPermission() {
      if (!contextState || typeof contextState.snapshot !== 'function') return;
      const selected = contextState.snapshot();
      if (!selected.path) return;
      if (selected.kind === 'folder') {
        contextState.setFolder(selected.path, { readAllowed: canUsePathAsContext(selected.path) });
        return;
      }
      if (selected.kind === 'file') contextState.setFile(selected.path, createContextDetails(selected.path, selected.content));
    }

    function canUsePathAsContext(path) {
      if (!permissionState || typeof permissionState.resolve !== 'function') return false;
      return permissionState.resolve(path).read === true;
    }

    function permissionCandidates(path) {
      const normalized = window.ZeusFileNavigator.normalizePath(path || '');
      if (!normalized) return [''];
      const parts = normalized.split('/').filter(Boolean);
      const candidates = [normalized];
      for (let count = parts.length - 1; count > 0; count -= 1) {
        candidates.push(parts.slice(0, count).join('/'));
      }
      candidates.push('');
      return candidates;
    }
    function createPermissionControls(path) {
      const controls = document.createElement('span');
      controls.className = 'file-permission-controls';

      const readButton = createPermissionButton('R', 'Toggle read permission', async (event) => {
        if (!permissionState) return null;
        const next = !permissionState.resolve(path).read;
        if (event.shiftKey) return setPermissionRecursively(path, 'read', next);
        if (event.ctrlKey) return permissionState.setReadForPaths(knownVisibleDescendantPaths(path), next);
        return permissionState.toggleRead(path);
      });
      const writeButton = createPermissionButton('W', 'Toggle write permission', async (event) => {
        if (!permissionState) return null;
        const next = !permissionState.resolve(path).write;
        if (event.shiftKey) return setPermissionRecursively(path, 'write', next);
        if (event.ctrlKey) return permissionState.setWriteForPaths(knownVisibleDescendantPaths(path), next);
        return permissionState.toggleWrite(path);
      });

      controls.appendChild(readButton);
      controls.appendChild(writeButton);
      updatePermissionButtons(path, readButton, writeButton);
      return controls;
    }

    async function setPermissionRecursively(path, flag, enabled) {
      const paths = await recursiveDescendantPaths(path);
      if (flag === 'read') permissionState.setReadForPaths(paths, enabled);
      else permissionState.setWriteForPaths(paths, enabled);

      setStatus(
        (enabled ? 'Enabled ' : 'Disabled ') +
        flag +
        ' permission for ' +
        paths.length +
        ' entr' +
        (paths.length === 1 ? 'y.' : 'ies.')
      );
      return paths;
    }

    async function recursiveDescendantPaths(path) {
      const normalizedPath = window.ZeusFileNavigator.normalizePath(path || '');
      const collector = window.ZeusPermissionPathCollector;
      if (!collector || !collector.collectRecursivePermissionPaths) return knownVisibleDescendantPaths(normalizedPath);

      return collector.collectRecursivePermissionPaths(normalizedPath, async (folderPath) => {
        await ensureFolderLoaded(folderPath);
        const folderData = entriesByFolder.get(window.ZeusFileNavigator.normalizePath(folderPath || ''));
        if (!folderData || !folderData.ok) return { ok: false, entries: [] };
        return { ok: true, entries: folderData.entries || [] };
      });
    }

    function knownVisibleDescendantPaths(path) {
      const normalizedPath = window.ZeusFileNavigator.normalizePath(path || '');
      const paths = new Set([normalizedPath]);
      collectVisibleDescendants(normalizedPath, paths);
      return Array.from(paths);
    }

    function collectVisibleDescendants(folderPath, paths) {
      const folderData = entriesByFolder.get(folderPath);
      if (!folderData || !folderData.ok) return;

      folderData.entries.forEach((entry) => {
        paths.add(entry.path);
        if (entry.kind === 'folder' && navigator.isExpanded(entry.path)) collectVisibleDescendants(entry.path, paths);
      });
    }

    function createPermissionButton(label, title, toggle) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'file-permission-button';
      button.textContent = label;
      button.title = title;
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        button.disabled = true;
        try {
          await toggle(event);
        } finally {
          button.disabled = false;
          syncSelectedContextPermission();
          renderTree();
        }
      });
      return button;
    }
    function updatePermissionButtons(path, readButton, writeButton) {
      const permissions = permissionState
        ? permissionState.resolve(path)
        : { read: false, write: false, readState: 'off', writeState: 'off' };
      updatePermissionButtonState(readButton, permissions.read, permissions.readState);
      updatePermissionButtonState(writeButton, permissions.write, permissions.writeState);
    }

    function updatePermissionButtonState(button, enabled, state) {
      button.classList.toggle('is-active', enabled === true && state === 'direct');
      button.classList.toggle('is-inherited', enabled === true && state === 'inherited');
      button.setAttribute('aria-pressed', String(enabled === true));
      button.dataset.permissionState = state || 'off';
    }
    function updateNavigation(state) {
      const parts = state.breadcrumb.length
        ? state.breadcrumb.map((part) => part.label).join(' / ')
        : 'Vault root';
      breadcrumb.textContent = state.selectedKind === 'markdown'
        ? parts + ' / ' + state.selectedPath.split('/').pop()
        : parts;
    }

    function setPreviewSource(content, path) {
      if (previewController && previewController.setSource) previewController.setSource(content, path);
    }

    function setPreviewMessage(message) {
      if (previewController && previewController.setMessage) previewController.setMessage(message);
    }

    function setStatus(value) {
      setText(status, value);
    }

    return {
      openRoot,
      refreshTree,
      renderTree,
      ensureFolderLoaded,
      setVaultName,
      openLinkedMarkdown,
      revealPath,
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
