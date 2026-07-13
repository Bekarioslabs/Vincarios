'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getIconPath, createIconElement } = require('../src/renderer/icons/iconRenderer');
const { resolveFolderVisualIconName } = require('../src/renderer/icons/iconRegistry');

test('icon renderer resolves semantic icon names to local Lucide assets', () => {
  assert.equal(getIconPath('folder'), './src/renderer/assets/icons/lucide/folder.svg');
  assert.equal(getIconPath('markdownFile'), './src/renderer/assets/icons/lucide/file-text.svg');
  assert.equal(getIconPath('folderVisualBrain'), './src/renderer/assets/icons/lucide/brain.svg');
});

test('icon renderer creates accessible decorative icon elements', () => {
  const previousDocument = global.document;
  global.document = {
    createElement(tagName) {
      return {
        tagName,
        className: '',
        attributes: {},
        setAttribute(name, value) { this.attributes[name] = String(value); }
      };
    }
  };
  try {
    const icon = createIconElement('refresh', 'file-refresh-icon');
    assert.equal(icon.tagName, 'img');
    assert.equal(icon.className, 'zeus-icon file-refresh-icon');
    assert.equal(icon.attributes.src, './src/renderer/assets/icons/lucide/refresh-cw.svg');
    assert.equal(icon.attributes['aria-hidden'], 'true');
  } finally {
    global.document = previousDocument;
  }
});
test('icon registry resolves folder visual keys through semantic local assets', () => {
  assert.equal(resolveFolderVisualIconName('briefcase'), 'folderVisualBriefcase');
  assert.equal(resolveFolderVisualIconName('unknown'), 'folder');
});