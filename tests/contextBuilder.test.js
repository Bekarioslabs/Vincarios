'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createContextState,
  buildChatContextPackage,
  looksLikeSelectedTargetRequest
} = require('../src/renderer/context/contextState');

test('context state tracks auto-context separately from selected target', () => {
  const state = createContextState();

  state.setFile('03_Wissen/Topic.md', { content: '# Topic\n\nBody' });
  assert.equal(state.snapshot().autoContextEnabled, true);
  assert.equal(state.snapshot().content, '# Topic\n\nBody');

  state.setAutoContextEnabled(false);
  const snapshot = state.snapshot();
  assert.equal(snapshot.kind, 'file');
  assert.equal(snapshot.path, '03_Wissen/Topic.md');
  assert.equal(snapshot.autoContextEnabled, false);
});

test('context builder includes selected Markdown content only for file-specific requests', () => {
  const context = buildChatContextPackage({
    userText: 'Fasse diese Datei bitte kurz zusammen.',
    selection: {
      kind: 'file',
      path: '03_Wissen/Topic.md',
      content: '# Topic\n\nBody',
      selectionId: 7,
      autoContextEnabled: true
    }
  });

  assert.equal(context.shouldAttach, true);
  assert.match(context.content, /## Active Selection/);
  assert.match(context.content, /Selected type: Markdown file/);
  assert.match(context.content, /Path: 03_Wissen\/Topic.md/);
  assert.match(context.content, /Selection id: 7/);
  assert.match(context.content, /```md\n# Topic\n\nBody\n```/);
  assert.match(context.content, /Use this content only for the current user request/);
});

test('context builder does not attach selected file content for general questions', () => {
  const context = buildChatContextPackage({
    userText: 'What is the biggest fish?',
    selection: {
      kind: 'file',
      path: '03_Wissen/Topic.md',
      content: '# Topic\n\nBody',
      selectionId: 7,
      autoContextEnabled: true
    }
  });

  assert.equal(context.shouldAttach, false);
  assert.equal(context.content, '');
});

test('context builder explains disabled auto-context without leaking file content', () => {
  const context = buildChatContextPackage({
    userText: 'Was steht in dieser Datei?',
    selection: {
      kind: 'file',
      path: '03_Wissen/Topic.md',
      content: '# Secret\n\nDo not leak',
      autoContextEnabled: false
    }
  });

  assert.equal(context.shouldAttach, true);
  assert.match(context.content, /Auto-context is disabled/);
  assert.match(context.content, /Path: 03_Wissen\/Topic.md/);
  assert.doesNotMatch(context.content, /Do not leak/);
});

test('context builder exposes folder targets without loading folder contents', () => {
  const context = buildChatContextPackage({
    userText: 'Schau in diesen Ordner.',
    selection: {
      kind: 'folder',
      path: '02_Projekte/StarLu',
      selectionId: 3,
      autoContextEnabled: true
    }
  });

  assert.equal(context.shouldAttach, true);
  assert.match(context.content, /Selected type: folder/);
  assert.match(context.content, /Selection id: 3/);
  assert.match(context.content, /historical unless they match this exact path and selection id/);
  assert.match(context.content, /Do not claim to know the folder contents/);
});

test('context builder truncates long selected Markdown files with an explicit marker', () => {
  const context = buildChatContextPackage({
    userText: 'Fasse diese Datei zusammen.',
    maxChars: 12,
    selection: {
      kind: 'file',
      path: '03_Wissen/Long.md',
      content: '12345678901234567890',
      autoContextEnabled: true
    }
  });

  assert.match(context.content, /Status: content truncated/);
  assert.match(context.content, /123456789012/);
  assert.match(context.content, /truncated/);
  assert.doesNotMatch(context.content, /34567890\n```/);
});

test('selected target request detection stays narrow enough for general questions', () => {
  assert.equal(looksLikeSelectedTargetRequest('check mal diese datei'), true);
  assert.equal(looksLikeSelectedTargetRequest('was steht in dieser note?'), true);
  assert.equal(looksLikeSelectedTargetRequest('What is the biggest fish?'), false);
});
test('context builder asks for read permission instead of guessing or asking for upload', () => {
  const context = buildChatContextPackage({
    userText: 'Worueber ist diese Datei?',
    selection: {
      kind: 'file',
      path: '00_Inbox/Comic-Verlage.md',
      content: '# Secret\n\nDo not leak',
      readAllowed: false,
      autoContextEnabled: true
    }
  });

  assert.equal(context.shouldAttach, true);
  assert.match(context.content, /Reading is not enabled/);
  assert.match(context.content, /enable R/i);
  assert.doesNotMatch(context.content, /Do not leak/);
  assert.doesNotMatch(context.content, /upload/i);
});

test('context builder treats retry prompts as selected-file follow-up after read is enabled', () => {
  const context = buildChatContextPackage({
    userText: 'versuch es jetzt',
    selection: {
      kind: 'file',
      path: '00_Inbox/Comic-Verlage.md',
      content: '# Comic-Verlage\n\nMarvel and DC',
      readAllowed: true,
      autoContextEnabled: true
    }
  });

  assert.equal(context.shouldAttach, true);
  assert.match(context.content, /# Comic-Verlage/);
});
test('context builder treats read-permission confirmations as selected-file follow-up', () => {
  const context = buildChatContextPackage({
    userText: 'ok hab es aktiviert',
    selection: {
      kind: 'file',
      path: '00_Inbox/Comic-Verlage.md',
      content: '# Comic-Verlage\n\nMarvel and DC',
      readAllowed: true,
      autoContextEnabled: true
    }
  });

  assert.equal(context.shouldAttach, true);
  assert.match(context.content, /# Comic-Verlage/);
});

test('context builder treats selected-file clarification as selected-file follow-up', () => {
  const context = buildChatContextPackage({
    userText: 'sie ist selktiert also solltest du da drauf zugreifen koennen',
    selection: {
      kind: 'file',
      path: '00_Inbox/Comic-Verlage.md',
      content: '# Comic-Verlage\n\nMarvel and DC',
      readAllowed: true,
      autoContextEnabled: true
    }
  });

  assert.equal(context.shouldAttach, true);
  assert.match(context.content, /# Comic-Verlage/);
});

test('context builder keeps missing selected content inside ZEUS workflow instructions', () => {
  const context = buildChatContextPackage({
    userText: 'was ist der inhalt von dieser datei?',
    selection: {
      kind: 'file',
      path: '00_Inbox/Comic-Verlage.md',
      content: '',
      readAllowed: true,
      autoContextEnabled: true
    }
  });

  assert.equal(context.shouldAttach, true);
  assert.match(context.content, /reselect/i);
  assert.match(context.content, /ZEUS/);
  assert.doesNotMatch(context.content, /upload/i);
});

test('context builder maps folder-scoped file requests to the selected file parent folder', () => {
  const context = buildChatContextPackage({
    userText: 'kannst du aehnliche dateien in diesem ordner finden?',
    selection: {
      kind: 'file',
      path: '03_Wissen/Comics/Comic-Verlage.md',
      content: '# Comic-Verlage\n\nMarvel and DC',
      readAllowed: true,
      autoContextEnabled: true
    }
  });

  assert.equal(context.shouldAttach, true);
  assert.match(context.content, /Parent folder: 03_Wissen\/Comics/);
  assert.match(context.content, /read-context pipeline/);
  assert.match(context.content, /# Comic-Verlage/);
});

test('context builder exposes selected folder for listing requests when a folder is active', () => {
  const context = buildChatContextPackage({
    userText: 'liste die dateien',
    selection: {
      kind: 'folder',
      path: '03_Wissen/Comics',
      readAllowed: true,
      autoContextEnabled: true
    }
  });

  assert.equal(context.shouldAttach, true);
  assert.match(context.content, /Selected type: folder/);
  assert.match(context.content, /Path: 03_Wissen\/Comics/);
  assert.match(context.content, /read-context pipeline/);
  assert.doesNotMatch(context.content, /upload/i);
});
