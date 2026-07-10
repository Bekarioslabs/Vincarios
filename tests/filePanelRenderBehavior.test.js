'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

function createClassList(node) {
  return {
    add(className) {
      node.className += (node.className ? ' ' : '') + className;
    },
    toggle(className, enabled) {
      if (enabled) this.add(className);
    }
  };
}

function createNode(tagName) {
  const node = {
    tagName: String(tagName || 'div').toUpperCase(),
    children: [],
    listeners: {},
    dataset: {},
    style: { setProperty(name, value) { this[name] = value; } },
    className: '',
    textContent: '',
    innerHTML: '',
    disabled: false,
    classList: null,
    setAttribute(name, value) { this[name] = String(value); },
    appendChild(child) { this.children.push(child); return child; },
    addEventListener(type, handler) { this.listeners[type] = handler; },
    querySelector(selector) { return this.nodes ? this.nodes[selector] || null : null; },
    querySelectorAll() { return []; },
    closest() { return null; },
    focus() {},
    scrollIntoView() {}
  };
  node.classList = createClassList(node);
  return node;
}

function createRoot() {
  const root = createNode('div');
  root.nodes = {
    '#file-refresh': createNode('button'),
    '#file-breadcrumb': createNode('div'),
    '#file-tree': createNode('div'),
    '#file-vault-name': createNode('div')
  };
  return root;
}

test('file panel renders root folders after opening a vault', async () => {
  const previousWindow = global.window;
  const previousDocument = global.document;
  const navigator = require('../src/renderer/files/fileNavigator');
  const keyboard = require('../src/renderer/files/fileTreeKeyboard');
  const permissions = require('../src/renderer/permissions/permissionState');
  const { mountFilePanel } = require('../src/renderer/files/mountFilePanel');

  global.document = { createElement: createNode };
  global.window = {
    ZeusFileNavigator: navigator,
    ZeusFileTreeKeyboard: keyboard,
    ZeusIconRenderer: {
      createIconElement(name, className) {
        const icon = createNode('img');
        icon.iconName = name;
        icon.className = className || '';
        return icon;
      }
    }
  };

  try {
    const root = createRoot();
    const api = {
      vault: {
        listFolder() {
          return Promise.resolve({ ok: true, entries: [{ name: '00_Inbox', path: '00_Inbox', kind: 'folder' }] });
        }
      }
    };
    const panel = mountFilePanel({
      api,
      root,
      permissionState: permissions.createPermissionState(),
      navigator: navigator.createFileNavigator(),
      keyboard
    });

    await panel.openRoot();

    assert.equal(root.nodes['#file-tree'].children.length, 1);
    assert.equal(root.nodes['#file-tree'].children[0]['aria-label'], 'Folder: 00_Inbox');
  } finally {
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
    if (previousDocument === undefined) delete global.document;
    else global.document = previousDocument;
  }
});
test('file panel opens Markdown after selecting an image file', async () => {
  const previousWindow = global.window;
  const previousDocument = global.document;
  const navigator = require('../src/renderer/files/fileNavigator');
  const keyboard = require('../src/renderer/files/fileTreeKeyboard');
  const permissions = require('../src/renderer/permissions/permissionState');
  const context = require('../src/renderer/context/contextState');
  const { mountFilePanel } = require('../src/renderer/files/mountFilePanel');

  global.document = { createElement: createNode };
  global.window = {
    ZeusFileNavigator: navigator,
    ZeusFileTreeKeyboard: keyboard,
    ZeusIconRenderer: {
      createIconElement(name, className) {
        const icon = createNode('img');
        icon.iconName = name;
        icon.className = className || '';
        return icon;
      }
    }
  };

  try {
    const root = createRoot();
    const previewCalls = [];
    const previewController = {
      setSource(content, filePath) { previewCalls.push({ content, path: filePath }); },
      setMessage(message) { previewCalls.push({ message }); }
    };
    const state = context.createContextState();
    const api = {
      vault: {
        listFolder() {
          return Promise.resolve({ ok: true, entries: [
            { name: 'test.png', path: '03_Knowledge/test.png', kind: 'image' },
            { name: 'Markdown_TEST.md', path: '03_Knowledge/Markdown_TEST.md', kind: 'markdown' }
          ] });
        },
        readMarkdown(filePath) {
          return Promise.resolve({ ok: true, path: filePath, content: '# Markdown Test' });
        }
      }
    };
    const panel = mountFilePanel({
      api,
      root,
      previewController,
      contextState: state,
      permissionState: permissions.createPermissionState(),
      navigator: navigator.createFileNavigator(),
      keyboard
    });

    await panel.openRoot();
    const imageRow = root.nodes['#file-tree'].children[0];
    const markdownRow = root.nodes['#file-tree'].children[1];
    await imageRow.listeners.click();
    await markdownRow.listeners.click();

    assert.deepEqual(previewCalls.at(-1), { content: '# Markdown Test', path: '03_Knowledge/Markdown_TEST.md' });
    assert.equal(state.snapshot().path, '03_Knowledge/Markdown_TEST.md');
    assert.equal(state.snapshot().content, '# Markdown Test');
  } finally {
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
    if (previousDocument === undefined) delete global.document;
    else global.document = previousDocument;
  }
});

test('file panel opens selected images in the preview controller', async () => {
  const previousWindow = global.window;
  const previousDocument = global.document;
  const navigator = require('../src/renderer/files/fileNavigator');
  const keyboard = require('../src/renderer/files/fileTreeKeyboard');
  const permissions = require('../src/renderer/permissions/permissionState');
  const context = require('../src/renderer/context/contextState');
  const { mountFilePanel } = require('../src/renderer/files/mountFilePanel');

  global.document = { createElement: createNode };
  global.window = {
    ZeusFileNavigator: navigator,
    ZeusFileTreeKeyboard: keyboard,
    ZeusIconRenderer: {
      createIconElement(name, className) {
        const icon = createNode('img');
        icon.iconName = name;
        icon.className = className || '';
        return icon;
      }
    }
  };

  try {
    const root = createRoot();
    const previewCalls = [];
    const previewController = {
      setImageAsset(filePath) { previewCalls.push({ image: filePath }); },
      setMessage(message) { previewCalls.push({ message }); }
    };
    const state = context.createContextState();
    const api = {
      vault: {
        listFolder() {
          return Promise.resolve({ ok: true, entries: [
            { name: 'Hero.png', path: 'Images/Hero.png', kind: 'image' }
          ] });
        }
      }
    };
    const panel = mountFilePanel({
      api,
      root,
      previewController,
      contextState: state,
      permissionState: permissions.createPermissionState(),
      navigator: navigator.createFileNavigator(),
      keyboard
    });

    await panel.openRoot();
    await root.nodes['#file-tree'].children[0].listeners.click();

    assert.deepEqual(previewCalls, [{ image: 'Images/Hero.png' }]);
    assert.equal(state.snapshot().path, 'Images/Hero.png');
  } finally {
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
    if (previousDocument === undefined) delete global.document;
    else global.document = previousDocument;
  }
});