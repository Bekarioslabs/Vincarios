'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { IPC_CHANNELS } = require('../src/shared/ipc/channels');
const { registerTemplateIpc } = require('../src/main/ipc/registerTemplateIpc');

test('template IPC delegates one reviewed plan to the main-owned service', async () => {
  const handlers = new Map();
  const calls = [];
  registerTemplateIpc({
    handle(channel, handler) {
      handlers.set(channel, handler);
    }
  }, {
    createFromReview(payload) {
      calls.push(payload);
      return { ok: true, action: 'create_from_template' };
    }
  });

  const payload = { targetPath: '02_Projects/Atlas', files: [] };
  const result = await handlers.get(IPC_CHANNELS.TEMPLATE_CREATE_FROM_REVIEW)(null, payload);

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [payload]);
});

test('template IPC fails closed when the service is unavailable', async () => {
  const handlers = new Map();
  registerTemplateIpc({
    handle(channel, handler) {
      handlers.set(channel, handler);
    }
  }, null);

  const result = await handlers.get(IPC_CHANNELS.TEMPLATE_CREATE_FROM_REVIEW)(null, {});

  assert.equal(result.ok, false);
  assert.equal(result.code, 'template_service_unavailable');
});
