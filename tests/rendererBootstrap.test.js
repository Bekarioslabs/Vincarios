'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateRendererModules, REQUIRED_RENDERER_MODULES } = require('../src/renderer/bootstrap');

function createRuntime(overrides) {
  const runtime = {};
  REQUIRED_RENDERER_MODULES.forEach((module) => {
    runtime[module.globalName] = {};
    (module.methods || []).forEach((method) => {
      runtime[module.globalName][method] = function noop() {};
    });
  });
  return Object.assign(runtime, overrides || {});
}

test('renderer bootstrap validates all required renderer modules', () => {
  const result = validateRendererModules(createRuntime());

  assert.equal(result.ok, true);
});

test('renderer bootstrap fails fast when model action parser is missing', () => {
  const runtime = createRuntime({ ZeusModelActionParser: undefined });
  const result = validateRendererModules(runtime);

  assert.equal(result.ok, false);
  assert.match(result.message, /ZeusModelActionParser/);
});

test('renderer bootstrap validates required parser methods', () => {
  const runtime = createRuntime({ ZeusModelActionParser: {} });
  const result = validateRendererModules(runtime);

  assert.equal(result.ok, false);
  assert.match(result.message, /ZeusModelActionParser\.parseModelActionCalls/);
});