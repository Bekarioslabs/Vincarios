# Embedding Index Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user inspect and explicitly build or refresh the selected vault's local embedding index from Settings without automatic indexing or renderer filesystem access.

**Architecture:** The Index Store gains a read-only inspection boundary; a focused Index Status Service derives normalized UI states from that boundary and the active bundled model contract. The Indexer remains the only builder. Main exposes status and refresh through narrow Embeddings IPC, and the Settings panel renders only those returned states.

**Tech Stack:** Electron IPC, CommonJS main services, browser-first renderer modules, JSON index manifests, Node test runner.

## Global Constraints

- No index write occurs when a vault opens or when Settings merely renders.
- Only an explicit Build, Refresh, or Rebuild action may create or replace `.vitruvios/index`.
- Renderer receives status/refresh APIs only; it never receives filesystem paths or Node APIs.
- Dot folders remain hidden from normal Vault UI and blocked from context.
- The bundled multilingual MiniLM model remains the only V1 model.
- A fingerprint mismatch disables compatible-search claims and requires an explicit rebuild.
- A failed refresh preserves the previous usable manifest/documents pair.

---

### Task 1: Index inspection and model fingerprint contract

**Files:**
- Modify: `src/shared/embeddings/embeddingIndexSchema.js`
- Modify: `src/main/embeddings/embeddingIndexStore.js`
- Create: `src/main/embeddings/embeddingIndexStatusService.js`
- Test: `tests/embeddingIndexSchema.test.js`
- Test: `tests/embeddingIndexStore.test.js`
- Create: `tests/embeddingIndexStatusService.test.js`

**Interfaces:**
- Produces `createEmbeddingFingerprint(input)` with `modelId`, `dimensions`, `revision`, and `indexVersion`.
- Produces `indexStore.inspect()` returning `{ ok, exists, manifest, documents }` without creating index files.
- Produces `statusService.setRoot(vaultRoot)` and `statusService.getStatus()` returning one of `no_vault`, `no_index`, `ready`, `rebuild_required`, `unavailable`, or `invalid`.

- [x] **Step 1: Write failing status tests**

Cover an unopened/no-index vault, a valid index with matching fingerprint, an old/mismatched fingerprint, missing model artifacts, and invalid index JSON. Assert that inspection never creates `.vitruvios/index`.

Run: `node --test tests/embeddingIndexStatusService.test.js`
Expected: failure because the status service and inspection API do not exist.

- [x] **Step 2: Extend the schema and store minimally**

Add an optional `fingerprint` to new manifests. Keep legacy manifests readable. Add `inspect()` inside the Index Store using its existing filesystem boundary; return `exists: false` instead of synthesizing a write when no manifest exists.

- [x] **Step 3: Implement status normalization**

Create the Status Service. It asks the Index Store for inspection and the Model Store for local artifact availability. It returns counts and a display-safe model identifier, never absolute paths or note titles. A missing/legacy/mismatched fingerprint becomes `rebuild_required`; malformed data becomes `invalid`.

- [x] **Step 4: Run focused verification**

Run: `node --test tests/embeddingIndexSchema.test.js tests/embeddingIndexStore.test.js tests/embeddingIndexStatusService.test.js`
Expected: all pass.

- [ ] **Step 5: Commit the status contract**

Commit message: `Add embedding index status service`.

### Task 2: Atomic explicit index refresh and root wiring

**Files:**
- Modify: `src/main/embeddings/embeddingIndexer.js`
- Modify: `src/main/embeddings/embeddingIndexStore.js`
- Modify: `src/main/app/bootstrapElectron.js`
- Modify: `src/main/ipc/registerVaultIpc.js`
- Test: `tests/embeddingIndexer.test.js`
- Test: `tests/electronShell.test.js`

**Interfaces:**
- Consumes `createEmbeddingFingerprint` from Task 1.
- `embeddingIndexer.rebuildIndex()` returns `{ ok, totalDocuments, indexedDocuments, skippedDocuments, chunkCount }` and only replaces both persisted index files after all embeddings succeed.
- Vault root wiring calls `setRoot` for search, indexer, and status service.

- [x] **Step 1: Write failing atomic-refresh tests**

Seed a valid documents/manifest pair, make a later embedding call fail, then assert the prior pair remains readable and unchanged. Add a bootstrap/root-wiring assertion that the status service receives the selected vault root.

Run: `node --test tests/embeddingIndexer.test.js tests/electronShell.test.js`
Expected: failure because refresh currently writes the manifest before all vectors succeed.

- [x] **Step 2: Make refresh atomic**

