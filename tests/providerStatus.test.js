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