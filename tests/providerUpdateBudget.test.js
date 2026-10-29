'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createProviderChatService } = require('../src/main/providers/providerChatService');

function fixture({ providerId = 'lm-studio', metadata, capacity = 32768, finish = 'stop', selectedModel } = {}) {
  const calls = [];
  const model = providerId === 'ollama' ? 'gemma:latest' : 'local-model';
  const service = createProviderChatService({
    activeProviderId: providerId,
    selectedModels: { [providerId]: selectedModel || model },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      const data = options.method === 'GET'
        ? metadata || (providerId === 'ollama'
          ? { models: [{ name: model, context_length: capacity }] }
          : { models: [{ type: 'llm', key: model, max_context_length: 999999,
            loaded_instances: [{ id: 'loaded-instance', config: { context_length: capacity } }] }] })
        : providerId === 'ollama'
          ? { message: { content: 'answer' }, done_reason: finish }
          : { choices: [{ message: { content: 'answer' }, finish_reason: finish }] };
      return { ok: true, json: async () => data };
    }
  });
  return { service, calls };
}

const request = (content = 'Update the entire note.') => ({
  purpose: 'whole_note_update', messages: [{ role: 'system', content: 'Return JSON.' }, { role: 'user', content }]
});

test('whole-note update blocks an unloaded model before generation despite its theoretical maximum', async () => {
  const { service, calls } = fixture({ metadata: { models: [{ type: 'llm', key: 'local-model', max_context_length: 999999, loaded_instances: [] }] } });
  const result = await service.sendChat(request());
  assert.equal(result.ok, false);
  assert.equal(result.code, 'update_budget_unknown');
  assert.equal(calls.some((call) => call.options.method === 'POST'), false);
});

test('whole-note update includes response reserve and rejects an otherwise character-valid request', async () => {
  const { service, calls } = fixture({ capacity: 4096 });
  const result = await service.sendChat(request('x'.repeat(3000)));
  assert.equal(result.code, 'update_budget_exceeded');
  assert.equal(result.budget.state, 'too_large');
  assert.equal(calls.some((call) => call.options.method === 'POST'), false);
});

for (const providerId of ['lm-studio', 'ollama']) {
  test(providerId + ' preflights loaded capacity and bounds generation without growing context', async () => {
    const { service, calls } = fixture({ providerId });
    const check = await service.checkUpdateBudget(request());
    assert.equal(check.ok, true);
    assert.equal(check.budget.state, 'fits');
    assert.equal(check.budget.contextTokens, 32768);
    assert.equal(check.budget.responseReserveTokens, 1024);
    assert.equal(calls.length, 1);
    const result = await service.sendChat(request());
    assert.equal(result.ok, true);
    assert.equal(calls.length, 3);
    const body = JSON.parse(calls[2].options.body);
    if (providerId === 'ollama') {
      assert.equal(body.options.num_ctx, 32768);
      assert.equal(body.options.num_predict, 1024);
    } else {
      assert.equal(body.model, 'loaded-instance');
      assert.equal(body.max_tokens, 1024);
    }
  });

  test(providerId + ' rejects explicit length-truncated output even if it looks parseable', async () => {
    const { service } = fixture({ providerId, finish: 'length' });
    const result = await service.sendChat(request());
    assert.equal(result.ok, false);
    assert.equal(result.code, 'update_response_truncated');
  });
}

test('ordinary chat keeps its original single request and has no added output cap', async () => {
  const { service, calls } = fixture();
  const result = await service.sendChat({ messages: request().messages });
  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(JSON.parse(calls[0].options.body).max_tokens, undefined);
});

test('multiple loaded instances are ambiguous unless the exact instance was selected', async () => {
  const { service } = fixture({ metadata: { models: [{ type: 'llm', key: 'local-model',
    loaded_instances: [{ id: 'a', config: { context_length: 32768 } }, { id: 'b', config: { context_length: 4096 } }] }] } });
  assert.equal((await service.sendChat(request())).code, 'update_budget_unknown');
});

test('preflight estimates all UTF-8 messages, not only the last note or character count', async () => {
  const { service } = fixture();
  const result = await service.checkUpdateBudget(request('ä'.repeat(1000)));
  assert.equal(result.budget.estimatedInputTokens, Buffer.byteLength('Return JSON.') + 32 + 2000 + 32);
  assert.equal(result.budget.estimated, true);
});

test('a canceled preflight never calls the provider', async () => {
  const { service, calls } = fixture();
  const controller = new AbortController();
  controller.abort();
  const result = await service.checkUpdateBudget(request(), { signal: controller.signal });
  assert.equal(result.canceled, true);
  assert.equal(calls.length, 0);
});

test('generation rechecks allocation rather than trusting a previous successful preflight', async () => {
  const metadata = { models: [{ type: 'llm', key: 'local-model', loaded_instances: [{ id: 'instance', config: { context_length: 32768 } }] }] };
  const { service, calls } = fixture({ metadata });
  assert.equal((await service.checkUpdateBudget(request())).ok, true);
  metadata.models[0].loaded_instances[0].config.context_length = 1024;
  assert.equal((await service.sendChat(request())).code, 'update_budget_exceeded');
  assert.equal(calls.some((call) => call.options.method === 'POST'), false);
});

test('selecting an exact LM loaded instance disambiguates other allocations', async () => {
  const { service, calls } = fixture({ selectedModel: 'instance-b', metadata: { models: [{ type: 'llm', key: 'local-model',
    loaded_instances: [{ id: 'instance-a', config: { context_length: 1024 } }, { id: 'instance-b', config: { context_length: 32768 } }] }] } });
  assert.equal((await service.sendChat(request())).ok, true);
  assert.equal(JSON.parse(calls[1].options.body).model, 'instance-b');
});

for (const capacity of [null, '32768', 1.5, 0, -1]) {
  test('invalid observed context ' + String(capacity) + ' cannot use the theoretical model maximum', async () => {
    const { service, calls } = fixture({ capacity });
    assert.equal((await service.sendChat(request())).code, 'update_budget_unknown');
    assert.equal(calls.some((call) => call.options.method === 'POST'), false);
  });
}

test('metadata HTTP or JSON failure blocks only whole-note updates', async () => {
  for (const mode of ['http', 'json', 'network']) {
    let posts = 0;
    const service = createProviderChatService({ selectedModels: { 'lm-studio': 'local-model' },
      fetchImpl: async (_url, options) => {
        if (options.method === 'POST') { posts++; return { ok: true, json: async () => ({ choices: [{ message: { content: 'OK' } }] }) }; }
        if (mode === 'network') throw new Error('PRIVATE network details');
        return { ok: mode !== 'http', json: async () => { throw new Error('PRIVATE invalid metadata'); } };
      } });
    assert.equal((await service.sendChat(request())).code, 'update_budget_unknown');
    assert.equal(posts, 0);
    assert.equal((await service.sendChat({ messages: request().messages })).ok, true);
    assert.equal(posts, 1);
  }
});

test('cancel during metadata retrieval prevents generation', async () => {
  const controller = new AbortController();
  let posts = 0;
  const service = createProviderChatService({ selectedModels: { 'lm-studio': 'local-model' },
    fetchImpl: async (_url, options) => {
      if (options.method === 'POST') posts++;
      controller.abort();
      return { ok: true, json: async () => ({ models: [] }) };
    } });
  const result = await service.sendChat(request(), { signal: controller.signal });
  assert.equal(result.canceled, true);
  assert.equal(posts, 0);
});
