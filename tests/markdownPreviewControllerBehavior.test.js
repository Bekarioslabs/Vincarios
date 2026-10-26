'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function createNode() {
  const classes = new Set();
  return {
    disabled: false,
    hidden: false,
    textContent: '',
    innerHTML: '',
    value: '',
    listeners: {},
    attributes: {},
    classList: {
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      contains(name) { return classes.has(name); },
      toggle(name, force) {
        if (force === true) classes.add(name);
        else if (force === false) classes.delete(name);
        else if (classes.has(name)) classes.delete(name);
        else classes.add(name);
      }
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    getAttribute(name) {
      return this.attributes[name];
    },
    removeAttribute(name) {
      delete this.attributes[name];
      if (name === 'hidden') this.hidden = false;
    },
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
    contains() {
      return true;
    },
    querySelectorAll() {
      return [];
    },
    querySelector() {
      return null;
    },
    appendChild(child) {
      this.child = child;
    },
    focus() {}
  };
}

function createApp(nodes) {
  return {
    querySelector(selector) {
      return nodes[selector] || null;
    }
  };
}

test('opening a CRLF note in the LF-normalizing editor does not create phantom edits', async () => {
  const previousWindow = global.window;
  global.window = { VincariosMarkdownRenderer: { renderMarkdown: (source) => source } };
  try {
    const { mountMarkdownPreview } = require('../src/renderer/markdown/markdownPreviewController');
    const editor = createNode();
    const toggle = createNode();
    const propose = createNode();
    const previewStatus = createNode();
    let value = '';
    Object.defineProperty(editor, 'value', { get: () => value, set: (next) => { value = String(next).replace(/\r\n?/g, '\n'); } });
    let navigationRequests = 0;
    let proposal;
    const controller = mountMarkdownPreview({
      app: createApp({ '#markdown-preview': createNode(), '#markdown-source-editor': editor, '#markdown-edit-toggle': toggle, '#markdown-propose-update': propose, '#markdown-preview-status': previewStatus }),
      onResolveUnsavedNavigation: () => { navigationRequests += 1; return 'stay'; },
      onProposeUpdate: (item) => { proposal = item; return { ok: true }; }
    });
    const current = '# Note\r\n\r\nOriginal body.\r\n';
    controller.setSource(current, 'Note.md');
    toggle.listeners.click();
    editor.listeners.input();
    assert.equal(propose.disabled, true);
    assert.equal((await controller.requestNavigation('Other.md')).ok, true);
    assert.equal(navigationRequests, 0);
    editor.value += 'New line.\n';
    editor.listeners.input();
    propose.listeners.click();
    assert.equal(proposal.currentContent, current);
    assert.equal(proposal.proposedContent, current + 'New line.\r\n');
    toggle.listeners.click();
    assert.equal(propose.disabled, false);
    controller.setSource(proposal.proposedContent, 'Note.md');
    toggle.listeners.click();
    editor.listeners.input();
    assert.equal(propose.disabled, true);
    assert.equal((await controller.requestNavigation('Other.md')).ok, true);
    assert.equal(navigationRequests, 0);
  } finally { global.window = previousWindow; }
});

