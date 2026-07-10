'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createActivityState } = require('../src/renderer/activity/activityState');
const { mountSessionLog } = require('../src/renderer/activity/mountSessionLog');

function createNode(tagName) {
  return {
    tagName: tagName || 'div',
    className: '',
    textContent: '',
    hidden: false,
    children: [],
    classList: {
      add(name) {
        this.owner.className = [this.owner.className, name].filter(Boolean).join(' ');
      }
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    set innerHTML(value) {
      this.children = [];
      this.textContent = value;
    },
    get innerHTML() {
      return this.textContent;
    }
  };
}

function createDocument() {
  return {
    createElement(tagName) {
      const node = createNode(tagName);
      node.classList.owner = node;
      return node;
    }
  };
}

test('session log renders empty state and structured activity entries', () => {
  const previousDocument = global.document;
  global.document = createDocument();
  try {
    const root = createNode('section');
    root.classList.owner = root;
    const activityState = createActivityState();

    mountSessionLog({ root, activityState });
    assert.equal(root.children[0].textContent, 'Session Log');
    assert.equal(root.children[1].textContent, 'No session events yet.');

    activityState.record({
      type: 'warning',
      action: 'Renamed',
      targetPath: '00_Inbox/Note.md',
      detail: 'Links were not updated in V1.'
    });

    const list = root.children[1];
    const entry = list.children[0];
    assert.match(entry.className, /session-log-entry-warning/);
    assert.equal(entry.children[1].children[0].textContent, 'Renamed');
    assert.equal(entry.children[1].children[1].textContent, '00_Inbox/Note.md');
    assert.equal(entry.children[1].children[2].textContent, 'Links were not updated in V1.');
  } finally {
    if (previousDocument === undefined) delete global.document;
    else global.document = previousDocument;
  }
});
