'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createProviderChatService } = require('../src/main/providers/providerChatService');

test('external providers reject attached vault context without endpoint-bound approval', async () => {
  let requests = 0;
  const service = createService('https://api.example.com', async () => {
    requests += 1;
    return providerResponse();
  });

  const result = await service.sendChat({
    messages: [{ role: 'user', content: '## Context Basket\nprivate note' }],
    privacy: { containsVaultContext: true }
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'external_context_approval_required');
  assert.equal(result.provider.privacy, 'external');
  assert.equal(requests, 0);
});

test('external provider approval is valid only for the active endpoint', async () => {
  let requests = 0;
  const service = createService('https://api.example.com', async () => {
    requests += 1;
    return providerResponse();
  });

  const wrongEndpoint = await service.sendChat({
    messages: [{ role: 'user', content: 'private note' }],
    privacy: {
      containsVaultContext: true,
      externalContextApproved: true,
      approvedEndpoint: 'https://other.example.com'
    }
  });
  const approved = await service.sendChat({
    messages: [{ role: 'user', content: 'private note' }],
    privacy: {
      containsVaultContext: true,
      externalContextApproved: true,
      approvedEndpoint: 'https://api.example.com'
    }
  });

  assert.equal(wrongEndpoint.code, 'external_context_approval_required');
  assert.equal(approved.ok, true);
  assert.equal(requests, 1);
});

test('local providers accept attached vault context without external approval', async () => {
  let requests = 0;
  const service = createService('http://127.0.0.1:1234', async () => {
    requests += 1;
    return providerResponse();
  });

  const result = await service.sendChat({
    messages: [{ role: 'user', content: 'private note' }],
    privacy: { containsVaultContext: true }
  });

  assert.equal(result.ok, true);
  assert.equal(result.provider.privacy, 'local');
  assert.equal(requests, 1);
});

function createService(baseUrl, fetchImpl) {
  return createProviderChatService({
    providers: [{
      id: 'test-provider',
      label: 'Test Provider',
      baseUrl,
      chatPath: '/v1/chat/completions',
      model: 'test-model'
    }],
    fetchImpl
  });
}

function providerResponse() {
  return {
    ok: true,
    status: 200,
    async json() {
      return { choices: [{ message: { content: 'OK' } }] };
    }
  };
}
