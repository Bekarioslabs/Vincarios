(function() {
  'use strict';

  function mountVaultHome(options) {
    const input = options || {};
    const root = input.root;
    const api = input.api;
    const workspaceState = input.workspaceState;
    const onOpen = typeof input.onOpen === 'function' ? input.onOpen : null;
    const onReveal = typeof input.onReveal === 'function' ? input.onReveal : null;
    const onOpenReviewBasket = typeof input.onOpenReviewBasket === 'function' ? input.onOpenReviewBasket : null;
    if (!root || !api || !api.vault || typeof api.vault.listRecentFiles !== 'function' || typeof api.vault.listFolder !== 'function') return null;

    const state = {
      files: [],
      message: 'Open a Markdown vault to see recent files.',
      inventory: null,
      health: null,
      rootItems: [],
      rootItemsExpanded: false
    };

    async function refresh() {
      const results = await Promise.all([
        safeCall(() => api.vault.listRecentFiles(), { ok: false, message: 'Recent files are unavailable.' }),
        safeCall(() => api.vault.getInventory(), { ok: false, message: 'Vault inventory is unavailable.' }),
        safeCall(() => api.indexes && api.indexes.getHealth(), { ok: false, message: 'Index status is unavailable.' }),
        safeCall(() => api.vault.listFolder(''), { ok: false, message: 'Vault root is unavailable.' })
      ]);
      applyRecentFiles(results[0]);
      state.inventory = results[1] && results[1].ok !== false ? results[1] : null;
      state.health = results[2] && results[2].ok !== false ? results[2] : null;
      applyRootItems(results[3]);
      render();
      return results[0];
    }

    async function refreshRecentFiles() {
      const response = await safeCall(() => api.vault.listRecentFiles(), { ok: false, message: 'Recent files are unavailable.' });
      applyRecentFiles(response);
      if (isHomeActive()) render();
      return response;
    }
    function applyRecentFiles(response) {
      if (!response || response.ok === false) {
        state.files = [];
        state.message = response && response.message || 'Recent files are unavailable.';
        return;
      }
      state.files = Array.isArray(response.files) ? response.files : [];
      state.message = state.files.length ? '' : 'No recent Markdown files in this vault yet.';
    }

    function applyRootItems(response) {
      if (!response || response.ok === false) {
        state.rootItems = [];
        state.rootItemsExpanded = false;
        return;
      }
      state.rootItems = (Array.isArray(response.entries) ? response.entries : [])
        .filter((entry) => entry && (entry.kind === 'markdown' || entry.kind === 'image') && !String(entry.path || '').includes('/'));
      if (!state.rootItems.length) state.rootItemsExpanded = false;
    }

    function render() {
      root.innerHTML = '';
      root.classList.add('vault-home-workspace');
      root.append(createHeader(), createHealthSection(), createQuickActions(), createRecentSection());
    }

    function createHeader() {
      const header = document.createElement('div');
      header.className = 'vault-home-header';
      header.textContent = 'Vault Home';
      return header;
    }

    function createHealthSection() {
      const section = createSection('vault-home-health', 'Vault Health');
      const inventory = document.createElement('p');
      inventory.className = 'vault-home-inventory';
      inventory.textContent = formatInventory(state.inventory);
      const indexStatus = document.createElement('div');
      indexStatus.className = 'vault-home-index-status ' + getIndexTone(state.health);
      const dot = document.createElement('span');
      dot.className = 'vault-home-index-dot';
      dot.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.textContent = getIndexLabel(state.health);
      indexStatus.append(dot, label);
      const hint = document.createElement('p');
      hint.className = 'vault-home-health-hint';
      hint.textContent = 'Manage indexes in Settings.';
      section.append(inventory, createRootItemsDisclosure(), indexStatus, hint);
      return section;
    }

    function createRootItemsDisclosure() {
      if (!state.rootItems.length) return document.createDocumentFragment();
      const wrapper = document.createElement('div');
      wrapper.className = 'vault-home-root-items';
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'vault-home-root-items-toggle';
      toggle.textContent = 'Unassigned root items: ' + state.rootItems.length;
      toggle.setAttribute('aria-expanded', String(state.rootItemsExpanded));
      toggle.setAttribute('aria-label', toggle.textContent + '. ' + (state.rootItemsExpanded ? 'Hide list.' : 'Show list.'));
      toggle.addEventListener('click', () => {
        state.rootItemsExpanded = !state.rootItemsExpanded;
        render();
      });
      wrapper.appendChild(toggle);
      if (state.rootItemsExpanded) {
        const list = document.createElement('div');
        list.className = 'vault-home-root-items-list';
        state.rootItems.forEach((file) => list.appendChild(createVaultFileRow(file, 'root-item')));
        wrapper.appendChild(list);
      }
      return wrapper;
    }

    function createQuickActions() {
      const section = createSection('vault-home-quick-actions', 'Quick Actions');
      const actions = document.createElement('div');
      actions.className = 'vault-home-quick-action-list';
      actions.append(
        createQuickAction('Search Vault', 'Search indexed vault information.', () => activateWorkspace('search')),
        createQuickAction('Open Review Basket', 'Continue reviewed work and recent execution history.', openReviewBasket),
        createQuickAction('Open Chat', 'Continue in the chat workspace.', () => activateWorkspace('chat'))
      );
      section.appendChild(actions);
      return section;
    }

    function createQuickAction(label, description, onClick) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'vault-home-quick-action ui-flat-row';
      button.textContent = label;
      button.title = description;
      button.setAttribute('aria-label', label + '. ' + description);
      button.addEventListener('click', onClick);
      return button;
    }

    function createRecentSection() {
      const section = createSection('vault-home-recent', 'Recent Files');
      if (!state.files.length) {
        const empty = document.createElement('div');
        empty.className = 'vault-home-empty';
        empty.textContent = state.message;
        section.appendChild(empty);
      } else {
        const list = document.createElement('div');
        list.className = 'vault-home-recent-list';
        state.files.forEach((file) => list.appendChild(createVaultFileRow(file, 'recent')));
        section.appendChild(list);
      }
      return section;
    }

    function createSection(className, headingText) {
      const section = document.createElement('section');
      section.className = className;
      const heading = document.createElement('h2');
      heading.textContent = headingText;
      section.appendChild(heading);
      return section;
    }

    function createVaultFileRow(file, type) {
      const row = document.createElement('article');
      row.className = type === 'root-item' ? 'vault-home-root-item-row' : 'vault-home-recent-row';
      const open = document.createElement('button');
      open.type = 'button';
      open.className = type === 'root-item' ? 'vault-home-root-item-open' : 'vault-home-recent-open';
      open.title = 'Open in Preview';
      open.setAttribute('aria-label', 'Open ' + file.path + ' in Preview');
      const title = document.createElement('span');
      title.className = type === 'root-item' ? 'vault-home-root-item-title' : 'vault-home-recent-title';
      title.textContent = basename(file.path);
      const titleLine = document.createElement('span');
      titleLine.className = 'vault-home-file-heading';
      const renderer = typeof window !== 'undefined' ? window.VincariosIconRenderer : null;
      if (renderer && typeof renderer.createIconElement === 'function') {
        titleLine.appendChild(renderer.createIconElement(file.kind === 'image' ? 'image' : 'markdownFile', 'vault-home-file-type-icon'));
      }
      titleLine.appendChild(title);
      const filePath = document.createElement('span');
      filePath.className = type === 'root-item' ? 'vault-home-root-item-path' : 'vault-home-recent-path';
      filePath.textContent = file.path;
      open.append(titleLine, filePath);
      open.addEventListener('click', async () => {
        const response = onOpen ? await onOpen(file.path) : { ok: false };
        if (!response || response.ok === false) {
          const refreshed = await refresh();
          if (refreshed && refreshed.ok !== false && state.files.some((item) => item.path === file.path)) {
            state.message = response && response.message || 'Could not open the recent note.';
            render();
          }
          return;
        }
        await refresh();
      });

      const reveal = document.createElement('button');
      reveal.type = 'button';
      reveal.className = 'vault-home-recent-reveal ui-tool-button';
      reveal.title = 'Reveal in Files';
      reveal.setAttribute('aria-label', 'Reveal ' + file.path + ' in Files');
      if (renderer && typeof renderer.createIconElement === 'function') reveal.appendChild(renderer.createIconElement('folder', 'vault-home-recent-reveal-icon'));
      else reveal.textContent = 'Reveal';
      reveal.addEventListener('click', async () => {
        const response = onReveal ? await onReveal(file.path) : { ok: false };
        if (!response || response.ok === false) {
          state.message = response && response.message || 'Could not reveal the recent note.';
          render();
        }
      });
      row.append(open, reveal);
      return row;
    }

    function activateWorkspace(name) {
      if (workspaceState && typeof workspaceState.setActiveWorkspace === 'function') workspaceState.setActiveWorkspace(name);
    }

    function openReviewBasket() {
      if (onOpenReviewBasket) onOpenReviewBasket();
    }

    function isHomeActive() {
      if (!workspaceState || typeof workspaceState.snapshot !== 'function') return true;
      return workspaceState.snapshot().activeWorkspace === 'home';
    }

    if (workspaceState && typeof workspaceState.subscribe === 'function') {
      workspaceState.subscribe((snapshot) => {
        if (snapshot && snapshot.activeWorkspace === 'home') refresh();
      });
    }
    if (typeof api.vault.onChanged === 'function') {
      api.vault.onChanged(() => {
        if (isHomeActive()) refresh();
      });
    }
    if (api.indexes && typeof api.indexes.onHealthChanged === 'function') {
      api.indexes.onHealthChanged((health) => {
        state.health = health && health.ok !== false ? health : null;
        if (isHomeActive()) render();
      });
    }
    render();
    return Object.freeze({ refresh, refreshRecentFiles });
  }

  async function safeCall(action, fallback) {
    try {
      const result = await action();
      return result || fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function formatInventory(inventory) {
    if (!inventory) return 'Vault inventory is unavailable.';
    const parts = [
      formatCount(inventory.markdown, 'Markdown note'),
      formatCount(inventory.images, 'image'),
      formatCount(inventory.pdfs, 'PDF'),
      formatCount(inventory.otherFiles, 'other file'),
      formatCount(inventory.folders, 'folder')
    ];
    return parts.filter((part) => part.indexOf('0 ') !== 0).join(' Â· ') || 'Empty vault';
  }

  function formatCount(value, label) {
    const count = Number(value) || 0;
    return count + ' ' + label + (count === 1 ? '' : 's');
  }

  function getIndexTone(health) {
    const state = health && health.state;
    if (state === 'ready') return 'is-ready';
    if (state === 'stale' || state === 'rebuild_required' || state === 'indexing') return 'is-stale';
    return 'is-missing';
  }

  function getIndexLabel(health) {
    const state = health && health.state;
    if (state === 'ready') return 'Indexes are up to date.';
    if (state === 'indexing') return 'Indexes are updating.';
    if (state === 'stale' || state === 'rebuild_required') return 'Indexes need refresh.';
    if (state === 'no_index') return 'Indexes have not been built.';
    return 'Index status is unavailable.';
  }

  function basename(value) {
    const parts = String(value || '').split('/');
    return parts[parts.length - 1] || String(value || 'Untitled note');
  }

  const api = Object.freeze({ mountVaultHome, basename, formatInventory, getIndexLabel, getIndexTone });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosVaultHome = api;
})();
