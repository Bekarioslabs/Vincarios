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

  assert.equal(pkg.dependencies['@huggingface/transformers'], '4.3.0');
  assert.equal(pkg.dependencies['markdown-it'], '14.3.3');
  assert.equal(pkg.dependencies.yaml, '2.9.1');
  assert.equal(pkg.devDependencies['electron-builder'], '26.17.0');
  assert.equal(pkg.devDependencies.electron, '44.10.0');
  assert.equal(pkg.overrides['adm-zip'], '0.6.1');
  assert.equal(pkg.overrides.sharp, '0.35.5');
  assert.equal(pkg.overrides['fast-uri'], '3.1.9');
  assert.equal(pkg.overrides['undici@7'], '7.30.1');
  assert.equal(pkg.overrides['undici@6'], '6.29.1');
  assert.equal(pkg.overrides['js-yaml'], '4.3.2');
  assert.equal(pkg.overrides['http-cache-semantics'], '4.3.0');
  assert.equal(pkg.overrides['@xmldom/xmldom'], '0.8.15');
  assert.equal(packages['node_modules/electron'].version, '44.10.0');
  assert.equal(packages['node_modules/onnxruntime-node'].version, '1.30.0');
  assert.equal(packages['node_modules/adm-zip'].version, '0.6.1');
  assert.equal(packages['node_modules/sharp'].version, '0.35.5');
  assert.equal(packages['node_modules/protobufjs'].version, '7.6.6');
  assert.equal(packages['node_modules/fast-uri'].version, '3.1.9');
  assert.equal(packages['node_modules/js-yaml'].version, '4.3.2');
  assert.equal(packages['node_modules/undici'].version, '7.30.1');
  assert.equal(packages['node_modules/node-gyp/node_modules/undici'].version, '6.29.1');
  const braceExpansionVersions = new Set(
    Object.entries(packages)
      .filter(([packagePath]) => packagePath.endsWith('node_modules/brace-expansion'))
      .map(([, entry]) => entry.version),
  );
  assert.deepEqual(braceExpansionVersions, new Set(['1.1.21', '2.1.7', '5.0.12']));
  assert.equal(packages['node_modules/tar'].version, '7.5.22');
});

test('dependency install scripts are denied by default and narrowly approved', () => {
  const pkg = readJson('package.json');
  const npmrc = fs.readFileSync(path.join(root, '.npmrc'), 'utf8');

  assert.deepEqual(pkg.allowScripts, {
    'electron-winstaller@5.4.0': true,
    'onnxruntime-node@1.30.0': true,
    protobufjs: false,
  });
  assert.match(npmrc, /^strict-allow-scripts=true$/m);
});
