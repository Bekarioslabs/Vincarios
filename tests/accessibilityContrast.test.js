'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readTokens() {
  return fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'tokens.css'), 'utf8');
}

function token(css, name) {
  const match = css.match(new RegExp(name + ':\\s*(#[0-9a-fA-F]{6})'));
  assert.ok(match, 'Missing token ' + name);
  return match[1];
}

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255);
}

function linearize(channel) {
  return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(linearize);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

test('core UI text tokens meet WCAG AA contrast on primary backgrounds', () => {
  const css = readTokens();
  const primary = token(css, '--background-primary');
  const secondary = token(css, '--background-secondary');

  assert.ok(contrast(token(css, '--text-normal'), primary) >= 4.5);
  assert.ok(contrast(token(css, '--text-normal'), secondary) >= 4.5);
  assert.ok(contrast(token(css, '--text-muted'), primary) >= 4.5);
  assert.ok(contrast(token(css, '--text-muted'), secondary) >= 4.5);
  assert.ok(contrast(token(css, '--text-accent'), primary) >= 4.5);
  assert.ok(contrast(token(css, '--text-on-accent'), token(css, '--interactive-accent')) >= 4.5);
});