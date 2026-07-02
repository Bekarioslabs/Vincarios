'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createProviderStatusService } = require('../src/main/providers/providerStatusService');
const { registerProviderIpc } = require('../src/main/ipc/registerProviderIpc');
const { IPC_CHANNELS } = require('../src/shared/ipc/channels');
const { setProviderStatus } = require('../src/renderer/providers/mountProviderStatus');

test('provider status service reports LM Studio unavailable when health check fails', async () => {
  const service = createProviderStatusService({
    providers: [
      {
        id: 'lm-studio',
        label: 'LM Studio',
        baseUrl: 'http://127.0.0.1:1234',
        healthPath: '/v1/models'
      }
    ],
    fetchImpl: async () => {
      throw new Error('connection refused');
    }
  });

  const status = await service.getStatus();

  assert.equal(status.activeProvider.id, 'lm-studio');
  assert.equal(status.activeProvider.label, 'LM Studio');
  assert.equal(status.activeProvider.available, false);
  assert.equal(status.activeProvider.baseUrl, 'http://127.0.0.1:1234');
  assert.match(status.activeProvider.message, /unavailable/i);
});

test('provider status service reports provider online after successful health check', async () => {
  const service = createProviderStatusService({
    providers: [
      {
        id: 'lm-studio',
        label: 'LM Studio',
        baseUrl: 'http://127.0.0.1:1234',
        healthPath: '/v1/models'
      }
    ],
    fetchImpl: async (url) => ({
      ok: true,
      status: 200,
      url
    })
  });

  const status = await service.getStatus();

  assert.equal(status.activeProvider.available, true);
  assert.equal(status.activeProvider.message, 'Provider online');
  assert.equal(status.activeProvider.healthUrl, 'http://127.0.0.1:1234/v1/models');
});