Build the next manifest/documents in memory. Do not overwrite the active pair until all document embeddings have succeeded. Persist the matching fingerprint alongside the active model details. Keep unchanged-document skipping and deleted-document cleanup unchanged.

- [x] **Step 3: Wire all embedding services to the selected root**

Create the status service in Electron bootstrap and pass it to the existing vault-root synchronization path. Opening a vault only calls `setRoot`; it does not call `rebuildIndex`.

- [x] **Step 4: Run focused verification**

Run: `node --test tests/embeddingIndexer.test.js tests/electronShell.test.js`
Expected: all pass.

- [ ] **Step 5: Commit atomic refresh wiring**

Commit message: `Make embedding refresh atomic`.

### Task 3: Narrow Embeddings IPC and sandboxed preload API

**Files:**
- Modify: `src/shared/ipc/channels.js`
- Modify: `src/main/ipc/registerEmbeddingIpc.js`
- Modify: `src/preload/index.js`
- Test: `tests/embeddingIpc.test.js`
- Test: `tests/electronShell.test.js`

**Interfaces:**
- Adds `EMBEDDINGS_GET_INDEX_STATUS` and `EMBEDDINGS_REFRESH_INDEX`.
- Renderer API becomes `window.vitruvios.embeddings.getIndexStatus()` and `window.vitruvios.embeddings.refreshIndex()`.
- IPC returns normalized result objects only.

- [x] **Step 1: Write failing IPC/preload tests**

Assert channel names, registered handlers, successful forwarding, unavailable-service failure, and preload exposure without filesystem methods.

Run: `node --test tests/embeddingIpc.test.js tests/electronShell.test.js`
Expected: failure because the channels and APIs do not exist.

- [x] **Step 2: Add handlers and preload methods**

Register status through the Status Service and refresh through the Indexer. Preserve the existing Similar Notes handler unchanged. Expose only the two explicit methods under the existing frozen Embeddings API.

- [x] **Step 3: Run focused verification**

Run: `node --test tests/embeddingIpc.test.js tests/electronShell.test.js`
Expected: all pass.

- [ ] **Step 4: Commit the public boundary**

Commit message: `Expose embedding index status APIs`.

### Task 4: Settings Index section and documentation

**Files:**
- Modify: `src/renderer/settings/mountSettingsPanel.js`
- Modify: `src/renderer/styles/settings.css`
- Modify: `docs/rebuild/VITRUVIOS_V1_ARCHITECTURE.md`
- Modify: `docs/rebuild/VITRUVIOS_V1_UI_AND_WORKFLOWS.md`
- Modify: `docs/rebuild/VITRUVIOS_V1_IMPLEMENTATION_PLAN.md`
- Test: `tests/embeddingSettingsPanelSource.test.js`
- Test: `tests/settingsRendererIntegrationSource.test.js`

**Interfaces:**
- Consumes `api.embeddings.getIndexStatus()` and `api.embeddings.refreshIndex()`.
- Renders a compact status section above Similar Notes defaults.
- Uses one primary button labeled by state: `Build index`, `Refresh index`, or `Rebuild index`.

- [x] **Step 1: Write failing renderer/source tests**

Assert that the Embeddings panel requests status after a Settings render, maps the five defined states to user-facing copy, disables its action while running/unavailable, and does not reference vault filesystem APIs.

Run: `node --test tests/embeddingSettingsPanelSource.test.js tests/settingsRendererIntegrationSource.test.js`
Expected: failure because the Index section does not exist.

- [x] **Step 2: Render the Index section**

Add an `Embedding index` subsection above Similar Notes defaults. Show counts and a short state message; last-successful refresh metadata remains a later extension. During refresh, disable the action and show `Indexing...`; on completion reload status. Keep existing Save embedding defaults behavior independent.

- [x] **Step 3: Add scoped styling**

Use existing Settings section/action/button tokens. Do not add hard-coded theme colors or a new modal. Keep unavailable/error states informational and non-destructive.

- [x] **Step 4: Update canonical documentation**

Mark the Phase 8 index surface complete only after tests and manual verification. Document lazy index creation, fingerprint mismatch, atomic refresh, and V1.1 local compatible-model selection.

- [ ] **Step 5: Run full verification and manual smoke test**

Run: `npm test`
Expected: all tests pass.

Manual test: open a new vault and confirm no `.vitruvios/index` exists; open Settings > Embeddings and see `No index yet`; Build once; close/reopen Settings and see indexed counts; edit/delete a Markdown file; Refresh and confirm counts update; temporarily remove model artifacts and confirm the UI reports unavailable without creating an index.

- [ ] **Step 6: Commit the complete surface**

Commit message: `Add embedding index surface`.
