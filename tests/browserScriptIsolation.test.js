'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const BROWSER_SHARED_SCRIPTS = [
  'src/shared/vaultProfile/defaults.js',
  'src/shared/security/payloadLimits.js',
  'src/shared/actions/actionSchema.js',
  'src/shared/actions/modelActionParser.js',
  'src/shared/actions/proposalPlan.js',
  'src/shared/actions/diffPreview.js'
];
const BROWSER_RENDERER_SCRIPTS = [
  'src/renderer/files/mountFilePanel.js',
  'src/renderer/shell/mountShell.js',
  'src/renderer/icons/iconRegistry.js',
  'src/renderer/icons/iconRenderer.js'
];


test('browser-loaded shared scripts are isolated in IIFEs', () => {
  BROWSER_SHARED_SCRIPTS.forEach((relativePath) => {
    const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8').trimStart();
    assert.equal(source.startsWith('(function() {'), true, relativePath);
  });
});

test('index loads all isolated shared scripts before renderer script modules', () => {
  const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const firstRendererScript = index.indexOf('<script src="./src/renderer/');

  assert.equal(firstRendererScript > -1, true);
  BROWSER_SHARED_SCRIPTS.forEach((relativePath) => {
    const htmlPath = './' + relativePath.replace(/\\/g, '/');
    const scriptIndex = index.indexOf(htmlPath);
    assert.equal(scriptIndex > -1, true, htmlPath);
    assert.equal(scriptIndex < firstRendererScript, true, htmlPath);
  });
});
test('index does not contain visible escaped newline literals', () => {
  const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.equal(index.includes('`r'), false);
  assert.equal(index.includes('`n'), false);
  assert.equal(index.includes('\\r\\n'), false);
});


test('browser-loaded renderer scripts do not start with a UTF-8 BOM', () => {
  BROWSER_RENDERER_SCRIPTS.forEach((relativePath) => {
    const buffer = fs.readFileSync(path.join(__dirname, '..', relativePath));
    assert.equal(buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf, false, relativePath);
  });
});

test('index declares a strict renderer content security policy', () => {
  const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.match(index, /http-equiv="Content-Security-Policy"/);
  assert.match(index, /default-src 'self'/);
  assert.match(index, /script-src 'self'/);
  assert.match(index, /style-src 'self'/);
  assert.match(index, /img-src 'self' data: file:/);
  assert.match(index, /font-src 'self'/);
  assert.match(index, /connect-src 'none'/);
  assert.equal(index.includes("'unsafe-inline'"), false);
  assert.equal(index.includes("'unsafe-eval'"), false);
});
