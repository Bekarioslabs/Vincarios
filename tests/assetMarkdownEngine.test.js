'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('markdown-it browser engine and MIT license are bundled locally', () => {
  const browserAsset = path.join(root, 'third_party', 'markdown-it', 'markdown-it.min.js');
  const license = path.join(root, 'third_party', 'markdown-it', 'LICENSE');
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

  assert.equal(fs.existsSync(browserAsset), true);
  assert.equal(fs.existsSync(license), true);
  const browserAssetText = fs.readFileSync(browserAsset, 'utf8');
  const licenseText = fs.readFileSync(license, 'utf8');
  assert.match(browserAssetText, /markdown-it 14\.3\.3/);
  assert.match(licenseText, /Copyright \(c\) 2014 Vitaly Puzrin, Alex Kocharin/);
  assert.match(licenseText, /Permission is hereby granted, free of charge/);
  assert.match(index, /\.\/third_party\/markdown-it\/markdown-it\.min\.js/);
  assert.doesNotMatch(index, /\.\/node_modules\/markdown-it/);
});

test('the shipped browser engine is byte-identical to the pinned installed engine', () => {
  assert.deepEqual(
    fs.readFileSync(path.join(root, 'third_party/markdown-it/markdown-it.min.js')),
    fs.readFileSync(path.join(root, 'node_modules/markdown-it/dist/markdown-it.min.js'))
  );
});

test('Git retains the upstream browser asset bytes on Windows checkouts', () => {
  const file = path.join(root, '.gitattributes');
  const attributes = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  assert.match(attributes, /^third_party\/markdown-it\/markdown-it\.min\.js text eol=lf$/m);
  assert.match(attributes, /^\*\.bat text eol=crlf$/m);
  assert.match(attributes, /^\*\.cmd text eol=crlf$/m);
});
