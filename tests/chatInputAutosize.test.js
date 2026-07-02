'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { autoSizeChatInput } = require('../src/renderer/chat/mountChat');

test('chat input auto-size grows until max height, then scrolls', () => {
  const previousWindow = global.window;
  global.window = {
    getComputedStyle() {
      return { minHeight: '40px', maxHeight: '100px' };
    }
  };

  try {
    const input = { style: {}, scrollHeight: 72 };
    autoSizeChatInput(input);
    assert.equal(input.style.height, '72px');
    assert.equal(input.style.overflowY, 'hidden');

    input.scrollHeight = 140;
    autoSizeChatInput(input);
    assert.equal(input.style.height, '100px');
    assert.equal(input.style.overflowY, 'auto');
  } finally {
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
  }
});