'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  evaluateExternalContextConsentRequirement
} = require('../src/renderer/providers/externalProviderConsent');

test('provider context consent is required only for external or cloud endpoints with vault context', () => {
  assert.equal(evaluateExternalContextConsentRequirement({ privacy: 'local' }, true).required, false);
  assert.equal(evaluateExternalContextConsentRequirement({ privacy: 'external' }, false).required, false);
  assert.equal(evaluateExternalContextConsentRequirement({ privacy: 'external' }, true).required, true);
  assert.equal(evaluateExternalContextConsentRequirement({ privacy: 'cloud' }, true).required, true);
});

test('provider context consent binds approval to the visible endpoint', () => {
  const result = evaluateExternalContextConsentRequirement({
    privacy: 'external',
    baseUrl: 'https://api.example.com/',
    label: 'External Provider'
  }, true);

  assert.equal(result.required, true);
  assert.equal(result.endpoint, 'https://api.example.com/');
  assert.equal(result.label, 'External Provider');
});
