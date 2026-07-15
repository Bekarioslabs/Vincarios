# Vitruvios V1 Search And Metadata Plan

## Purpose

This document is the focused architecture plan for the remaining V1 search-related work. It records agreed product boundaries and implementation order; it is not a claim that the planned modules already exist.

Vitruvios is a local-first Markdown vault assistant. Providers generate text only. They never read vault files directly and receive context only through explicit, bounded application flows.

## Current Product State

The following foundations already exist and are committed:

- Local Markdown vault opening, file tree, local Markdown Preview, and preview history.
- Renderer-side R/W permissions for AI/context and reviewed-write workflows.
- Review Basket, backups for existing-file writes, and audit entries for executed actions.
- Portable Vault Profile roles and per-vault Vitruvios data under `.vitruvios/`.
- Local embedding indexing under selected-vault `.vitruvios/index/`.
- Explicit embedding Build, Refresh, and Rebuild controls plus shared index-health state.
- Similar Notes with a local embedding index, `Relevant area`/`Whole vault` scope, calibrated relevance, deterministic role/title/path signals, duplicate relationship labels, and report-only Suggestions.
- Dark/Light/System appearance plus built-in High Contrast and Paper Vault packs.

Current relevant implementation boundaries:

| Area | Current owner |
|---|---|
| Vault file reads and path validation | `src/main/vault/` |
| Embedding index and similarity | `src/main/embeddings/` |
| Vault roles | `src/shared/vaultProfile/` |
| Suggestions UI | `src/renderer/suggestions/` |
| Selection Actions | `src/renderer/selectionActions/` |
| Markdown Preview | `src/renderer/markdown/` |
| Settings persistence | `src/main/settings/` |

## Important Permission Clarification

The current implementation intentionally treats the normal right-hand Markdown Preview as a **local viewing operation**, not as an AI-context permission.

- A Markdown file can be selected and rendered locally in Preview without R.
- The Main-process `readMarkdown` service validates the vault root, relative path, blocked dot-folders, and Markdown type. It does not consult renderer R state.
- R currently means that the selected file/folder may be used as AI/context input by flows such as Use as Context, summary, or provider-backed actions.
- W means a write proposal may be created. It never means silent execution.

This distinction should remain explicit. Search must not require global R simply to discover a local note, show its filename, or open it locally in Preview. Search must never send indexed or matching content to a provider by itself.

## Why Search Needs More Than Embeddings

Embeddings answer a semantic question: "Which notes are conceptually related to this note?" They are useful for Similar Notes and later discovery assistance. They are not sufficient as the primary Vault Search mechanism.

Embeddings are weak or inappropriate for:

- exact filename and path lookup;
- exact tag/type/status filtering;
- predictable word matches;
- transparent ranking for short queries;
- locating a literal phrase or heading;
- fast deterministic navigation results.

Vitruvios currently uses embeddings only for the explicit Similar Notes action. Similar Notes has been improved, but global semantic search should not be added merely because vectors exist.

## Proposed Search Layers

The recommended direction is a layered local search system. Each layer has a narrow purpose and can be extended later without changing provider, permission, or review architecture.

### 1. Structured Metadata Index

Suggested storage:

```text
<vault>/.vitruvios/index/metadata/
```

Agreed V1 record facts per Markdown note:

- normalized relative path;
- filename and filename stem;
- display title: first H1 when present, otherwise filename stem;
- generic parsed YAML property map, with normalized `tags`, `type`, `status`, and `aliases` search fields;
- optional deterministic template/file role only when it already exists in app metadata;
- content hash and modified time for freshness;
- schema/version information;
- an unavailable-metadata state when YAML is malformed.

Unknown YAML properties are retained as generic data. They are not discarded, invented, or rewritten. This keeps custom Book/Template fields compatible with the future index.

The metadata index must be separate from the embedding index. It is not an authority for writes, must not invent YAML, and must never become a second hidden vault model.

Primary benefits:

- exact and filterable tag/type/status lookup;
- fast title/path search;
- reliable Search result labels;
- later support for Recent Files, Vault Home, Templates, cleanup reports, and destination candidates.

### 2. Full-Text Search

Full-text search should be deterministic and local. It does not require an LLM or embeddings.

V1 decision: **persistent local inverted index**.

- Store token and heading references under `<vault>/.vitruvios/index/search/`, not complete Markdown copies.
- Build it only after an explicit per-vault opt-in disclosure.
- Rebuild and refresh it through the shared index lifecycle.
- Provide Delete and Rebuild controls in Settings.
- Keep the cache ignored by Git.
- Do not offer encryption in V1. A local key stored beside the portable vault would add recovery and portability risk without meaningfully protecting against local machine access.

The result should remain local. Opening a result uses the existing local Preview path. AI/context use remains a separate explicit step governed by R.

### 3. Semantic Search

Semantic search is a future optional layer over embeddings, not the V1 default search mode.

