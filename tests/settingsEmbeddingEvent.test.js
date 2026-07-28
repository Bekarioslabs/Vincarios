'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('embedding settings dispatch through the mounted panel event target', () => {
  const panelSource = fs.readFileSync(path.join(
    __dirname, '..', 'src', 'renderer', 'settings', 'mountSettingsPanel.js'
  ), 'utf8');
  const controllerSource = fs.readFileSync(path.join(
    __dirname, '..', 'src', 'renderer', 'settings', 'indexSettingsController.js'
  ), 'utf8');

  assert.match(panelSource, /panel\.eventTarget = app/);
  assert.match(controllerSource, /panel\.eventTarget\.dispatchEvent/);
  assert.doesNotMatch(controllerSource, /\bapp\.dispatchEvent\(new CustomEvent\('vincarios:embedding-similar-defaults-change'/);
});
