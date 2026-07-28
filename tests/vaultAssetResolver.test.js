'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createVaultContext } = require('../src/main/vault/vaultContext');
const { createVaultAssetResolver, resolveRelativeTargetPath } = require('../src/main/vault/vaultAssetResolver');

test('asset resolver resolves relative targets from the current Markdown folder', () => {
  assert.equal(resolveRelativeTargetPath('Hero.png', 'Notes/Current.md'), 'Notes/Hero.png');
  assert.equal(resolveRelativeTargetPath('Assets/Hero.png', 'Notes/Current.md'), 'Assets/Hero.png');
});

test('asset resolver finds one unique image basename in the vault', () => {
  const root = createTempVault();
  fs.mkdirSync(path.join(root, 'Assets'));
  fs.mkdirSync(path.join(root, 'Notes'));
  fs.writeFileSync(path.join(root, 'Assets', 'Hero.png'), Buffer.from([137, 80, 78, 71]));

  const resolver = createVaultAssetResolver({ fs });
  const result = resolver.resolveImageAsset(createVaultContext(root), 'Hero.png', 'Notes/Current.md');

  assert.equal(result.ok, true);
  assert.equal(result.resolved.relativePath, 'Assets/Hero.png');
});

test('asset resolver rejects ambiguous image basename matches', () => {
  const root = createTempVault();
  fs.mkdirSync(path.join(root, 'A'));
  fs.mkdirSync(path.join(root, 'B'));
  fs.writeFileSync(path.join(root, 'A', 'Hero.png'), Buffer.from([137, 80, 78, 71]));
  fs.writeFileSync(path.join(root, 'B', 'Hero.png'), Buffer.from([137, 80, 78, 71]));

  const resolver = createVaultAssetResolver({ fs });
  const result = resolver.resolveImageAsset(createVaultContext(root), 'Hero.png', 'Notes/Current.md');

  assert.equal(result.ok, false);
  assert.equal(result.code, 'ambiguous_image_link');
});

test('asset resolver skips protected dot folders during basename fallback', () => {
  const root = createTempVault();
  fs.mkdirSync(path.join(root, '.obsidian'));
  fs.mkdirSync(path.join(root, 'Assets'));
  fs.writeFileSync(path.join(root, '.obsidian', 'Hero.png'), Buffer.from([137, 80, 78, 71]));
  fs.writeFileSync(path.join(root, 'Assets', 'Hero.png'), Buffer.from([137, 80, 78, 71]));

  const resolver = createVaultAssetResolver({ fs });
  const result = resolver.resolveImageAsset(createVaultContext(root), 'Hero.png', 'Notes/Current.md');

  assert.equal(result.ok, true);
  assert.equal(result.resolved.relativePath, 'Assets/Hero.png');
});

function createTempVault() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-vault-assets-'));
}