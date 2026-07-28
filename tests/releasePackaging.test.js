'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const ciWorkflow = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'ci.yml'), 'utf8');

test('Windows release build is a portable, versioned candidate with bundled local model resources', () => {
  assert.equal(packageJson.scripts['build:win'], 'npm run model:verify && electron-builder --win portable');
  assert.equal(packageJson.build.appId, 'com.bekarioslabs.vincarios');
  assert.equal(packageJson.build.productName, 'vincarios');
  assert.equal(packageJson.build.asar, true);
  assert.equal(packageJson.build.directories.output, 'release');
  assert.equal(packageJson.build.win.artifactName, 'vincarios-${version}-portable.${ext}');
  assert.deepEqual(packageJson.build.win.target, ['portable']);
  assert.equal(packageJson.build.files.includes('third_party/**/*'), true);
  assert.equal(packageJson.build.extraResources.some((entry) => entry.from === 'third_party'), false);
  assert.equal(packageJson.build.extraResources.some((entry) => entry.from === '.vincarios/models/embeddings' && entry.to === 'vincarios-models/embeddings'), true);
  assert.equal(packageJson.build.extraResources.some((entry) => entry.from === 'THIRD_PARTY_NOTICES.md'), true);
  assert.equal(packageJson.build.extraResources.some((entry) => entry.from === 'licenses'), true);
});

test('release package keeps native ONNX runtime outside ASAR', () => {
  assert.deepEqual(packageJson.build.asarUnpack, ['node_modules/onnxruntime-node/**']);
});
test('Windows release verifies the pinned embedding model before packaging', () => {
  assert.equal(packageJson.scripts['model:verify'], 'node scripts/verify-embedding-model.js');
  assert.equal(packageJson.scripts['model:provision'], 'node scripts/provision-embedding-model.js');
  assert.equal(packageJson.scripts['build:win'], 'npm run model:verify && electron-builder --win portable');
});
test('CI keeps portable tests and adds a verified Windows packaging smoke job', () => {
  assert.match(ciWorkflow, /run: npm run audit:security/);
  assert.match(ciWorkflow, /run: npm run licenses:check/);
  assert.match(ciWorkflow, /package-windows:[\s\S]*runs-on: windows-latest/);
  assert.match(ciWorkflow, /package-windows:[\s\S]*run: npm run model:provision/);
  assert.match(ciWorkflow, /package-windows:[\s\S]*run: npm run build:win/);
  assert.match(ciWorkflow, /actions\/upload-artifact@[0-9a-f]{40}/);
});