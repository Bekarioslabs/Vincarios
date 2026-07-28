'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('preview resource policy loads before and owns limits for the Markdown preview controller', () => {
  const index = read('index.html');
  const controller = read('src/renderer/markdown/markdownPreviewController.js');
  const policyIndex = index.indexOf('./src/renderer/markdown/previewResourcePolicy.js');
  const controllerIndex = index.indexOf('./src/renderer/markdown/markdownPreviewController.js');

  assert.equal(policyIndex > -1, true);
  assert.equal(policyIndex < controllerIndex, true);
  assert.match(controller, /VincariosPreviewResourcePolicy/);
  assert.match(controller, /createBoundedPreviewHistory/);
  assert.match(controller, /createPreviewTaskPool/);
  assert.doesNotMatch(controller, /images\.forEach\(\(image\) => resolveMarkdownImage\(image\)\)/);
});
