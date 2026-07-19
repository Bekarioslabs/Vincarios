'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getContextMenuActionsForRegion,
  getCopyTextForRegion,
  getPreviewLinkForPath,
  getScopedSelectionRegionForClassNames,
  isCopyShortcut,
  isSelectAllShortcut,
  shouldPreserveNativeInputShortcut
} = require('../src/renderer/selection/scopedSelection');

test('scoped selection recognizes concrete content regions only', () => {
  assert.equal(getScopedSelectionRegionForClassNames(['chat-message-body']).id, 'chat-message');
  assert.equal(getScopedSelectionRegionForClassNames(['markdown-preview']).id, 'markdown-preview');
  assert.equal(getScopedSelectionRegionForClassNames(['file-row']).id, 'file-tree');
  assert.equal(getScopedSelectionRegionForClassNames(['review-basket-item']).id, 'review-basket');
  assert.equal(getScopedSelectionRegionForClassNames(['context-basket-item']).id, 'context-basket');
});

test('scoped selection ignores empty panel background regions', () => {
  assert.equal(getScopedSelectionRegionForClassNames(['chat-log']), null);
  assert.equal(getScopedSelectionRegionForClassNames(['workspace']), null);
  assert.equal(getScopedSelectionRegionForClassNames(['file-tree']), null);
  assert.equal(getScopedSelectionRegionForClassNames(['review-basket-items']), null);
});

test('scoped selection recognizes platform select and copy shortcuts', () => {
  assert.equal(isSelectAllShortcut({ key: 'a', ctrlKey: true, metaKey: false }), true);
  assert.equal(isSelectAllShortcut({ key: 'A', ctrlKey: false, metaKey: true }), true);
  assert.equal(isSelectAllShortcut({ key: 'a', ctrlKey: false, metaKey: false }), false);
  assert.equal(isCopyShortcut({ key: 'c', ctrlKey: true, metaKey: false }), true);
  assert.equal(isCopyShortcut({ key: 'x', ctrlKey: true, metaKey: false }), false);
});

test('scoped selection preserves Ctrl+A for every editable native input', () => {
  assert.equal(shouldPreserveNativeInputShortcut({ target: { tagName: 'INPUT', disabled: false, readOnly: false } }), true);
  assert.equal(shouldPreserveNativeInputShortcut({ target: { tagName: 'TEXTAREA', disabled: false, readOnly: true } }), false);
  assert.equal(shouldPreserveNativeInputShortcut({ target: { tagName: 'DIV' } }), false);
});

test('scoped selection does not offer area menu actions for the file tree', () => {
  assert.deepEqual(getContextMenuActionsForRegion({ id: 'file-tree' }), []);
  assert.deepEqual(getContextMenuActionsForRegion({ id: 'chat-message' }), ['copy', 'select-area']);
});

test('copy prefers an existing partial selection before falling back to region text', () => {
  assert.equal(getCopyTextForRegion({ selectedText: 'partial text', regionText: 'whole message' }), 'partial text');
  assert.equal(getCopyTextForRegion({ selectedText: '   ', regionText: 'whole message' }), 'whole message');
});
test('scoped selection offers edit actions only for editable text inputs', () => {
  const editable = { id: 'markdown-editor', nativeInput: true, element: { tagName: 'TEXTAREA', disabled: false, readOnly: false } };
  const readonly = { id: 'markdown-editor', nativeInput: true, element: { tagName: 'TEXTAREA', disabled: false, readOnly: true } };

  assert.deepEqual(getContextMenuActionsForRegion(editable), ['cut', 'copy', 'paste', 'select-area']);
  assert.deepEqual(getContextMenuActionsForRegion(readonly), ['copy', 'select-area']);
});
test('scoped selection offers copy-as-link for loaded preview targets only', () => {
  assert.deepEqual(
    getContextMenuActionsForRegion({ id: 'markdown-preview', menuActions: ['copy', 'select-area'], element: { dataset: { previewCurrentPath: 'Folder/Image.png' } } }),
    ['copy-link', 'copy', 'select-area']
  );
  assert.deepEqual(
    getContextMenuActionsForRegion({ id: 'markdown-preview', menuActions: ['copy', 'select-area'], element: { dataset: {} } }),
    ['copy', 'select-area']
  );
});

test('preview link formatter creates Obsidian links for Markdown and images', () => {
  assert.equal(getPreviewLinkForPath('Folder/Note.md'), '[[Folder/Note]]');
  assert.equal(getPreviewLinkForPath('Folder/Image.PNG'), '![[Folder/Image.PNG]]');
  assert.equal(getPreviewLinkForPath('Folder\\Nested\\Image.jpg'), '![[Folder/Nested/Image.jpg]]');
});