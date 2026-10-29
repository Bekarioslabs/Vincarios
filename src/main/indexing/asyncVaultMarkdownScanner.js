'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { isMarkdownPath } = require('../vault/vaultReadService');

async function scanVaultMarkdownDocuments(vaultRoot, options) {
  options = options || {};
  const fileSystem = options.fs || fs;
  const asyncFs = fileSystem.promises;
  if (!asyncFs || typeof asyncFs.readdir !== 'function') {
    return fail('async_scan_unavailable', 'Asynchronous vault scan is unavailable.');
  }
  const includeContent = options.includeContent !== false;
  const batchSize = positiveInteger(options.batchSize, 32);
  const folders = [''];
  const files = [];
  let skippedCount = 0;

  while (folders.length) {
    if (isAborted(options.signal)) return canceled();
    const relativeFolder = folders.shift();
    const absoluteFolder = relativeFolder ? path.join(vaultRoot, ...relativeFolder.split('/')) : vaultRoot;
    let entries;
    try {
      entries = await asyncFs.readdir(absoluteFolder, { withFileTypes: true });
    } catch (_error) {
      skippedCount += 1;
      continue;
    }
    entries.forEach((entry) => {
      if (isBlockedEntry(entry.name)) return;
      const relativePath = relativeFolder ? relativeFolder + '/' + entry.name : entry.name;
      if (entry.isDirectory()) folders.push(relativePath);
      else if (entry.isFile() && isMarkdownPath(entry.name)) files.push(relativePath);
    });
  }

  const documents = [];
  for (let start = 0; start < files.length; start += batchSize) {
    if (isAborted(options.signal)) return canceled();
    const batch = files.slice(start, start + batchSize);
    const loaded = await Promise.all(batch.map((relativePath) => readDocument(vaultRoot, relativePath, includeContent, asyncFs)));
    loaded.forEach((document) => {
      if (document) documents.push(document);
      else skippedCount += 1;
    });
    if (typeof options.onProgress === 'function') {
      options.onProgress({ processed: Math.min(start + batch.length, files.length), total: files.length });
    }
    await yieldToEventLoop();
  }

  documents.sort((left, right) => left.path.localeCompare(right.path, 'en', { sensitivity: 'base', numeric: true }));
  return ok({ documents, skippedCount });
}

async function readDocument(vaultRoot, relativePath, includeContent, asyncFs) {
  const absolutePath = path.join(vaultRoot, ...relativePath.split('/'));
  try {
    const stat = await asyncFs.stat(absolutePath);
    if (!stat.isFile()) return null;
    const document = { path: relativePath.replace(/\\/g, '/'), mtimeMs: stat.mtimeMs };
    if (includeContent) document.content = await asyncFs.readFile(absolutePath, 'utf8');
    return document;
  } catch (_error) {
    return null;
  }
}

function isBlockedEntry(name) {
  return String(name || '').startsWith('.');
}

function isAborted(signal) {
  return !!(signal && signal.aborted);
}

function yieldToEventLoop() {
  return new Promise((resolve) => setImmediate(resolve));
}

function positiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function ok(value) {
  return Object.assign({ ok: true }, value);
}

function canceled() {
  return fail('index_canceled', 'Index refresh was canceled.');
}

function fail(code, message) {
  return { ok: false, code, message };
}

module.exports = { scanVaultMarkdownDocuments, yieldToEventLoop };
