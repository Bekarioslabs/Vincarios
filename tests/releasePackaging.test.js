'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

test('Windows release build is a portable, versioned candidate with bundled local model resources', () => {
  assert.equal(packageJson.scripts['build:win'], 'electron-builder --win portable');
  assert.equal(packageJson.build.appId, 'com.bekarioslabs.vitruvios');
  assert.equal(packageJson.build.productName, 'vitruvios');
  assert.equal(packageJson.build.asar, true);
  assert.equal(packageJson.build.directories.output, 'release');
  assert.equal(packageJson.build.win.artifactName, 'vitruvios-${version}-portable.${ext}');
  assert.deepEqual(packageJson.build.win.target, ['portable']);
  assert.equal(packageJson.build.files.includes('third_party/**/*'), true);
  assert.equal(packageJson.build.extraResources.some((entry) => entry.from === 'third_party'), false);
  assert.equal(packageJson.build.extraResources.some((entry) => entry.from === '.vitruvios/models/embeddings' && entry.to === 'vitruvios-models/embeddings'), true);
  assert.equal(packageJson.build.extraResources.some((entry) => entry.from === 'THIRD_PARTY_NOTICES.md'), true);
});

test('release package keeps native ONNX runtime outside ASAR', () => {
  assert.deepEqual(packageJson.build.asarUnpack, ['node_modules/onnxruntime-node/**']);
});
