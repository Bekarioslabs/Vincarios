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

test('Windows application icon contains PNG frames for small and high-DPI displays', () => {
  assert.equal(packageJson.build.icon, 'src/renderer/assets/brand/vincarios-icon.ico');
  const icon = fs.readFileSync(path.join(__dirname, '..', packageJson.build.icon));
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  assert.equal(icon.readUInt16LE(0), 0);
  assert.equal(icon.readUInt16LE(2), 1);
  assert.equal(icon.readUInt16LE(4), sizes.length);
  let offset = 6 + sizes.length * 16;

  sizes.forEach((size, index) => {
    const entry = 6 + index * 16;
    assert.equal(icon[entry] || 256, size);
    assert.equal(icon[entry + 1] || 256, size);
    assert.equal(icon.readUInt16LE(entry + 4), 1);
    assert.equal(icon.readUInt16LE(entry + 6), 32);
    assert.equal(icon.readUInt32LE(entry + 12), offset);
    const length = icon.readUInt32LE(entry + 8);
    const png = icon.subarray(offset, offset + length);
    assert.deepEqual(png.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    assert.equal(png.toString('ascii', 12, 16), 'IHDR');
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
    assert.equal(png[24], 8);
    assert.equal(png[25], 6);
    offset += length;
  });
  assert.equal(offset, icon.length);
});
test('Windows release verifies the pinned embedding model before packaging', () => {
  assert.equal(packageJson.scripts['model:verify'], 'node scripts/verify-embedding-model.js');
  assert.equal(packageJson.scripts['model:provision'], 'node scripts/provision-embedding-model.js');
  assert.equal(packageJson.scripts['build:win'], 'npm run model:verify && electron-builder --win portable');
});
test('CI keeps portable tests and adds a verified Windows packaging smoke job', () => {
  assert.match(ciWorkflow, /actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7\.0\.1/g);
  assert.match(ciWorkflow, /actions\/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7\.0\.0/g);
  assert.match(ciWorkflow, /run: npm run audit:security/);
  assert.match(ciWorkflow, /run: npm run licenses:check/);
  assert.match(ciWorkflow, /package-windows:[\s\S]*runs-on: windows-latest/);
  assert.match(ciWorkflow, /package-windows:[\s\S]*run: npm run model:provision/);
  assert.match(ciWorkflow, /package-windows:[\s\S]*run: npm run build:win/);
  assert.match(ciWorkflow, /actions\/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7\.0\.1/);
});

test('packaged runtime disables Node entry overrides and requires the integrity-checked ASAR', () => {
  assert.deepEqual(packageJson.build.electronFuses, {
    runAsNode: false,
    enableNodeOptionsEnvironmentVariable: false,
    enableNodeCliInspectArguments: false,
    enableEmbeddedAsarIntegrityValidation: true,
    onlyLoadAppFromAsar: true
  });
});
