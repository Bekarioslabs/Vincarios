(function() {
  'use strict';

  function mountStartupScreen(options) {
    options = options || {};
    const app = options.app;
    const api = options.api || {};
    const root = app && app.querySelector ? app.querySelector('[data-startup-screen]') : null;
    const onOpenRecent = typeof options.onOpenRecent === 'function' ? options.onOpenRecent : async () => {};
    if (!root) return null;

    let recentVaults = [];
    root.addEventListener('click', async (event) => {
      const button = event.target && event.target.closest ? event.target.closest('button[data-startup-action]') : null;
      if (!button) return;
      const path = String(button.dataset.vaultPath || '');
      if (button.dataset.startupAction === 'remove-recent') {
        await removeRecent(path);
        return;
      }
      if (button.dataset.startupAction === 'open-recent' && path) {
        button.disabled = true;
        try {
          await onOpenRecent(path);
        } finally {
          button.disabled = false;
        }
      }
    });

    async function refresh() {
      const settings = api.settings && typeof api.settings.get === 'function' ? await api.settings.get() : null;
      recentVaults = normalizeRecentVaults(settings && settings.startup && settings.startup.recentVaults);
      renderRecentVaults(root.querySelector('[data-startup-recent]'), recentVaults);
      const status = api.provider && typeof api.provider.status === 'function' ? await safeProviderStatus(api.provider) : null;
      renderProviderPreview(root.querySelector('[data-startup-providers]'), status && status.providers);
    }

    async function recordRecentVault(rootPath) {
      const entry = createRecentVault(rootPath);
      if (!entry.path) return;
      recentVaults = normalizeRecentVaults([entry].concat(recentVaults));
      await persistRecentVaults();
      renderRecentVaults(root.querySelector('[data-startup-recent]'), recentVaults);
    }

    async function removeRecent(rootPath) {
      recentVaults = recentVaults.filter((entry) => entry.path !== rootPath);
      await persistRecentVaults();
      renderRecentVaults(root.querySelector('[data-startup-recent]'), recentVaults);
    }

    async function persistRecentVaults() {
      if (!api.settings || typeof api.settings.setRecentVaults !== 'function') return;
      await api.settings.setRecentVaults({ recentVaults });
    }

    refresh().catch(() => {
      renderRecentVaults(root.querySelector('[data-startup-recent]'), recentVaults);
      renderProviderPreview(root.querySelector('[data-startup-providers]'), []);
    });

    return Object.freeze({ refresh, recordRecentVault, removeRecent });
  }

  function renderRecentVaults(root, entries) {
    if (!root || typeof document === 'undefined') return;
    root.innerHTML = '';
    const heading = document.createElement('h2');
    heading.textContent = 'Recent Vaults';
    root.appendChild(heading);
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'startup-empty';
      empty.textContent = 'No recent vaults yet.';
      root.appendChild(empty);
      return;
    }
    entries.forEach((entry) => {
      const row = document.createElement('div');
      row.className = 'startup-recent-row';
      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'startup-recent-open';
      open.dataset.startupAction = 'open-recent';
      open.dataset.vaultPath = entry.path;
      open.title = entry.path;
      open.setAttribute('aria-label', 'Reopen vault ' + entry.name);
      appendIcon(open, 'folder');
      const text = document.createElement('span');
      text.className = 'startup-recent-copy';
      const name = document.createElement('strong');
      name.textContent = entry.name;
      const path = document.createElement('span');
      path.textContent = entry.path;
      text.append(name, path);
      open.appendChild(text);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'startup-recent-remove ui-tool-button';
      remove.dataset.startupAction = 'remove-recent';
      remove.dataset.vaultPath = entry.path;
      remove.title = 'Remove from recent vaults';
      remove.setAttribute('aria-label', 'Remove ' + entry.name + ' from recent vaults');
      appendIcon(remove, 'close');
      row.append(open, remove);
      root.appendChild(row);
    });
  }

  function renderProviderPreview(root, providers) {
    if (!root || typeof document === 'undefined') return;
    root.innerHTML = '';
    const heading = document.createElement('h2');
    heading.textContent = 'Local Providers';
    root.appendChild(heading);
    const known = [
      { id: 'lm-studio', label: 'LM Studio' },
      { id: 'ollama', label: 'Ollama' }
    ];
    known.forEach((knownProvider) => {
      const provider = Array.isArray(providers) ? providers.find((item) => item && item.id === knownProvider.id) : null;
      const available = provider && provider.available === true;
      const row = document.createElement('div');
      row.className = 'startup-provider-row';
      const dot = document.createElement('span');
      dot.className = 'startup-provider-dot' + (available ? ' is-online' : '');
      dot.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.textContent = knownProvider.label;
      const state = document.createElement('span');
      state.textContent = available ? 'Online' : 'Offline';
      row.append(dot, label, state);
      root.appendChild(row);
    });
  }

  function appendIcon(root, iconName) {
    const renderer = typeof window !== 'undefined' ? window.VitruviosIconRenderer : null;
    if (renderer && typeof renderer.createIconElement === 'function') {
      root.appendChild(renderer.createIconElement(iconName, 'startup-icon'));
    }
  }

  function createRecentVault(rootPath) {
    const path = normalizePath(rootPath);
    return { path, name: baseName(path), lastOpenedAt: new Date().toISOString() };
  }

  function normalizeRecentVaults(entries) {
    const seen = new Set();
    return (Array.isArray(entries) ? entries : []).map((entry) => ({
      path: normalizePath(entry && entry.path),
      name: String(entry && entry.name || '').trim(),
      lastOpenedAt: String(entry && entry.lastOpenedAt || '').trim()
    })).filter((entry) => {
      if (!entry.path || seen.has(entry.path)) return false;
      seen.add(entry.path);
      entry.name = entry.name || baseName(entry.path);
      return true;
    }).slice(0, 2);
  }

  function normalizePath(value) {
    return String(value || '').trim().replace(/\\/g, '/').replace(/\/+$/g, '');
  }

  function baseName(value) {
    const parts = normalizePath(value).split('/');
    return parts[parts.length - 1] || 'Vault';
  }

  async function safeProviderStatus(providerApi) {
    try {
      return await providerApi.status();
    } catch (error) {
      return null;
    }
  }

  const api = { mountStartupScreen, normalizeRecentVaults, createRecentVault };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosStartup = Object.freeze(api);
})();