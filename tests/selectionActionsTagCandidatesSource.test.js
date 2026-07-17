'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('tag candidate action module loads before selection action mount', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const tagIndex = html.indexOf('./src/renderer/selectionActions/tagCandidateAction.js');
  const mountIndex = html.indexOf('./src/renderer/selectionActions/mountSelectionActions.js');

  assert.equal(tagIndex > -1, true);
  assert.equal(tagIndex < mountIndex, true);
});

test('selection actions expose suggest tags for markdown files', () => {
  const registry = require('../src/renderer/selectionActions/actionRegistry');
  const actions = registry.getSelectionActions({
    kind: 'file',
    path: '02_Projects/StarLu/Luna.md',
    content: '# Luna',
    readAllowed: true,
    writeAllowed: true
  });
  const action = actions.find((entry) => entry.id === 'file.suggestTags');

  assert.equal(Boolean(action), true);
  assert.equal(action.category, 'write');
  assert.equal(action.requiredPermission, 'write');
  assert.equal(action.softDisabled, false);
});

test('selection action panel routes suggest tags into suggestions state', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'selectionActions', 'mountSelectionActions.js'), 'utf8');

  assert.match(source, /if \(action\.id === 'file\.suggestTags'\)/);
  assert.match(source, /suggestTags\(snapshot\)/);
  assert.match(source, /buildTagCandidates/);
  assert.match(source, /suggestionState.addGroup/);
  assert.match(source, /Tag candidates added to Suggestions/);
  assert.doesNotMatch(source, /file.suggestTags[sS]{0,500}reviewBasket.addProposal/);
  assert.match(source, /result\.code === 'frontmatter_invalid'/);
  assert.match(source, /Fix the frontmatter in Source editor, then try again\./);
  assert.match(source, /label: 'Open source'/);
  assert.match(source, /openSourceEditor\(snapshot/);
});
