'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createFolderVisualIcon } = require('../src/renderer/vaultProfile/visualIconRenderer');

test('Vault Profile visual icon renderer uses a validated local source when present', () => {
  const calls = [];
  const renderer = {
    createIconElement(name, className) { calls.push(['builtin', name, className]); return { name, className }; },
    createIconElementFromSource(source, className) { calls.push(['local', source, className]); return { source, className }; }
  };
  const icon = createFolderVisualIcon({
    renderer,
    visual: { icon: { kind: 'custom', path: '.vitruvios/icons/work.svg', src: 'data:image/svg+xml;base64,PHN2Zy8+' } },
    className: 'file-row-type-icon',
    resolveBuiltinIconName: () => 'folderVisualFolder'
  });

  assert.deepEqual(icon, { source: 'data:image/svg+xml;base64,PHN2Zy8+', className: 'file-row-type-icon' });
  assert.deepEqual(calls, [['local', 'data:image/svg+xml;base64,PHN2Zy8+', 'file-row-type-icon']]);
});

test('Vault Profile visual icon renderer uses the resolved Lucide icon for built-ins', () => {
  const calls = [];
  const renderer = {
    createIconElement(name, className) { calls.push([name, className]); return { name, className }; }
  };
  const icon = createFolderVisualIcon({
    renderer,
    visual: { icon: { kind: 'builtin', id: 'briefcase' } },
    className: 'file-row-type-icon',
    resolveBuiltinIconName: (id) => 'folderVisual' + id
  });

  assert.deepEqual(icon, { name: 'folderVisualbriefcase', className: 'file-row-type-icon' });
  assert.deepEqual(calls, [['folderVisualbriefcase', 'file-row-type-icon']]);
});