'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createVaultReadService } = require('../src/main/vault/vaultReadService');

test('vault read service rejects Markdown files above the preview size limit before reading content', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-preview-limit-'));
  const target = path.join(root, 'Oversized.md');
  fs.writeFileSync(target, Buffer.alloc((4 * 1024 * 1024) + 1, 65));
  const service = createVaultReadService();
  service.setRoot(root);

  const result = service.readMarkdown('Oversized.md');

  assert.equal(result.ok, false);
  assert.equal(result.code, 'markdown_too_large');
  assert.match(result.message, /too large/i);
});
