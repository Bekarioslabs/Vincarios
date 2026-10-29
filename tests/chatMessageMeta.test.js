'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { formatMessageTime, appendMessage } = require('../src/renderer/chat/mountChat');

test('formatMessageTime renders local hour and minute', () => {
  const date = new Date('2026-06-28T09:07:00');
  assert.equal(formatMessageTime(date), '09:07');
});

test('appendMessage adds assistant footer metadata with save, copy, and time', () => {
  const previousDocument = global.document;
  global.document = createDocumentStub();
  try {
    const appended = [];
    const chatLog = {
      scrollHeight: 100,
      scrollTop: 52,
      clientHeight: 50,
      querySelector() { return null; },
      appendChild(node) { appended.push(node); }
    };
    const message = appendMessage(chatLog, 'assistant', 'Hello world', { reviewBasket: { addProposal() {} }, status: { textContent: '' }, createdAt: new Date('2026-06-28T09:07:00') });

    assert.equal(message.dataset.createdAt.length > 0, true);
    assert.equal(message.querySelector('.chat-message-save').textContent, 'Save as Note');
    assert.equal(message.querySelector('.chat-message-copy').textContent, 'Copy');
    assert.equal(message.querySelector('.chat-message-time').textContent, '09:07');
  } finally {
    global.document = previousDocument;
  }
});

function createDocumentStub() {
  return {
    createElement(tagName) {
      return createNode(tagName);
    }
  };
}

test('Save as Note keeps the response model snapshot rather than a later provider selection', () => {
  const previousDocument = global.document;
  const previousWindow = global.window;
  global.document = createDocumentStub();
  global.window = { VincariosReviewBasketState: require('../src/renderer/review/reviewBasketState') };
  try {
    const basket = global.window.VincariosReviewBasketState.createReviewBasketState();
    const message = appendMessage({ querySelector() { return null; }, appendChild() {} }, 'assistant', '# Summary', {
      reviewBasket: basket, originAction: 'summarize_file',
      auditMetadata: { provider: 'lm-studio', model: 'google/gemma-4-12b-qat' }
    });
    message.querySelector('.chat-message-save').listeners.click();
    assert.deepEqual(basket.getSnapshot().items[0].auditMetadata, {
      origin: 'summarize_file', provider: 'lm-studio', model: 'google/gemma-4-12b-qat'
    });
  } finally {
    global.document = previousDocument;
    global.window = previousWindow;
  }
});

function createNode(tagName) {
  const node = {
    tagName,
    children: [],
    dataset: {},
    attributes: {},
    className: '',
    textContent: '',
    innerHTML: '',
    listeners: {},
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    remove() {},
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    addEventListener(type, listener) { this.listeners[type] = listener; },
    querySelector(selector) {
      return findNode(this, selector);
    },
    classList: {
      add() {}
    }
  };
  return node;
}

function findNode(node, selector) {
  const className = selector.startsWith('.') ? selector.slice(1) : '';
  if (className && String(node.className || '').split(/\s+/).includes(className)) return node;
  for (const child of node.children || []) {
    const found = findNode(child, selector);
    if (found) return found;
  }
  return null;
}
