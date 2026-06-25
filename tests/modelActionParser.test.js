'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseModelActionCalls,
  stripModelActionCalls
} = require('../src/shared/actions/modelActionParser');

test('model action parser extracts list_folder tool-call fragments', () => {
  const calls = parseModelActionCalls('<|tool_call>call:list_folder{path: "00_Inbox/AI Responses"}<tool_call|>');

  assert.equal(calls.length, 1);
  assert.equal(calls[0].type, 'list_folder');
  assert.equal(calls[0].path, '00_Inbox/AI Responses');
});

test('model action parser strips tool-call fragments from visible assistant text', () => {
  const text = 'I will inspect it.\n<|tool_call>call:list_folder{path: "03_Wissen"}<tool_call|>';

  assert.equal(stripModelActionCalls(text), 'I will inspect it.');
});

test('model action parser also accepts pipe-closed opening tokens', () => {
  const calls = parseModelActionCalls('<|tool_call|>call:list_folder{path: "03_Wissen"}<tool_call|>');

  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, '03_Wissen');
});