# Similar Notes V1 Sharpening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `Find similar notes` useful in V1 with percent scores, thresholds, Settings defaults, a small per-run modal, and separate content/metadata scoring.

**Architecture:** Store Similar Notes defaults in the existing `embeddings` settings category. Extend the embedding index record to keep separate body and frontmatter vectors while remaining compatible with older index records. Keep the Selection Action deterministic: user clicks `Find similar notes`, optionally adjusts run settings, and receives a report-only chat result.

**Tech Stack:** Electron main/preload IPC, renderer Selection Actions, settings store, local Transformers.js embedding index, Node tests.

---

### Task 1: Settings Defaults

**Files:**
- Modify: `src/main/settings/settingsStore.js`
- Modify: `src/renderer/settings/mountSettingsPanel.js`
- Test: `tests/settingsStore.test.js`
- Test: `tests/settingsRendererIntegrationSource.test.js`

- [ ] Add normalized `embeddings.similarNotes` with defaults: `minimumScorePercent: 65`, `maxResults: 8`, `mode: mixed`, `contentWeight: 80`, `metadataWeight: 20`.
- [ ] Expose the values in the Embeddings Settings panel as V1 controls.
- [ ] Add tests that invalid values normalize safely.

### Task 2: Split Markdown For Embeddings

**Files:**
- Modify: `src/main/embeddings/embeddingIndexer.js`
- Modify: `src/shared/embeddings/embeddingIndexSchema.js`
- Test: `tests/embeddingIndexer.test.js`
- Test: `tests/embeddingIndexSchema.test.js`

- [ ] Split each Markdown document into `frontmatterText` and `bodyText`.
- [ ] Store `frontmatterChunks/frontmatterVectors` and `bodyChunks/bodyVectors` while preserving legacy `chunks/vectors` fallback.
- [ ] Body chunks exclude YAML frontmatter.
- [ ] Empty body falls back to path text; empty frontmatter can be empty.

### Task 3: Similarity Scoring Modes

**Files:**
- Modify: `src/main/embeddings/embeddingSimilaritySearch.js`
- Test: `tests/embeddingSimilaritySearch.test.js`

- [ ] Accept `minimumScorePercent`, `limit`, `mode`, `contentWeight`, and `metadataWeight`.
- [ ] Compute `contentScore`, `metadataScore`, and final `score` based on mode.
- [ ] Filter by minimum score and return score fields as decimals for code plus percent-friendly values for UI.
- [ ] Return clear mode/threshold metadata in the result.

### Task 4: Mini Modal In Selection Action

**Files:**
- Modify: `src/renderer/selectionActions/mountSelectionActions.js`
- Modify: `src/renderer/styles/layout.css`
- Test: `tests/selectionActionsIntegrationSource.test.js`
- Test: `tests/uiCss.test.js`

- [ ] Clicking `Find similar notes` opens a compact form with defaults from settings.
- [ ] Enter runs with defaults/current values.
- [ ] Report renders percent scores and mode details.
- [ ] No Review Basket actions are created.

### Task 5: Docs And Verification

**Files:**
- Modify: `docs/rebuild/ZEUS_V1_IMPLEMENTATION_PLAN.md`
- Modify: `docs/rebuild/ZEUS_V1_ARCHITECTURE.md`
- Modify: `docs/rebuild/ZEUS_V1_UI_AND_WORKFLOWS.md`

- [ ] Document Similar Notes V1 behavior and settings.
- [ ] Run targeted tests.
- [ ] Run full `npm test` before reporting complete.