'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('reviewed template service is session-scoped and exposed through one preload method', () => {
  const bootstrap = read('src/main/app/bootstrapElectron.js');
  const preload = read('src/preload/index.js');

  assert.match(bootstrap, /createReviewedTemplateService/);
  assert.match(bootstrap, /\{ name: 'reviewed-templates', service: reviewedTemplateService \}/);
  assert.match(bootstrap, /registerTemplateIpc\(safeIpcMain, reviewedTemplateService\)/);
  assert.match(preload, /templates: Object\.freeze/);
  assert.match(preload, /createFromReview\(payload\)/);
  assert.match(preload, /IPC_CHANNELS\.TEMPLATE_CREATE_FROM_REVIEW/);
  assert.doesNotMatch(preload, /require\('node:fs'\)/);
});

test('review execution controller loads before the review basket and shell startup', () => {
  const index = read('index.html');
  const controllerIndex = index.indexOf('./src/renderer/review/reviewExecutionController.js');
  const basketIndex = index.indexOf('./src/renderer/review/mountReviewBasket.js');
  const shellIndex = index.indexOf('./src/renderer/shell/mountShell.js');

  assert.equal(controllerIndex > -1, true);
  assert.equal(controllerIndex < basketIndex, true);
  assert.equal(controllerIndex < shellIndex, true);
});

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', ...relativePath.split('/')), 'utf8');
}
