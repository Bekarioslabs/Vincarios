'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const { createRuntimePaths } = require('../src/main/app/runtimePaths');

test('runtime paths keep development data and model artifacts beside the source project', () => {
  const runtime = createRuntimePaths({ projectRoot: path.join('D:', 'Vitruvios_AGENT') });

  assert.equal(runtime.isPackaged, false);
  assert.equal(runtime.dataRoot, path.join('D:', 'Vitruvios_AGENT', '.vitruvios'));
  assert.equal(runtime.modelRoot, path.join('D:', 'Vitruvios_AGENT', '.vitruvios', 'models'));
});

test('runtime paths keep portable build data beside the executable and models in resources', () => {
  const runtime = createRuntimePaths({
    projectRoot: path.join('C:', 'Program Files', 'vitruvios', 'resources', 'app.asar'),
    isPackaged: true,
    portableExecutableDir: path.join('E:', 'Apps', 'vitruvios'),
    resourcesPath: path.join('E:', 'Apps', 'vitruvios', 'resources')
  });

  assert.equal(runtime.isPackaged, true);
  assert.equal(runtime.dataRoot, path.join('E:', 'Apps', 'vitruvios', '.vitruvios'));
  assert.equal(runtime.modelRoot, path.join('E:', 'Apps', 'vitruvios', 'resources', 'vitruvios-models'));
});