Possible later behaviour:

- explicit `Semantic` search mode;
- use the same role-aware candidate eligibility and calibrated scoring as Similar Notes;
- clearly label results as semantic rather than exact matches;
- never silently replace deterministic results.

## Recommended V1 Search Behaviour

### Searchable Signals

V1 should support these signals, ordered from deterministic to broader:

1. filename and path;
2. title;
3. YAML tags, type, and status;
4. exact Markdown text and headings;
5. semantic relevance later as an explicit mode, not as a hidden ranker.

### Result Structure

Each result should show:

- note icon and filename/title;
- compact parent path;
- match reason, such as `Filename`, `Tag: project`, `Heading`, or `Text`;
- optional short local excerpt only for a text match;
- result actions limited to local navigation, such as `Open` and `Reveal in Files`.

No provider action, Review Basket proposal, or write action should be created from a search result in V1.

### Permission Behaviour

- Search discovery is local and should not require R.
- Local Preview opening should not require R, matching current file-tree behaviour.
- R remains required only when an action tries to package note content for an AI/provider flow.
- W remains required only for proposing a write.
- Search must not send queries, results, metadata, excerpts, or index data to a provider.

### Freshness

The current embedding index uses an explicit Build/Refresh/Rebuild lifecycle and watcher-driven stale status. Search/metadata should integrate with that lifecycle rather than introduce a second ambiguous status system.

Decision: one combined `Vault Index Status` surface.

- Files shows one compact state only.
- Settings lists the enabled components and their detail.
- Green means every enabled component is current.
- Amber means an enabled component is stale or building.
- Red means a required core component is unavailable or invalid.
- Gray means an optional component is deliberately disabled.

The current embedding health service stays the sole implementation owner until metadata and full-text components exist. New components extend that aggregate boundary instead of adding competing dots.

## Recent Files

Agreed V1 scope:

- Record successful local Markdown Preview opens per selected vault.
- Store the bounded list in `<vault>/.vitruvios/recent-files.json` so it can travel with the vault.
- Store normalized path, last-opened timestamp, and optional display metadata only.
- Missing or renamed files are skipped gracefully and removed lazily after a failed open.
- Keep 10-20 entries.

Recent Files must not be a chat history, provider memory, or audit log.

## Vault Home

Agreed V1 baseline:

- A dedicated non-Markdown Home workspace opened explicitly from the left navigation.
- Opening a vault continues to enter Chat; Home never interrupts the active workflow.
- Recent Files is the first useful content.
- Include compact index state and only already-supported direct actions.
- No dashboard cards, fake analytics, or automatic AI recommendations.

Future V1.1/V1.2 directions:

- user-selected default home note/workspace;
- per-template project home layout;
- startup note compatible with a selected Vault Profile;
- richer task/project summaries through separate reviewed and index-backed features.

## Proposed Implementation Order

1. Design and implement the shared Frontmatter Contract: parse, validate, preserve, normalize, and serialize.
2. Define metadata record schema, storage, freshness, malformed-YAML behavior, and tests.
3. Implement metadata indexing and extend the shared index-health boundary.
4. Implement deterministic Search over path, filename, title, and supported frontmatter.
5. Add the explicit opt-in persistent full-text index.
6. Add Search workspace/UI, Recent Files, and the minimal Home workspace.
7. Keep semantic search out of the default V1 UI unless its own explicit mode has a complete test and UX plan.
8. Build Editor Light only after the Frontmatter Contract is proven by search and metadata flows.

## Constraints And Non-Goals

- No provider access to vault files or indexes.
- No cloud search.
- No silent content-to-context behaviour.
- No automatic edits, tags, moves, link changes, or cleanup proposals from search.
- No broad plugin compatibility layer in this block.
- No replacement for Obsidian search or its plugin ecosystem.
- No unbounded background indexing loop.
- No duplicate hidden index that conflicts with the existing embedding index.

## Explicit V1 Deferrals

- Semantic Search as a separate, labeled embedding mode.
- Cross-vault Search.
- Automatic provider context from a Search result.
- Search-derived edits, tags, moves, links, or cleanup proposals.
- Encryption for local search caches.
- Rich metadata bulk editing, custom field editors, and Editor toolbar customization.

## Research References

- [Obsidian Search](https://obsidian.md/help/Plugins/Search): clear separation of filename/path, content, tags, properties, headings, and result context.
- [Obsidian Properties](https://obsidian.md/help/Editing%2Band%2Bformatting/Properties): YAML property types, arbitrary property names, templates, and property preservation expectations.
- [MetaEdit](https://github.com/chhoumann/MetaEdit): metadata editing and typed/suggested property values as future UX inspiration, not an implementation dependency.
- [Obsidian Editing Toolbar](https://github.com/pkm-er/obsidian-editing-toolbar): compact formatting-control inspiration for the later bounded Editor Light surface, not a source to copy.