test('window unload uses current editor dirtiness in source and preview modes', () => {
  const previousWindow = global.window;
  const listeners = new Map();
  global.window = {
    VincariosMarkdownRenderer: { renderMarkdown: (source) => source },
    addEventListener: (type, callback) => listeners.set(type, callback)
  };
  try {
    const { mountMarkdownPreview } = require('../src/renderer/markdown/markdownPreviewController');
    const editor = createNode();
    const toggle = createNode();
    const propose = createNode();
    const controller = mountMarkdownPreview({
      app: createApp({ '#markdown-preview': createNode(), '#markdown-source-editor': editor, '#markdown-edit-toggle': toggle, '#markdown-propose-update': propose }),
      onProposeUpdate: () => ({ ok: true })
    });
    const beforeUnload = listeners.get('beforeunload');
    assert.equal(typeof beforeUnload, 'function');
    function assertBlocked(expected) {
      let blocked = false;
      const event = { preventDefault() { blocked = true; } };
      beforeUnload(event);
      assert.equal(blocked, expected);
      assert.equal(event.returnValue, expected ? '' : undefined);
    }
    assertBlocked(false);
    const original = '# Original\r\n';
    controller.setSource(original, 'Note.md');
    toggle.listeners.click();
    editor.value = '# Original\n';
    assertBlocked(false);
    editor.value = '# Edited\n';
    assertBlocked(true);
    propose.listeners.click();
    assertBlocked(true);
    toggle.listeners.click();
    assertBlocked(true);
    controller.setSource('# Edited\r\n', 'Note.md');
    assertBlocked(false);
    toggle.listeners.click();
    editor.value = '# Later draft';
    assertBlocked(true);
    editor.value = '# Edited\n';
    assertBlocked(false);
    controller.setMessage('No file selected.');
    assertBlocked(false);
  } finally { global.window = previousWindow; }
});

test('preview controller keeps the toolbar title neutral when no file is selected', () => {
  global.window = {
    VincariosMarkdownRenderer: {
      renderMarkdown(source) { return '<p>' + source + '</p>'; }
    }
  };
  delete require.cache[require.resolve('../src/renderer/markdown/markdownPreviewController')];
  const { mountMarkdownPreview } = require('../src/renderer/markdown/markdownPreviewController');
  const title = createNode();
  const controller = mountMarkdownPreview({
    app: createApp({
      '#markdown-preview': createNode(),
      '#markdown-source-editor': createNode(),
      '#markdown-edit-toggle': createNode(),
      '#markdown-preview-title': title
    })
  });

  assert.equal(title.textContent, '');
  controller.setMessage('No file selected.');
  assert.equal(title.textContent, '');
  delete global.window;
});

test('preview controller delegates rendered Markdown link clicks to onOpenLink', async () => {
  global.window = {
    VincariosMarkdownRenderer: {
      renderMarkdown() {
        return '<span class="markdown-wikilink" data-link-target="Target">Target</span>';
      }
    }
  };
  const { mountMarkdownPreview } = require('../src/renderer/markdown/markdownPreviewController');
  const preview = createNode();
  const nodes = {
    '#markdown-preview': preview,
    '#markdown-source-editor': createNode(),
    '#markdown-edit-toggle': createNode(),
    '#markdown-reveal-current': createNode(),
    '#markdown-preview-title': createNode()
  };
  let opened = null;
  const controller = mountMarkdownPreview({
    app: createApp(nodes),
    onOpenLink(request) {
      opened = request;
      return { ok: true, path: 'Target.md' };
    }
  });

  controller.setSource('[[Target]]', 'Folder/Current.md');
  let prevented = false;
  await preview.listeners.click({
    target: {
      dataset: { linkTarget: 'Target' },
      closest() { return this; }
    },
    preventDefault() { prevented = true; }
  });

  assert.equal(prevented, true);
  assert.deepEqual(opened, { target: 'Target', currentPath: 'Folder/Current.md' });
  delete global.window;
});

