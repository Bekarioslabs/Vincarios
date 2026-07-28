'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeProviderSettings,
  resolveProviderPrivacy
} = require('../src/main/providers/providerRegistry');

test('provider privacy follows the effective endpoint instead of trusting a local definition', () => {
  const external = normalizeProviderSettings({
    urlOverrides: {
      'lm-studio': 'https://models.example.test'
    }
  }).providers[0];
  const local = normalizeProviderSettings({
    urlOverrides: {
      'lm-studio': 'http://localhost:4321'
    }
  }).providers[0];

  assert.equal(external.privacy, 'external');
  assert.equal(local.privacy, 'local');
});

test('only loopback endpoints are classified as local by endpoint inference', () => {
  assert.equal(resolveProviderPrivacy('http://127.0.0.1:1234'), 'local');
  assert.equal(resolveProviderPrivacy('http://localhost:11434'), 'local');
  assert.equal(resolveProviderPrivacy('http://[::1]:11434'), 'local');
  assert.equal(resolveProviderPrivacy('http://192.168.1.20:11434'), 'external');
  assert.equal(resolveProviderPrivacy('https://api.example.test'), 'external');
  assert.equal(resolveProviderPrivacy('http://127.0.0.1:1234', 'cloud'), 'cloud');
});
