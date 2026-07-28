import * as YAML from '../../../node_modules/yaml/browser/index.js';

window.VincariosYamlRuntime = Object.freeze({
  Document: YAML.Document,
  isMap: YAML.isMap,
  parseDocument: YAML.parseDocument
});
