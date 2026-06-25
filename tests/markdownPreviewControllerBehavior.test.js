'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

function createNode() {
  return {
    disabled: false,
    hidden: false,
    textContent: '',
    innerHTML: '',
    value: '',
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
    contains() {
      return true;
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

test('preview controller delegates rendered Markdown link clicks to onOpenLink', async () => {
  global.window = {
    ZeusMarkdownRenderer: {
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
    ZeusMarkdownRenderer: {
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
    ZeusMarkdownRenderer: {
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
test('preview controller shows missing link feedback near the preview toolbar', async () => {
  global.window = {
    ZeusMarkdownRenderer: {
      renderMarkdown() {
        return '<span class="markdown-wikilink" data-link-target="Missing_Target">Missing_Target</span>';
      }
    }
  };
  delete require.cache[require.resolve('../src/renderer/markdown/markdownPreviewController')];
  const { mountMarkdownPreview } = require('../src/renderer/markdown/markdownPreviewController');
  const preview = createNode();
  const feedback = createNode();
  const nodes = {
    '#markdown-preview': preview,
    '#markdown-source-editor': createNode(),
    '#markdown-edit-toggle': createNode(),
    '#markdown-reveal-current': createNode(),
    '#markdown-link-feedback': feedback,
    '#markdown-preview-title': createNode()
  };
  const controller = mountMarkdownPreview({
    app: createApp(nodes),
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
  assert.equal(feedback.textContent, 'Linked note not found: Missing_Target');
  delete global.window;
});