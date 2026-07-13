const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('shared modal behavior traps focus and ignores backdrop clicks', () => {
  const source = read('src/renderer/ui/modalBehavior.js');

  assert.match(source, /function mountModalBehavior/);
  assert.match(source, /event\.key !== 'Tab'/);
  assert.match(source, /event\.target === overlay/);
  assert.doesNotMatch(source, /onClose/);
});

test('settings templates and review dialogs use the shared modal behavior', () => {
  const index = read('index.html');
  const settings = read('src/renderer/settings/mountSettingsPanel.js');
  const templates = read('src/renderer/templates/mountCreationPresets.js');
  const review = read('src/renderer/review/mountReviewBasket.js');

  assert.match(index, /\.\/src\/renderer\/ui\/modalBehavior\.js/);
  assert.match(settings, /getModalBehavior\(\)\.mountModalBehavior/);
  assert.match(templates, /getModalBehavior\(\)\.mountModalBehavior/);
  assert.match(review, /getModalBehavior\(\)\.mountModalBehavior/);
  assert.match(settings, /panel\.modalBehavior\.focusInitial/);
  assert.doesNotMatch(settings, /event\.target === panel\.backdrop\) closePanel/);
  assert.doesNotMatch(templates, /event\.target === overlay\) closeDialog/);
});