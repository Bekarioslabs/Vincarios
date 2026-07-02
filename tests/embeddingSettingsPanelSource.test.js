const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../src/renderer/settings/mountSettingsPanel.js'), 'utf8');

test('settings embeddings panel shows the selected V1 default model decision', () => {
  assert.match(source, /sentence-transformers\/paraphrase-multilingual-MiniLM-L12-v2/);
  assert.match(source, /Xenova\/paraphrase-multilingual-MiniLM-L12-v2/);
  assert.match(source, /Apache-2\.0/);
  assert.match(source, /Transformers\.js \/ ONNX/);
  assert.match(source, /Vault \.zeus\/index/);
});
