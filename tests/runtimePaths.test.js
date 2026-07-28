'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const { createRuntimePaths } = require('../src/main/app/runtimePaths');

test('runtime paths keep development data and model artifacts beside the source project', () => {
  const runtime = createRuntimePaths({
    projectRoot: 'D:\\Vincarios_AGENT',
    pathApi: path.win32
  });

  assert.equal(runtime.isPackaged, false);
  assert.equal(runtime.dataRoot, 'D:\\Vincarios_AGENT\\.vincarios');
  assert.equal(runtime.modelRoot, 'D:\\Vincarios_AGENT\\.vincarios\\models');
});

test('runtime paths keep portable build data beside the executable and models in resources', () => {
  const runtime = createRuntimePaths({
    projectRoot: 'E:\\Apps\\vincarios\\resources\\app.asar',
    isPackaged: true,
    portableExecutableDir: 'E:\\Apps\\vincarios',
    resourcesPath: 'E:\\Apps\\vincarios\\resources',
    pathApi: path.win32
  });

  assert.equal(runtime.isPackaged, true);
  assert.equal(runtime.dataRoot, 'E:\\Apps\\vincarios\\.vincarios');
  assert.equal(runtime.modelRoot, 'E:\\Apps\\vincarios\\resources\\vincarios-models');
});

test('runtime path construction is independent from the host operating system', () => {
  const runtime = createRuntimePaths({
    projectRoot: '/workspace/vincarios',
    isPackaged: true,
    portableExecutableDir: '/opt/vincarios',
    resourcesPath: '/opt/vincarios/resources',
    pathApi: path.posix
  });

  assert.equal(runtime.projectRoot, '/workspace/vincarios');
  assert.equal(runtime.dataRoot, '/opt/vincarios/.vincarios');
  assert.equal(runtime.modelRoot, '/opt/vincarios/resources/vincarios-models');
});
