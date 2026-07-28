# Similar Notes Relevance Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Similar Notes return useful, explainable Markdown candidates instead of raw whole-vault vector matches.

**Architecture:** Keep vector calculation in `embeddingSimilaritySearch.js`, but add a focused candidate-eligibility module and a focused relevance-scorer module. The search service orchestrates them with the active Vault Profile; renderer code selects an explicit scope and renders returned facts only. No provider, filesystem write, review proposal, or Metadata Index behavior changes.

**Tech Stack:** Electron main process, Node.js built-in tests, existing local embedding index, shared Vault Profile roles.

## Global Constraints

- Default scope is `same_role`; `whole_vault` is explicit per run.
- Role matching uses configured Vault Profile paths, never fixed folder names.
- No provider calls, automatic indexing, or Review Basket conversion.
- Visible score is calibrated relevance, while raw vector scores remain diagnostic test data only.
- Reuse existing semantic settings and renderer UI patterns.

---

### Task 1: Candidate Eligibility

**Files:**
- Create: `src/main/embeddings/embeddingCandidateEligibility.js`
- Modify: `src/main/embeddings/embeddingSimilaritySearch.js`
- Test: `tests/embeddingCandidateEligibility.test.js`

**Interfaces:**
- Produces `createEmbeddingCandidateEligibility({ vaultProfile })` with `resolveRole(path)` and `isEligible({ targetPath, candidatePath, scope })`.
- Consumes `effective profile.roles` from the active Vault Profile.

- [x] Write failing tests for configured same-role paths, unassigned paths, and explicit whole-vault behavior.
- [x] Implement normalized path-prefix role resolution and default same-role filtering.
- [x] Pass the active profile to Similar Notes and filter candidates before scoring.
- [x] Run `node --test tests/embeddingCandidateEligibility.test.js tests/embeddingSimilaritySearch.test.js`.

### Task 2: Deterministic Relevance Scorer

**Files:**
- Create: `src/main/embeddings/embeddingCandidateScorer.js`
- Modify: `src/main/embeddings/embeddingSimilaritySearch.js`
- Test: `tests/embeddingCandidateScorer.test.js`, `tests/embeddingSimilaritySearch.test.js`

**Interfaces:**
- Produces `scoreCandidate({ targetRecord, candidateRecord, embeddingScore, targetRole, candidateRole })` with `{ score, scorePercent, reasons, diagnostics }`.
- Uses existing vectors and deterministic path/title facts only. YAML tags deliberately remain owned by the later structured Metadata Index.

- [x] Write failing tests for same-role/path/title boosts and for an unrelated generic high-cosine candidate.
- [x] Implement bounded boosts and a cross-role evidence gate for explicit whole-vault searches.
- [ ] Keep raw content/metadata cosine data in `diagnostics`; return calibrated score and concise reasons for UI.
- [x] Run focused embedding tests.

### Task 3: Scope UI And Result Presentation

**Files:**
- Modify: `src/renderer/selectionActions/mountSelectionActions.js`
- Modify: `src/renderer/selectionActions/similarNotesPresentation.js`
- Modify: `src/main/ipc/registerEmbeddingIpc.js`
- Test: `tests/selectionActionsIntegrationSource.test.js`, `tests/embeddingIpc.test.js`

**Interfaces:**
- Per-run payload adds `scope: 'same_role' | 'whole_vault'`.
- Candidate presentation consumes returned `reasons`, never recreates ranking logic.

- [x] Add compact, explicit scope control to the existing Similar Notes form, defaulting to Same role.
- [x] Pass scope through preload/IPC without altering provider behavior.
- [ ] Render one concise reason line such as `Same role · nearby project path`; do not show raw diagnostics in normal UI.
- [x] Run focused renderer and IPC tests.

### Task 4: Documentation And Verification

**Files:**
- Modify: `docs/rebuild/VINCARIOS_V1_ARCHITECTURE.md`
- Modify: `docs/rebuild/VINCARIOS_V1_UI_AND_WORKFLOWS.md`
- Modify: `docs/rebuild/VINCARIOS_V1_IMPLEMENTATION_PLAN.md`

- [x] Document the scope, calibrated-score contract, and explicit non-goals.
- [x] Run `node --check` on changed JavaScript files, targeted tests, then `npm test`.
- [ ] Manually test a selected Brain/Core note against a high-cosine unrelated Knowledge/Project note: default scope excludes it; Whole vault is intentional and explains any qualifying match.