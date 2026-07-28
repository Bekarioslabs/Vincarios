'use strict';

const path = require('node:path');

const { getPortableDataRoot } = require('./portableDataPath');

function createRuntimePaths(options) {
  const input = options || {};
  const pathApi = input.pathApi || path;
  const projectRoot = pathApi.resolve(String(input.projectRoot || process.cwd()));
  const isPackaged = input.isPackaged === true;
  const executableDirectory = resolveExecutableDirectory(input, pathApi);
  const dataRoot = isPackaged && executableDirectory
    ? pathApi.join(executableDirectory, '.vincarios')
    : getPortableDataRoot(projectRoot, pathApi);
  const resourcesPath = normalizePath(input.resourcesPath, pathApi);
  const modelRoot = isPackaged && resourcesPath
    ? pathApi.join(resourcesPath, 'vincarios-models')
    : pathApi.join(dataRoot, 'models');

  return Object.freeze({
    isPackaged,
    projectRoot,
    dataRoot,
    modelRoot
  });
}

function resolveExecutableDirectory(options, pathApi) {
  const portableDirectory = normalizePath(options.portableExecutableDir, pathApi);
  if (portableDirectory) return portableDirectory;
  const executablePath = normalizePath(options.executablePath, pathApi);
  return executablePath ? pathApi.dirname(executablePath) : '';
}

function normalizePath(value, pathApi) {
  const text = String(value || '').trim();
  return text ? pathApi.resolve(text) : '';
}

module.exports = { createRuntimePaths };