test('preview controller enables Reveal in Files for loaded notes and delegates current path', async () => {
  global.window = {
    VincariosMarkdownRenderer: {
      renderMarkdown() { return '<p>Note</p>'; }
    }
  };
  delete require.cache[require.resolve('../src/renderer/markdown/markdownPreviewController')];
  const { mountMarkdownPreview } = require('../src/renderer/markdown/markdownPreviewController');
  const revealButton = createNode();
  const nodes = {
    '#markdown-preview': createNode(),
    '#markdown-source-editor': createNode(),
    '#markdown-edit-toggle': createNode(),
    '#markdown-reveal-current': revealButton,
    '#markdown-preview-title': createNode()
  };
  let revealedPath = '';
  const controller = mountMarkdownPreview({
    app: createApp(nodes),
    onRevealCurrentPath(path) {
      revealedPath = path;
      return { ok: true, path };
    }
  });

  assert.equal(revealButton.disabled, true);
  controller.setSource('# Note', 'Folder/Current.md');
  assert.equal(revealButton.disabled, false);
  await revealButton.listeners.click();

  assert.equal(revealedPath, 'Folder/Current.md');
  delete global.window;
});
test('preview controller tracks note history for back and forward navigation', async () => {
  global.window = {
    VincariosMarkdownRenderer: {
      renderMarkdown(source) { return '<p>' + source + '</p>'; }
    }
  };
  delete require.cache[require.resolve('../src/renderer/markdown/markdownPreviewController')];
  const { mountMarkdownPreview } = require('../src/renderer/markdown/markdownPreviewController');
  const backButton = createNode();
  const forwardButton = createNode();
  const title = createNode();
  const nodes = {
    '#markdown-preview': createNode(),
    '#markdown-source-editor': createNode(),
    '#markdown-edit-toggle': createNode(),
    '#markdown-reveal-current': createNode(),
    '#markdown-history-back': backButton,
    '#markdown-history-forward': forwardButton,
    '#markdown-preview-title': title
  };
  const opened = [];
  const controller = mountMarkdownPreview({
    app: createApp(nodes),
    onOpenHistoryPath(path) {
      opened.push(path);
      return { ok: true };
    }
  });

  controller.setSource('# First', 'Folder/First.md');
  controller.setSource('# Second', 'Folder/Second.md');
  controller.setSource('# Third', 'Folder/Third.md');

  assert.equal(backButton.disabled, false);
  assert.equal(forwardButton.disabled, true);
  await backButton.listeners.click();

  assert.deepEqual(opened, ['Folder/Second.md']);
  assert.equal(title.textContent, 'Folder/Second.md');
  assert.equal(forwardButton.disabled, false);

  await forwardButton.listeners.click();

  assert.deepEqual(opened, ['Folder/Second.md', 'Folder/Third.md']);
  assert.equal(title.textContent, 'Folder/Third.md');
  delete global.window;
});
test('preview controller shows missing link feedback in the preview status area', async () => {
  global.window = {
    VincariosMarkdownRenderer: {
      renderMarkdown() {
        return '<span class="markdown-wikilink" data-link-target="Missing_Target">Missing_Target</span>';
      }
    }
  };
  delete require.cache[require.resolve('../src/renderer/markdown/markdownPreviewController')];
  const { mountMarkdownPreview } = require('../src/renderer/markdown/markdownPreviewController');
  const preview = createNode();
  const feedback = createNode();
  const activity = [];
  const nodes = {
    '#markdown-preview': preview,
    '#markdown-source-editor': createNode(),
    '#markdown-edit-toggle': createNode(),
    '#markdown-reveal-current': createNode(),
    '#markdown-preview-status': feedback,
    '#markdown-preview-title': createNode()
  };
  const controller = mountMarkdownPreview({
    app: createApp(nodes),
    onPreviewFeedback(event) {
      activity.push(event);
    },
    onOpenLink() {
      return { ok: false, message: 'Linked note not found: Missing_Target' };
    }
  });

  controller.setSource('[[Missing_Target]]', 'Folder/Current.md');
  await preview.listeners.click({
    target: {
      dataset: { linkTarget: 'Missing_Target' },
      closest() { return this; }
    },
    preventDefault() {}
  });

  assert.equal(feedback.hidden, false);
  assert.equal(feedback.classList.contains('is-empty'), false);
  assert.equal(feedback.textContent, 'Linked note not found: Missing_Target');
  assert.deepEqual(activity, [{
    message: 'Linked note not found: Missing_Target',
    targetPath: 'Folder/Current.md',
    type: 'warning',
    action: 'Preview link'
  }]);
  delete global.window;
});
test('preview controller turns local source edits into update proposals', async () => {
  global.window = {
    VincariosMarkdownRenderer: {
      renderMarkdown(source) { return '<p>' + source + '</p>'; }
    }
  };
  delete require.cache[require.resolve('../src/renderer/markdown/markdownPreviewController')];
  const { mountMarkdownPreview } = require('../src/renderer/markdown/markdownPreviewController');
  const editor = createNode();
  const editButton = createNode();
  const proposeButton = createNode();
  const status = createNode();
  const nodes = {
    '#markdown-preview': createNode(),
    '#markdown-source-editor': editor,
    '#markdown-edit-toggle': editButton,
    '#markdown-propose-update': proposeButton,
    '#markdown-reveal-current': createNode(),
    '#markdown-preview-title': createNode()
  };
  let proposal = null;
  const controller = mountMarkdownPreview({
    app: createApp(nodes),
    status,
    onProposeUpdate(nextProposal) {
      proposal = nextProposal;
      return { ok: true };
    }
  });

  controller.setSource('# Old', 'Folder/Note.md');
  assert.equal(proposeButton.disabled, true);

  editButton.listeners.click();
  editor.value = '# New';
  editor.listeners.input();

  assert.equal(proposeButton.disabled, false);
  proposeButton.listeners.click();

  assert.equal(proposal.type, 'update_note');
  assert.equal(proposal.targetPath, 'Folder/Note.md');
  assert.equal(proposal.currentContent, '# Old');
  assert.equal(proposal.proposedContent, '# New');
  assert.equal(proposal.updateMode, 'whole_note');
  assert.match(status.textContent, /Review Basket/);
  delete global.window;
});


