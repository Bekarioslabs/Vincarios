# Embedding Index Surface Design

## Goal

Expose the selected vault's local embedding-index state in Settings and provide one explicit, safe index action. The surface must make first use, refresh, incompatibility, and failure states understandable without giving the renderer filesystem access.

## Scope

V1 adds index status plus one explicit action in Settings > Embeddings.

- A newly opened vault shows `No index yet` and does not create `.vincarios/index`.
- `Build index` creates the index only after direct user intent.
- Once an index exists, `Refresh index` scans Markdown files and re-embeds only changed or new documents. Deleted documents are removed from the next saved document set.
- The status shows Markdown document count, chunk count, active model identity, and the last successful indexed time.
- Missing model artifacts, unreadable index data, and an incompatible index have explicit non-destructive states.

## Out Of Scope

- Automatic indexing on vault open.
- Custom model picker, local model-path selection, downloads, or remote embedding providers.
- Search UI, Recent Files, Homepage, and metadata-index implementation.
- Editing vault notes or exposing `.vincarios` in the file tree.

## Ownership

- `src/main/embeddings/embeddingIndexStatusService.js` owns read-only index inspection and normalized status.
- `src/main/embeddings/embeddingIndexer.js` owns the explicit build/refresh execution.
- `src/main/embeddings/embeddingIndexStore.js` owns index persistence; it remains the only file-aware storage service.
- `src/main/ipc/registerEmbeddingIpc.js` exposes narrow status and refresh IPC handlers.
- `src/renderer/settings/mountSettingsPanel.js` renders the state and calls exposed APIs. It does not infer filesystem state.

## Model Contract

Every index manifest records an embedding fingerprint containing model id, dimensions, artifact revision, and index schema version. The status service compares it to the active default model fingerprint.

A mismatch produces `Rebuild required`. Similar-note search must not compare vectors from mismatched models. A future local model selector may reuse this contract, but V1 always uses the bundled multilingual MiniLM default.

The indexer writes a new manifest/documents pair only after a successful refresh. A failed build leaves the prior valid index intact.

## UI Contract

Settings > Embeddings has an Index section above Similar Notes defaults:

| State | Primary copy | Action |
| --- | --- | --- |
| no_index | No index yet | Build index |
| ready | Indexed: N Markdown notes, N chunks | Refresh index |
| rebuild_required | Rebuild required | Rebuild index |
| unavailable | Local embedding model unavailable | No build action |
| invalid | Index could not be read | Rebuild index |
| running | Indexing... | Disabled progress state |

Status text is app-owned, concise, and carries no private note content or absolute filesystem paths.

## Data Flow

1. Vault opens: Main sets the existing embedding root only; no index is written.
2. Settings requests status through IPC.
3. Main loads manifest/documents and model availability, normalizes a status payload, and returns it.
4. User chooses Build/Refresh/Rebuild.
5. Renderer invokes the explicit IPC action and shows pending state.
6. Main completes or fails without partial index replacement.
7. Renderer requests fresh status and updates the visible result.

## Verification

- Unit tests: empty, ready, invalid, unavailable, and fingerprint-mismatch status normalization.
- Indexer test: a failed refresh preserves a previously valid manifest/documents pair.
- IPC/preload test: renderer receives status/refresh only, never filesystem APIs.
- Settings source/integration test: index controls use the Embeddings API.
- Manual: new vault stays free of `.vincarios/index` until Build; refresh skips unchanged notes; changed/deleted notes update correctly.
