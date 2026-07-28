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
    querySelector(selector) {
      if (this.nodes && this.nodes[selector]) return this.nodes[selector];
      if (String(selector || '').startsWith('.')) {
        const className = String(selector).slice(1);
        return this.children.find((child) => String(child.className || '').split(/\\s+/).includes(className)) || null;
      }
      return null;
    },
    querySelectorAll() { return []; },
    closest() { return null; },
    focus() {},
    select() {},
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
    VincariosFileNavigator: navigator,
    VincariosFileTreeKeyboard: keyboard,
    VincariosIconRenderer: {
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
    VincariosFileNavigator: navigator,
    VincariosFileTreeKeyboard: keyboard,
    VincariosIconRenderer: {
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
    VincariosFileNavigator: navigator,
    VincariosFileTreeKeyboard: keyboard,
    VincariosIconRenderer: {
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

test('file panel reloads the root listing when another vault is opened', async () => {
  const previousWindow = global.window;
  const previousDocument = global.document;
  const navigator = require('../src/renderer/files/fileNavigator');
  const keyboard = require('../src/renderer/files/fileTreeKeyboard');
  const permissions = require('../src/renderer/permissions/permissionState');
  const { mountFilePanel } = require('../src/renderer/files/mountFilePanel');

  global.document = { createElement: createNode };
  global.window = {
    VincariosFileNavigator: navigator,
    VincariosFileTreeKeyboard: keyboard,
    VincariosIconRenderer: {
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
    let calls = 0;
    const api = {
      vault: {
        listFolder() {
          calls += 1;
          return Promise.resolve({ ok: true, entries: [] });
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
    await panel.openRoot();

    assert.equal(calls, 2);
  } finally {
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
    if (previousDocument === undefined) delete global.document;
    else global.document = previousDocument;
  }
});

test('file tree F2 renames the selected Markdown row when a nested tree control owns focus', async () => {
  const previousWindow = global.window;
  const previousDocument = global.document;
  const navigator = require('../src/renderer/files/fileNavigator');
  const keyboard = require('../src/renderer/files/fileTreeKeyboard');
  const permissions = require('../src/renderer/permissions/permissionState');
  const { mountFilePanel } = require('../src/renderer/files/mountFilePanel');

  global.document = { createElement: createNode };
  global.window = {
    VincariosFileNavigator: navigator,
    VincariosFileTreeKeyboard: keyboard,
    VincariosIconRenderer: { createIconElement: () => createNode('img') }
  };

  try {
    const root = createRoot();
    const state = navigator.createFileNavigator();
    const panel = mountFilePanel({
      api: {
        vault: {
          listFolder: () => Promise.resolve({ ok: true, entries: [{ name: 'Draft.md', path: '00_Inbox/Draft.md', kind: 'markdown' }] }),
          readMarkdown: () => Promise.resolve({ ok: true, path: '00_Inbox/Draft.md', content: '# Draft' }),
          renameFile: () => Promise.resolve({ ok: true, targetPath: '00_Inbox/Renamed.md' })
        }
      },
      root,
      navigator: state,
      keyboard,
      permissionState: permissions.createPermissionState()
    });

    await panel.openRoot();
    state.selectFile('00_Inbox/Draft.md');
    const event = { key: 'F2', target: { closest: () => null }, preventDefault() { this.prevented = true; } };
    await root.nodes['#file-tree'].listeners.keydown(event);

    const row = root.nodes['#file-tree'].children[0];
    const label = row.children.find((child) => child.className === 'file-row-label');
    assert.equal(event.prevented, true);
    assert.equal(label.children[0].className, 'file-rename-input');
  } finally {
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
    if (previousDocument === undefined) delete global.document;
    else global.document = previousDocument;
  }
});
test('file panel reports a successfully recorded recent Markdown file', async () => {
  const previousWindow = global.window;
  const previousDocument = global.document;
  const navigator = require('../src/renderer/files/fileNavigator');
  const keyboard = require('../src/renderer/files/fileTreeKeyboard');
  const permissions = require('../src/renderer/permissions/permissionState');
  const { mountFilePanel } = require('../src/renderer/files/mountFilePanel');

  global.document = { createElement: createNode };
  global.window = {
    VincariosFileNavigator: navigator,
    VincariosFileTreeKeyboard: keyboard,
    VincariosIconRenderer: {
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
    const recorded = [];
    const api = {
      vault: {
        listFolder() {
          return Promise.resolve({
            ok: true,
            entries: [{ name: 'Recent.md', path: '00_Inbox/Recent.md', kind: 'markdown' }]
          });
        },
        readMarkdown(filePath) {
          return Promise.resolve({ ok: true, path: filePath, content: '# Recent' });
        },
        recordRecentFile({ path }) {
          return Promise.resolve({ ok: true, path });
        }
      }
    };
    const panel = mountFilePanel({
      api,
      root,
      permissionState: permissions.createPermissionState(),
      navigator: navigator.createFileNavigator(),
      keyboard,
      onRecentFileRecorded(path) {
        recorded.push(path);
      }
    });

    await panel.openRoot();
    await root.nodes['#file-tree'].children[0].listeners.click();

    assert.deepEqual(recorded, ['00_Inbox/Recent.md']);
  } finally {
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
    if (previousDocument === undefined) delete global.document;
    else global.document = previousDocument;
  }
});