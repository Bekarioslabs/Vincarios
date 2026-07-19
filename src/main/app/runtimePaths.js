'use strict';

const path = require('node:path');

const { getPortableDataRoot } = require('./portableDataPath');

function createRuntimePaths(options) {
  const input = options || {};
  const projectRoot = path.resolve(String(input.projectRoot || process.cwd()));
  const isPackaged = input.isPackaged === true;
  const executableDirectory = resolveExecutableDirectory(input);
  const dataRoot = isPackaged && executableDirectory
    ? path.join(executableDirectory, '.vitruvios')
    : getPortableDataRoot(projectRoot);
  const resourcesPath = normalizePath(input.resourcesPath);
  const modelRoot = isPackaged && resourcesPath
    ? path.join(resourcesPath, 'vitruvios-models')
    : path.join(dataRoot, 'models');

  return Object.freeze({
    isPackaged,
    projectRoot,
    dataRoot,
    modelRoot
  });
}

function resolveExecutableDirectory(options) {
  const portableDirectory = normalizePath(options.portableExecutableDir);
  if (portableDirectory) return portableDirectory;
  const executablePath = normalizePath(options.executablePath);
  return executablePath ? path.dirname(executablePath) : '';
}

function normalizePath(value) {
  const text = String(value || '').trim();
  return text ? path.resolve(text) : '';
}

module.exports = { createRuntimePaths };
