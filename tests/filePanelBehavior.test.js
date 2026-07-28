'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { mountFilePanel } = require('../src/renderer/files/mountFilePanel.js');
const fileNavigator = require('../src/renderer/files/fileNavigator.js');

class FakeElement {
  constructor() {
    this.attributes = new Map();
    this.dataset = {};
    this.listeners = new Map();
    this.className = '';
    this.innerHTML = '';
    this.textContent = '';
    this.disabled = false;
    this.title = '';
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  async dispatch(type) {
    const listeners = this.listeners.get(type) || [];
    for (const listener of listeners) await listener({});
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  querySelectorAll() {
    return [];
  }
}

function createPanelRoot() {
  const elements = {
    '#file-refresh': new FakeElement(),
    '#file-index-health': new FakeElement(),
    '#file-collapse': new FakeElement(),
    '#file-breadcrumb': new FakeElement(),
    '#file-tree': new FakeElement(),
    '#file-vault-name': new FakeElement()
  };
  const root = new FakeElement();
  root.querySelector = (selector) => elements[selector] || null;
  return { root, elements };
}

function createVaultApi() {
  const calls = [];
  let onChanged = null;
  return {
    calls,
    api: {
      vault: {
        async listFolder(path) {
          calls.push(path);
          return { ok: true, entries: [] };
        },
        onChanged(listener) {
          onChanged = listener;
          return () => {};
        }
      }
    },
    async emitChange() {
      await onChanged();
    }
  };
}

test('mounted file panel reloads expanded folders for manual and external vault changes', async () => {
  const previousWindow = global.window;
  global.window = { VincariosFileNavigator: fileNavigator };

  try {
    const { root, elements } = createPanelRoot();
    const vault = createVaultApi();
    const panel = mountFilePanel({ root, api: vault.api });

    await panel.openRoot();
    panel.navigator.expandFolder('Folder');
    await elements['#file-refresh'].dispatch('click');

    assert.deepEqual(vault.calls, ['', '', 'Folder']);
    assert.equal(panel.navigator.isExpanded('Folder'), true);

    await vault.emitChange();

    assert.deepEqual(vault.calls, ['', '', 'Folder', '', 'Folder']);
    assert.equal(panel.navigator.isExpanded('Folder'), true);
  } finally {
    global.window = previousWindow;
  }
});


test('mounted file panel coalesces an overlapping vault refresh into one follow-up reload', async () => {
  const previousWindow = global.window;
  global.window = { VincariosFileNavigator: fileNavigator };

  let listCalls = 0;
  let releaseRefresh;
  const api = {
    vault: {
      listFolder() {
        listCalls += 1;
        if (listCalls === 2) {
          return new Promise((resolve) => {
            releaseRefresh = () => resolve({ ok: true, entries: [] });
          });
        }
        return Promise.resolve({ ok: true, entries: [] });
      },
      onChanged() {
        return () => {};
      }
    }
  };

  try {
    const { root } = createPanelRoot();
    const panel = mountFilePanel({ root, api });
    await panel.openRoot();

    const firstRefresh = panel.refreshTree();
    await Promise.resolve();
    const overlappingRefresh = panel.refreshTree();

    assert.equal(typeof releaseRefresh, 'function');
    releaseRefresh();
    await Promise.all([firstRefresh, overlappingRefresh]);

    assert.equal(listCalls, 3);
  } finally {
    global.window = previousWindow;
  }
});
