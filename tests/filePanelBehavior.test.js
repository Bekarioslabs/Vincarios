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
    async emitChange(change) {
      await onChanged(change);
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

test('mounted file panel reports watcher failure after refreshing the visible tree', async () => {
  const previousWindow = global.window;
  global.window = { VincariosFileNavigator: fileNavigator };
  try {
    const { root } = createPanelRoot();
    const vault = createVaultApi();
    const reports = [];
    const panel = mountFilePanel({ root, api: vault.api, activityReporter: { report: (entry) => reports.push(entry) } });
    await panel.openRoot();

    await vault.emitChange({ watcherUnavailable: true, code: 'vault_watch_unavailable' });

    assert.deepEqual(vault.calls, ['', '']);
    assert.equal(reports.length, 1);
    assert.match(reports[0].message, /Reopen the vault/);
    assert.equal(reports[0].activity.type, 'warning');
    await vault.emitChange({ affectsMarkdownIndex: true });
    assert.equal(reports.length, 1);
  } finally {
    global.window = previousWindow;
  }
});

test('watcher warning cannot outlive its active vault session or apply to another root', async () => {
  const previousWindow = global.window;
  global.window = { VincariosFileNavigator: fileNavigator };
  try {
    const { root } = createPanelRoot();
    const vault = createVaultApi();
    const reports = [];
    const panel = mountFilePanel({ root, api: vault.api, activityReporter: { report: (entry) => reports.push(entry) } });
    await panel.openRoot('D:/First');
    let release;
    vault.api.vault.listFolder = () => new Promise((resolve) => { release = () => resolve({ ok: true, entries: [] }); });
    const pending = vault.emitChange({ root: 'D:/First', watcherUnavailable: true });
    await panel.openRoot('D:/Second');
    release();
    await pending;
    assert.deepEqual(reports, []);

    vault.api.vault.listFolder = async () => ({ ok: true, entries: [] });
    await vault.emitChange({ root: 'D:/First', watcherUnavailable: true });
    assert.deepEqual(reports, []);
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

for (const [target, targetPath, title] of [
  ['harbor', 'Places/harbor.md', 'Harbor'],
  ['Research Site', 'Places/research-site.md', 'Research Site']
]) {
  test('linked note opens an exact indexed name in another folder: ' + target, async (t) => {
    const fixture = createLinkPanel(t, {
      notes: { [targetPath]: '# Destination' },
      results: [
        { path: '.other-app/backups/snapshot.md', title },
        { path: targetPath, title }
      ]
    });

    const result = await fixture.panel.openLinkedMarkdown(target, 'Characters/Hero.md');

    assert.deepEqual(result, { ok: true, path: targetPath });
    assert.deepEqual(fixture.previews, [{ content: '# Destination', path: targetPath }]);
    assert.equal(fixture.panel.navigator.snapshot().selectedPath, targetPath);
    assert.deepEqual(fixture.panel.navigator.snapshot().expandedFolders, { '': true });
    assert.deepEqual(fixture.queries, [{ query: target, scope: 'files' }]);
    assert.equal(fixture.context.snapshot().readAllowed, false);
    assert.deepEqual(fixture.context.snapshot().contextItems, []);
  });
}

test('linked note prefers an exact filename over another note title', async (t) => {
  const fixture = createLinkPanel(t, {
    notes: { 'Places/harbor.md': '# Correct' },
    results: [
      { path: 'Elsewhere/other.md', title: 'harbor' },
      { path: 'Places/harbor.md', title: 'The Old Harbor' }
    ]
  });

  const result = await fixture.panel.openLinkedMarkdown('harbor', 'Characters/Hero.md');

  assert.equal(result.path, 'Places/harbor.md');
  assert.equal(fixture.previews[0].content, '# Correct');
});

test('linked note refuses ambiguous exact matches instead of opening an arbitrary result', async (t) => {
  const fixture = createLinkPanel(t, { results: [
    { path: 'Places/harbor.md', title: 'Harbor' },
    { path: 'Projects/harbor.md', title: 'Harbor' }
  ] });

  const result = await fixture.panel.openLinkedMarkdown('harbor', 'Characters/Hero.md');

  assert.equal(result.code, 'ambiguous_link');
  assert.deepEqual(fixture.previews, []);
  assert.equal(fixture.panel.navigator.snapshot().selectedPath, '');
});

test('linked note refuses a truncated search because unseen exact matches may exist', async (t) => {
  const fixture = createLinkPanel(t, { truncated: true, results: [{ path: 'Places/harbor.md', title: 'Harbor' }] });

  const result = await fixture.panel.openLinkedMarkdown('harbor', 'Characters/Hero.md');

  assert.equal(result.code, 'ambiguous_link');
  assert.deepEqual(fixture.previews, []);
});

test('linked note reports an unavailable index rather than claiming the target was deleted', async (t) => {
  const fixture = createLinkPanel(t, { searchFailure: { ok: false, code: 'metadata_index_unavailable', message: 'Build vault indexes before searching.' } });

  const result = await fixture.panel.openLinkedMarkdown('harbor', 'Characters/Hero.md');

  assert.equal(result.code, 'metadata_index_unavailable');
  assert.deepEqual(fixture.previews, []);
});

test('linked note does not mistake a partial title match for the intended note', async (t) => {
  const fixture = createLinkPanel(t, { results: [{ path: 'Places/harbor-overview.md', title: 'Harbor overview' }] });

  const result = await fixture.panel.openLinkedMarkdown('Harbor', 'Characters/Hero.md');

  assert.equal(result.code, 'linked_note_not_found');
  assert.deepEqual(fixture.previews, []);
});

test('explicit relative linked paths open without an index lookup', async (t) => {
  const fixture = createLinkPanel(t, { notes: { 'Places/harbor.md': '# Harbor' } });

  const result = await fixture.panel.openLinkedMarkdown('../Places/harbor.md', 'Characters/Hero.md');

  assert.equal(result.path, 'Places/harbor.md');
  assert.deepEqual(fixture.queries, []);
});

test('missing explicit linked paths are not broadened to unrelated indexed notes', async (t) => {
  const fixture = createLinkPanel(t, { results: [{ path: 'Elsewhere/harbor.md', title: 'Harbor' }] });

  const result = await fixture.panel.openLinkedMarkdown('../Places/harbor.md', 'Characters/Hero.md');

  assert.equal(result.code, 'linked_note_not_found');
  assert.deepEqual(fixture.queries, []);
});

test('linked note retains the unsaved-editor navigation decision for indexed targets', async (t) => {
  const fixture = createLinkPanel(t, {
    notes: { 'Places/harbor.md': '# Harbor' },
    results: [{ path: 'Places/harbor.md', title: 'Harbor' }],
    navigation: { ok: false, code: 'navigation_cancelled' }
  });

  const result = await fixture.panel.openLinkedMarkdown('Harbor', 'Characters/Hero.md');

  assert.equal(result.code, 'navigation_cancelled');
  assert.deepEqual(fixture.previews, []);
  assert.equal(fixture.panel.navigator.snapshot().selectedPath, '');
});

test('linked note preserves protected-path failures without broader index lookup', async (t) => {
  const fixture = createLinkPanel(t, { readFailure: { ok: false, code: 'protected_path', message: 'Protected runtime folders are not allowed.' } });

  const result = await fixture.panel.openLinkedMarkdown('.obsidian/Secret.md', 'Characters/Hero.md');

  assert.equal(result.code, 'protected_path');
  assert.deepEqual(fixture.queries, []);
  assert.deepEqual(fixture.previews, []);
});

function createLinkPanel(t, options) {
  const previousWindow = global.window;
  global.window = {
    VincariosFileNavigator: fileNavigator,
    VincariosMarkdownLinkResolver: require('../src/renderer/markdown/markdownLinkResolver')
  };
  t.after(() => { global.window = previousWindow; });
  const previews = [];
  const queries = [];
  const context = require('../src/renderer/context/contextState').createContextState();
  const { root } = createPanelRoot();
  const panel = mountFilePanel({
    root,
    contextState: context,
    previewController: {
      setSource(content, path) { previews.push({ content, path }); },
      requestNavigation() { return Promise.resolve(options.navigation || { ok: true }); }
    },
    api: {
      vault: {
        async readMarkdown(path) {
          if (options.readFailure) return options.readFailure;
          return Object.hasOwn(options.notes || {}, path)
            ? { ok: true, path, content: options.notes[path] }
            : { ok: false, code: 'file_not_found', message: 'Markdown file does not exist.' };
        },
        listFolder() { throw new Error('Link navigation must not expand the file tree.'); }
      },
      search: {
        async query(payload) {
          queries.push(payload);
          return options.searchFailure || { ok: true, results: options.results || [], truncated: options.truncated === true };
        }
      }
    }
  });
  return { panel, previews, queries, context };
}