test('unsaved navigation dialog identifies the local draft, not the next file', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'markdown', 'markdownPreviewController.js'), 'utf8');

  assert.match(source, /target\.textContent = request\.currentPath;/);
  assert.doesNotMatch(source, /target\.textContent = request\.targetPath;/);
});
test('preview controller blocks navigation away from unsaved local source when the user stays', async () => {
  global.window = {
    VincariosMarkdownRenderer: {
      renderMarkdown(source) { return '<p>' + source + '</p>'; }
    }
  };
  delete require.cache[require.resolve('../src/renderer/markdown/markdownPreviewController')];
  const { mountMarkdownPreview } = require('../src/renderer/markdown/markdownPreviewController');
  const editor = createNode();
  const editButton = createNode();
  let request = null;
  const controller = mountMarkdownPreview({
    app: createApp({
      '#markdown-preview': createNode(),
      '#markdown-source-editor': editor,
      '#markdown-edit-toggle': editButton,
      '#markdown-propose-update': createNode(),
      '#markdown-reveal-current': createNode(),
      '#markdown-preview-title': createNode()
    }),
    onResolveUnsavedNavigation(nextRequest) {
      request = nextRequest;
      return 'stay';
    }
  });

  controller.setSource('# Original', 'Folder/Note-A.md');
  editButton.listeners.click();
  editor.value = '# Draft';
  editor.listeners.input();

  const result = await controller.requestNavigation('Folder/Note-B.md');

  assert.deepEqual(request, {
    currentPath: 'Folder/Note-A.md',
    targetPath: 'Folder/Note-B.md'
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'stay');
  assert.equal(controller.getCurrentPath(), 'Folder/Note-A.md');
  assert.equal(editor.value, '# Draft');
  delete global.window;
});

test('preview controller adds unsaved local source to review before allowing navigation', async () => {
  global.window = {
    VincariosMarkdownRenderer: {
      renderMarkdown(source) { return '<p>' + source + '</p>'; }
    }
  };
  delete require.cache[require.resolve('../src/renderer/markdown/markdownPreviewController')];
  const { mountMarkdownPreview } = require('../src/renderer/markdown/markdownPreviewController');
  const editor = createNode();
  const editButton = createNode();
  let proposal = null;
  const controller = mountMarkdownPreview({
    app: createApp({
      '#markdown-preview': createNode(),
      '#markdown-source-editor': editor,
      '#markdown-edit-toggle': editButton,
      '#markdown-propose-update': createNode(),
      '#markdown-reveal-current': createNode(),
      '#markdown-preview-title': createNode()
    }),
    onResolveUnsavedNavigation() {
      return 'review';
    },
    onProposeUpdate(nextProposal) {
      proposal = nextProposal;
      return { ok: true };
    }
  });

  controller.setSource('# Original', 'Folder/Note-A.md');
  editButton.listeners.click();
  editor.value = '# Draft';
  editor.listeners.input();

  const result = await controller.requestNavigation('Folder/Note-B.md');

  assert.equal(result.ok, true);
  assert.equal(result.reason, 'review');
  assert.equal(proposal.targetPath, 'Folder/Note-A.md');
  assert.equal(proposal.proposedContent, '# Draft');
  delete global.window;
});
test('preview controller shows update proposal failures in the preview status area', async () => {
  global.window = {
    VincariosMarkdownRenderer: {
      renderMarkdown(source) { return '<p>' + source + '</p>'; }
    }
  };
  delete require.cache[require.resolve('../src/renderer/markdown/markdownPreviewController')];
  const { mountMarkdownPreview } = require('../src/renderer/markdown/markdownPreviewController');
  const editor = createNode();
  const editButton = createNode();
  const proposeButton = createNode();
  const feedback = createNode();
  const status = createNode();
  const nodes = {
    '#markdown-preview': createNode(),
    '#markdown-source-editor': editor,
    '#markdown-edit-toggle': editButton,
    '#markdown-propose-update': proposeButton,
    '#markdown-reveal-current': createNode(),
    '#markdown-preview-status': feedback,
    '#markdown-preview-title': createNode()
  };
  const controller = mountMarkdownPreview({
    app: createApp(nodes),
    status,
    onProposeUpdate() {
      return { ok: false, message: 'Please enable W for this file before updating: Folder/Note.md' };
    }
  });

  controller.setSource('# Old', 'Folder/Note.md');
  editButton.listeners.click();
  editor.value = '# New';
  editor.listeners.input();
  proposeButton.listeners.click();

  const previewStatus = nodes['#markdown-preview-status'];
  assert.equal(previewStatus.hidden, false);
  assert.equal(previewStatus.classList.contains('is-empty'), false);
  assert.equal(previewStatus.textContent, 'Please enable W for this file before updating: Folder/Note.md');
  assert.equal(status.textContent, '');
  delete global.window;
});
test('preview controller shows local-edit status only after content changes', () => {
  global.window = {
    VincariosMarkdownRenderer: {
      renderMarkdown(source) { return '<p>' + source + '</p>'; }
    }
  };
  delete require.cache[require.resolve('../src/renderer/markdown/markdownPreviewController')];
  const { mountMarkdownPreview } = require('../src/renderer/markdown/markdownPreviewController');
  const editor = createNode();
  const editButton = createNode();
  const previewStatus = createNode();
  const nodes = {
    '#markdown-preview': createNode(),
    '#markdown-source-editor': editor,
    '#markdown-edit-toggle': editButton,
    '#markdown-propose-update': createNode(),
    '#markdown-reveal-current': createNode(),
    '#markdown-preview-status': previewStatus,
    '#markdown-preview-title': createNode()
  };
  const controller = mountMarkdownPreview({ app: createApp(nodes) });

  controller.setSource('# Original', 'Folder/Note.md');
  editButton.listeners.click();
  assert.equal(previewStatus.hidden, false);
  assert.equal(previewStatus.classList.contains('is-empty'), true);
  assert.equal(previewStatus.textContent, '');

  editButton.listeners.click();
  assert.equal(previewStatus.hidden, false);
  assert.equal(previewStatus.classList.contains('is-empty'), true);
  assert.equal(previewStatus.textContent, '');

  editButton.listeners.click();
  editor.value = '# Changed';
  editor.listeners.input();
  assert.equal(previewStatus.hidden, false);
  assert.match(previewStatus.textContent, /local changes/i);

  delete global.window;
});
test('preview controller resolves Markdown image placeholders through the vault API', async () => {
  let imageNode = null;
  global.window = {
    VincariosMarkdownRenderer: {
      renderMarkdown() {
        return '<img class="markdown-image-embed" data-image-target="assets/hero.png" alt="Hero" data-image-state="pending">';
      }
    }
  };
  delete require.cache[require.resolve('../src/renderer/markdown/markdownPreviewController')];
  const { mountMarkdownPreview } = require('../src/renderer/markdown/markdownPreviewController');
  const preview = createNode();
  preview.querySelectorAll = () => [imageNode];
  imageNode = {
    dataset: { imageTarget: 'assets/hero.png' },
    setAttribute(name, value) { this[name] = value; },
    removeAttribute(name) { delete this[name]; }
  };
  const nodes = {
    '#markdown-preview': preview,
    '#markdown-source-editor': createNode(),
    '#markdown-edit-toggle': createNode(),
    '#markdown-reveal-current': createNode(),
    '#markdown-preview-title': createNode()
  };
  const requests = [];
  const controller = mountMarkdownPreview({
    app: createApp(nodes),
    api: {
      vault: {
        readImageAsset(payload) {
          requests.push(payload);
          return Promise.resolve({ ok: true, path: 'Folder/assets/hero.png', dataUrl: 'data:image/png;base64,AAAA' });
        }
      }
    }
  });

  controller.setSource('![Hero](assets/hero.png)', 'Folder/Note.md');
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(requests, [{ targetPath: 'assets/hero.png', currentPath: 'Folder/Note.md' }]);
  assert.equal(imageNode.src, 'data:image/png;base64,AAAA');
  assert.equal(imageNode.dataset.imageState, 'loaded');
  assert.equal(imageNode['data-image-path'], 'Folder/assets/hero.png');
  delete global.window;
});

test('preview controller displays a standalone selected image through the vault API', async () => {
  global.window = {
    VincariosMarkdownRenderer: {
      renderMarkdown(source) { return '<p>' + source + '</p>'; }
    }
  };
  delete require.cache[require.resolve('../src/renderer/markdown/markdownPreviewController')];
  const { mountMarkdownPreview } = require('../src/renderer/markdown/markdownPreviewController');
  const preview = createNode();
  const imageNode = {
    dataset: { imageTarget: 'Images/Hero.png' },
    setAttribute(name, value) { this[name] = value; },
    removeAttribute(name) { delete this[name]; }
  };
  preview.querySelectorAll = () => [imageNode];
  const editButton = createNode();
  const revealButton = createNode();
  const title = createNode();
  const nodes = {
    '#markdown-preview': preview,
    '#markdown-source-editor': createNode(),
    '#markdown-edit-toggle': editButton,
    '#markdown-propose-update': createNode(),
    '#markdown-reveal-current': revealButton,
    '#markdown-preview-title': title
  };
  const requests = [];
  const controller = mountMarkdownPreview({
    app: createApp(nodes),
    api: {
      vault: {
        readImageAsset(payload) {
          requests.push(payload);
          return Promise.resolve({ ok: true, path: 'Images/Hero.png', dataUrl: 'data:image/png;base64,AAAA' });
        }
      }
    }
  });

  controller.setImageAsset('Images/Hero.png');
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(title.textContent, 'Images/Hero.png');
  assert.equal(editButton.disabled, true);
  assert.equal(revealButton.disabled, false);
  assert.deepEqual(requests, [{ targetPath: 'Images/Hero.png', currentPath: 'Images/Hero.png' }]);
  assert.equal(imageNode.src, 'data:image/png;base64,AAAA');
  assert.equal(imageNode.dataset.imageState, 'loaded');
  delete global.window;
});
