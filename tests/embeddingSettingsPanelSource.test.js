const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../src/renderer/settings/mountSettingsPanel.js'), 'utf8');
const controllerSource = fs.readFileSync(path.join(__dirname, '../src/renderer/settings/indexSettingsController.js'), 'utf8');
const sourceOptions = fs.readFileSync(path.join(__dirname, '../src/renderer/embeddings/similaritySourceOptions.js'), 'utf8');

test('settings embeddings panel shows the selected V1 default model decision', () => {
  assert.match(source, /sentence-transformers\/paraphrase-multilingual-MiniLM-L12-v2/);
  assert.match(source, /Xenova\/paraphrase-multilingual-MiniLM-L12-v2/);
  assert.match(source, /Apache-2\.0/);
  assert.match(source, /Transformers\.js \/ ONNX/);
  assert.match(source, /Vault \.vincarios\/index/);
});


test('settings index panel owns combined vault index status and explicit refresh controls', () => {
  assert.match(source, /data-settings-vault-index-status/);
  assert.match(source, /data-settings-vault-index-counts/);
  assert.match(source, /data-settings-refresh-vault-indexes/);
  assert.match(controllerSource, /api.indexes.getHealth/);
  assert.match(controllerSource, /api.indexes.refresh/);
  assert.match(controllerSource, /No index yet./);
  assert.match(controllerSource, /Vault indexes require refresh./);
});


test('Embedding settings use the same explicit source choices without percentage weights', () => {
  assert.match(controllerSource, /createEmbeddingModeField/);
  assert.match(controllerSource, /VincariosSimilaritySourceOptions/);
  assert.match(sourceOptions, /Content/);
  assert.match(sourceOptions, /Metadata/);
  assert.match(sourceOptions, /Both/);
  assert.doesNotMatch(controllerSource, /createEmbeddingWeightField/);
});


test('settings subscribes to the shared vault index health event', () => {
  assert.match(controllerSource, /api.indexes.onHealthChanged/);
  assert.match(controllerSource, /stale: 'Index needs refresh after vault changes\.'/);
  assert.match(controllerSource, /Index needs refresh/);
});


test('settings index status uses the same stateful visual indicator as Files', () => {
  const css = fs.readFileSync(path.join(__dirname, '../src/renderer/styles/settings.css'), 'utf8');
  assert.match(source, /data-settings-vault-index-status/);
  assert.match(controllerSource, /dataset.indexState/);
  assert.equal(css.includes('.settings-embedding-index-status[data-index-state="ready"]'), true);
});


test('settings vault index status markup carries the CSS class used by state colors', () => {
  assert.match(source, /class="settings-embedding-index-status" data-settings-vault-index-status/);
});

test('settings expose explicit local full-text opt-in and cache-only removal controls', () => {
  assert.match(source, /data-settings-full-text-index-status/);
  assert.match(source, /data-settings-full-text-enabled/);
  assert.match(source, /data-settings-delete-full-text/);
  assert.match(source, /Refresh enabled indexes/);
  assert.match(source, /Refresh enabled indexes also updates Full-text Search/);
  assert.match(controllerSource, /Markdown notes indexed/);
  assert.match(controllerSource, /Similar Notes text segments/);
  assert.match(source, /Note metadata keeps paths, titles, tags, and YAML properties/);
  assert.doesNotMatch(source, /metadata records/);
  assert.doesNotMatch(source, /data-settings-refresh-full-text/);
  assert.match(controllerSource, /api\.indexes\.setFullTextEnabled/);
  assert.match(controllerSource, /api\.indexes\.deleteFullText/);
  assert.match(controllerSource, /Original Markdown content is not copied/);
});