test('provider IPC exposes status through a provider-specific channel', async () => {
  const handlers = new Map();
  const ipcMain = {
    handle(channel, handler) {
      handlers.set(channel, handler);
    }
  };
  const service = {
    async getStatus() {
      return {
        activeProvider: {
          id: 'lm-studio',
          label: 'LM Studio',
          available: true,
          message: 'Provider online'
        }
      };
    }
  };

  registerProviderIpc(ipcMain, service);

  assert.equal(handlers.size, 1);
  assert.equal(handlers.has(IPC_CHANNELS.PROVIDER_STATUS), true);
  assert.deepEqual(await handlers.get(IPC_CHANNELS.PROVIDER_STATUS)(), {
    activeProvider: {
      id: 'lm-studio',
      label: 'LM Studio',
      available: true,
      message: 'Provider online'
    }
  });
});
test('provider status view updates the status chip without owning provider checks', () => {
  const toggles = [];
  const nodes = {
    statusPill: { dataset: {}, title: '' },
    statusDot: { classList: { toggle(name, enabled) { toggles.push({ name, enabled }); } } },
    statusLabel: { textContent: '' },
    providerName: { textContent: '' }
  };

  setProviderStatus(nodes, {
    label: 'LM Studio',
    available: true,
    message: 'Provider online'
  });

  assert.equal(nodes.statusPill.dataset.providerStatus, 'online');
  assert.equal(nodes.statusPill.title, 'Provider online');
  assert.equal(nodes.statusLabel.textContent, 'Provider online');
  assert.equal(nodes.providerName.textContent, 'LM Studio');
  assert.deepEqual(toggles, [{ name: 'ok', enabled: true }]);
});
test('provider IPC exposes model list and provider/model selection channels', async () => {
  const handlers = new Map();
  const ipcMain = {
    handle(channel, handler) {
      handlers.set(channel, handler);
    }
  };
  const statusService = { async getStatus() { return { ok: true }; } };
  const modelService = {
    async listModels(payload) { return { ok: true, payload, models: [{ id: 'auto' }] }; },
    setActiveProvider(providerId) { return { ok: true, providerId }; },
    setSelectedModel(providerId, model) { return { ok: true, providerId, model }; }
  };

  registerProviderIpc(ipcMain, statusService, modelService);

  assert.equal(handlers.has(IPC_CHANNELS.PROVIDER_MODELS), true);
  assert.equal(handlers.has(IPC_CHANNELS.PROVIDER_SET_ACTIVE), true);
  assert.equal(handlers.has(IPC_CHANNELS.PROVIDER_SET_MODEL), true);
  assert.deepEqual(await handlers.get(IPC_CHANNELS.PROVIDER_MODELS)(null, { providerId: 'lm-studio' }), {
    ok: true,
    payload: { providerId: 'lm-studio' },
    models: [{ id: 'auto' }]
  });
  assert.deepEqual(await handlers.get(IPC_CHANNELS.PROVIDER_SET_ACTIVE)(null, { providerId: 'lm-studio' }), {
    ok: true,
    providerId: 'lm-studio'
  });
  assert.deepEqual(await handlers.get(IPC_CHANNELS.PROVIDER_SET_MODEL)(null, { providerId: 'lm-studio', model: 'model-a' }), {
    ok: true,
    providerId: 'lm-studio',
    model: 'model-a'
  });
});
test('provider status view populates provider and model dropdown state', () => {
  const providerSelect = {};
  const modelSelect = {};
  const nodes = {
    statusPill: { dataset: {}, title: '' },
    statusDot: { classList: { toggle() {} } },
    statusLabel: { textContent: '' },
    providerSelect,
    modelSelect
  };
  const { setProviderModels } = require('../src/renderer/providers/mountProviderStatus');

  setProviderStatus(nodes, {
    id: 'lm-studio',
    label: 'LM Studio',
    available: true,
    message: 'Provider online'
  }, [
    { id: 'lm-studio', label: 'LM Studio' }
  ]);
  setProviderModels(nodes, {
    selectedModel: 'model-b',
    models: [{ id: 'auto', label: 'Auto' }, { id: 'model-b', label: 'model-b' }]
  });

  assert.equal(providerSelect.value, 'lm-studio');
  assert.deepEqual(providerSelect.optionsData, [{ id: 'lm-studio', label: 'LM Studio' }]);
  assert.equal(modelSelect.value, 'model-b');
  assert.deepEqual(modelSelect.optionsData, [{ id: 'auto', label: 'Auto' }, { id: 'model-b', label: 'model-b' }]);
});
test('provider status refresh button rechecks status without changing provider', async () => {
  const events = new Map();
  const refreshButton = {
    disabled: false,
    addEventListener(name, handler) { events.set(name, handler); }
  };
  const providerSelect = { value: 'lm-studio', innerHTML: '', appendChild() {}, addEventListener(name, handler) { events.set('provider-' + name, handler); } };
  const modelSelect = { value: 'auto', innerHTML: '', appendChild() {}, addEventListener(name, handler) { events.set('model-' + name, handler); } };
  const nodes = {
    statusPill: { dataset: {}, title: '' },
    statusDot: { classList: { toggle() {} } },
    statusLabel: { textContent: '' },
    providerSelect,
    modelSelect,
    refreshButton
  };
  const app = {
    querySelector(selector) {
      return {
        '#provider-status': nodes.statusPill,
        '#provider-dot': nodes.statusDot,
        '#provider-status-label': nodes.statusLabel,
        '#provider-select': nodes.providerSelect,
        '#provider-model-select': nodes.modelSelect,
        '#provider-refresh': nodes.refreshButton
      }[selector] || null;
    }
  };
  let statusCalls = 0;
  let setActiveCalls = 0;
  const api = {
    provider: {
      async status() {
        statusCalls += 1;
        return {
          activeProvider: { id: 'lm-studio', label: 'LM Studio', available: true, message: 'Provider online' },
          providers: [{ id: 'lm-studio', label: 'LM Studio', available: true }]
        };
      },
      async models() { return { selectedModel: 'auto', models: [{ id: 'auto', label: 'Auto' }] }; },
      async setActive() { setActiveCalls += 1; }
    }
  };
  const { mountProviderStatus } = require('../src/renderer/providers/mountProviderStatus');

  await mountProviderStatus({ api, app });
  await events.get('click')();

  assert.equal(statusCalls, 2);
  assert.equal(setActiveCalls, 0);
  assert.equal(refreshButton.disabled, false);
});