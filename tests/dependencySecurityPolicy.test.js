'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

test('dependency policy pins patched runtime transitive dependencies', () => {
  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const packages = lock.packages || {};

  assert.equal(pkg.devDependencies['electron-builder'], '26.15.7');
  assert.equal(pkg.overrides.sharp, '0.35.3');
  assert.equal(packages['node_modules/sharp'].version, '0.35.3');
  assert.equal(packages['node_modules/protobufjs'].version, '7.6.5');
  assert.equal(packages['node_modules/fast-uri'].version, '3.1.4');
  assert.equal(packages['node_modules/tar'].version, '7.5.22');
});

test('dependency install scripts are denied by default and narrowly approved', () => {
  const pkg = readJson('package.json');
  const npmrc = fs.readFileSync(path.join(root, '.npmrc'), 'utf8');

  assert.deepEqual(pkg.allowScripts, {
    'electron-winstaller@5.4.0': true,
    'onnxruntime-node@1.24.3': true,
    protobufjs: false,
  });
  assert.match(npmrc, /^strict-allow-scripts=true$/m);
});