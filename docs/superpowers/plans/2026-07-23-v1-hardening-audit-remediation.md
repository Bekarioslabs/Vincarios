# Vincarios V1 Hardening Audit Remediation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Resolve the confirmed V1 audit findings without widening product scope or weakening the local-first review and safety model.

**Architecture:** Remediation proceeds from repository containment to vault-session integrity, write guarantees, bounded rendering/indexing, provider privacy, and finally release reproducibility. Each task has one owning boundary, starts with a failing regression test, and must leave the full suite green before the next cross-cutting task starts.

**Tech Stack:** Electron, CommonJS JavaScript, Node test runner, npm, GitHub Actions, Windows portable build.

## Global Constraints

- Preserve all current uncommitted Vincarios rename work.
- Providers generate text only and never access vault files directly.
- Renderer receives no direct filesystem access.
- Existing-file writes require review, backup, and audit.
- `.vincarios/`, vault `.vincarios/`, backups, runtime data, and model caches stay out of Git.
- V1 release target is Windows; shared logic and CI tests must remain platform-independent.
- No new product features or UI redesigns during hardening.
- Every behavior change follows red-green-refactor and updates its canonical V1 document.

---

### Task 1: Repository Containment and CI Portability

**Files:**
- Modify: `.gitignore`
- Modify: `tests/scaffold.test.js`
- Modify: `tests/runtimePaths.test.js`
- Modify: `docs/rebuild/VINCARIOS_V1_TESTS_AND_AUDITS.md`

**Interfaces:**
- Consumes: current and legacy internal namespace names.
- Produces: safe ignore rules and path tests that behave identically on Windows and GitHub's Ubuntu runner.

- [x] Add a failing repository-hygiene test that requires current `.vincarios/`, portable runtime, vault runtime, and backup paths to be ignored while preserving legacy migration exclusions.
- [x] Run the focused test and verify it fails because `.vincarios/` is currently missing.
- [x] Add current Vincarios ignore entries without removing legacy `.vitruvios/` entries.
- [x] Replace host-dependent `path.join('D:', ...)` assertions with explicit `path.win32` fixtures and a Windows path implementation injected into `createRuntimePaths`.
- [x] Run `tests/scaffold.test.js` and `tests/runtimePaths.test.js`.
- [x] Update the test/audit document with the current CI and dependency state.

### Task 2: Atomic Vault Session Activation

**Files:**
- Create: `src/main/vault/vaultSessionCoordinator.js`
- Modify: `src/main/ipc/registerVaultIpc.js`
- Modify: `src/main/index.js`
- Modify: `tests/vaultIpc.test.js`
- Create: `tests/vaultSessionCoordinator.test.js`
- Modify: `docs/rebuild/VINCARIOS_V1_ARCHITECTURE.md`

**Interfaces:**
- Consumes: `{ root, namespaceMigration, services[] }`.
- Produces: `activateRoot(root) -> { ok, root, namespaceMigration, warnings }`.

- [x] Write failing tests for migration failure before any service mutation, mandatory dependent-service failure, watcher warning behavior, and rollback to the previous root.
- [x] Verify each test fails against the current read-first root mutation.
- [x] Move migration before service activation.
- [x] Introduce one coordinator that validates the root once, activates mandatory services in a fixed order, records results, and restores the previous session when activation fails.
- [x] Treat the filesystem watcher as optional capability with an explicit warning instead of silently splitting state.
- [x] Remove `syncDependentRoot()` from IPC registration and keep IPC as routing only.
- [x] Run focused vault IPC/session tests and the full suite.

### Task 3: Canonical Path and Vault-Root Trust Boundary

**Files:**
- Modify: `src/shared/pathRules/index.js`
- Modify: `src/main/vault/vaultReadService.js`
- Modify: `src/main/vault/vaultWriteService.js`
- Modify: `src/main/ipc/registerVaultIpc.js`
- Modify: `src/main/settings/settingsStore.js`
- Modify: `tests/pathRules.test.js`
- Modify: `tests/vaultIpc.test.js`
- Modify: `docs/rebuild/VINCARIOS_V1_SAFETY_RULES.md`

**Interfaces:**
- Consumes: lexical vault root and target path.
- Produces: canonical containment result that rejects symlink/junction escape paths.

- [x] Add failing real-filesystem tests for a vault-local link resolving outside the vault.
- [x] Add a failing IPC test showing that an arbitrary renderer path cannot become a vault root unless it came from the main-owned picker or persisted recent-vault allowlist.
- [x] Resolve the canonical root and existing target ancestors with `realpath`/`lstat` in Main before reads, writes, renames, asset loads, and index scans.
- [x] Keep creation of new paths safe by validating the canonical nearest existing parent.
- [x] Replace unrestricted renderer `setRoot(path)` behavior with a main-owned recent-vault token/path validation flow.
- [x] Run path, read, write, asset, recent-vault, and IPC tests.

### Task 4: Write, Backup, and Audit Guarantees

**Files:**
- Create: `src/main/vault/reviewedWriteTransaction.js`
- Modify: `src/main/vault/vaultWriteService.js`
- Modify: `src/main/vault/vaultBackupService.js`
- Modify: `tests/vaultWriteService.test.js`
- Modify: `tests/vaultBackupService.test.js`
- Modify: `docs/rebuild/VINCARIOS_V1_ACTION_MODEL.md`
- Modify: `docs/rebuild/VINCARIOS_V1_SAFETY_RULES.md`

**Interfaces:**
- Consumes: validated reviewed operation with precondition, backup plan, mutation, and audit record.
- Produces: one truthful result that distinguishes committed, rolled-back, and audit-warning outcomes.

- [x] Add failing tests for audit failure after create/update/rename, backup failure, rename backup creation, and rollback behavior.
- [x] Verify current code reports failure after already mutating content.
- [x] Centralize namespace-aware audit append logic and injected filesystem use.
- [x] Back up Rename Light before mutation.
- [x] Preflight mutation and audit destinations before mutation; if a post-mutation audit append fails, attempt deterministic rollback and report the exact state.
- [x] Remove hard-coded `.vincarios` strings from write/backup services in favor of `CURRENT_INTERNAL_NAMESPACE`.
- [x] Run focused write/backup/audit tests and the full suite.

### Task 5: Restart-Safe Namespace Migration

**Files:**
- Modify: `src/main/app/internalNamespaceMigration.js`
- Modify: `tests/internalNamespaceMigration.test.js`
- Modify: `docs/rebuild/VINCARIOS_V1_IMPLEMENTATION_PLAN.md`

**Interfaces:**
- Consumes: legacy/current namespace directories.
- Produces: deterministic `rename`, `merge`, `already_migrated`, `conflict`, or recoverable `partial_failure` result.

- [x] Add failure-injection tests for a move failing after one successful entry and for restart recovery from an interrupted merge.
- [x] Verify the current migration strands entries across both namespaces.
- [x] Stage persistent entries through a migration journal/temporary directory and make retries idempotent.
- [x] Preserve launcher-created runtime directories without silently overwriting persistent entries.
- [x] Correct stale documentation that currently describes a single atomic rename.

### Task 6: Bounded Diff and Preview Work

**Files:**
- Modify: `src/shared/actions/diffPreview.js`
- Modify: `src/shared/security/payloadLimits.js`
- Modify: `src/renderer/diff/diffLineRenderer.js`
- Modify: `src/renderer/markdown/markdownPreviewController.js`
- Modify: `src/main/vault/vaultReadService.js`
- Modify: `tests/diffPreview.test.js`
- Modify: `tests/markdownPreviewControllerBehavior.test.js`
- Modify: `tests/vaultReadService.test.js`

**Interfaces:**
- Consumes: before/after Markdown bounded by bytes and line count.
- Produces: contextual diff hunks or an explicit `diff_too_large` result.

- [x] Add failing tests for many-short-line documents, oversized preview files, bounded history, and stale image resolution.
- [x] Replace the quadratic full-matrix LCS implementation with a proven bounded diff dependency or a linear-space algorithm.
- [x] Enforce pre-diff byte and line limits before allocation.
- [x] Render contextual hunks instead of one DOM row for every unchanged line.
- [x] Bound preview history by entry count and total bytes.
- [x] Limit concurrent image resolution and ignore stale render completions.

### Task 7: Provider Privacy and Settings Correctness

**Files:**
- Modify: `src/main/providers/providerRegistry.js`
- Modify: `src/main/settings/settingsStore.js`
- Modify: `src/renderer/settings/mountSettingsPanel.js`
- Modify: `src/renderer/providers/mountProviderStatus.js`
- Modify: `tests/providerRegistry.test.js`
- Modify: `tests/settingsRendererIntegrationSource.test.js`
- Create: `tests/settingsPanelBehavior.test.js`
- Modify: `docs/rebuild/VINCARIOS_V1_UI_AND_WORKFLOWS.md`
- Modify: `docs/rebuild/VINCARIOS_V1_SAFETY_RULES.md`

**Interfaces:**
- Consumes: provider definition plus effective base URL.
- Produces: derived privacy classification `local`, `external`, or explicit future `cloud`.

- [x] Add a failing test showing that a non-loopback override still displays `Local`.
- [x] Derive effective privacy from the parsed hostname unless an explicit stricter provider classification exists.
- [x] Require explicit user confirmation before context is sent to an external endpoint.
- [x] Add a real behavior test for `Save embedding defaults` and reproduce the undefined `app` reference.
- [x] Dispatch the settings event through an injected event target or `window`, not an out-of-scope variable.
- [x] Run provider/settings tests and manually verify the privacy badge and save flow.

### Task 8: Index Single-Flight, Caching, and Main-Thread Bounds

**Files:**
- Create: `src/main/indexing/indexRefreshCoordinator.js`
- Modify: `src/main/metadata/vaultIndexHealthService.js`
- Modify: `src/main/embeddings/embeddingIndexHealthService.js`
- Modify: `src/main/search/fullTextIndexHealthService.js`
- Modify: `src/main/search/vaultSearchService.js`
- Modify: `src/main/search/fullTextIndexStore.js`
- Modify: `src/main/embeddings/embeddingIndexStore.js`
- Modify: `src/main/embeddings/embeddingSimilaritySearch.js`
- Modify: `src/main/vault/vaultMarkdownSource.js`
- Modify: associated index/search tests

**Interfaces:**
- Consumes: vault root, index generation, invalidation events.
- Produces: one shared refresh promise and versioned in-memory index snapshots.

- [x] Add failing tests proving concurrent refresh calls currently start duplicate work.
- [x] Add failing tests proving each query reparses the same unchanged index.
- [x] Introduce a single-flight refresh coordinator used by metadata, embeddings, and full text.
- [x] Cache validated parsed indexes by root plus manifest generation/hash and invalidate on rebuild/delete/root change.
- [x] Precompute document centroids during index build instead of each Similar Notes query.
- [x] Add cancellation/progress boundaries and move expensive traversal/inference away from Electron's UI-critical synchronous path.
- [x] Measure a generated multi-thousand-note fixture and record timings.

### Task 9: Atomic Template Execution and Renderer Ownership

**Files:**
- Create: `src/main/templates/reviewedTemplateService.js`
- Create: `src/main/ipc/registerTemplateIpc.js`
- Create: `src/renderer/review/reviewExecutionController.js`
- Modify: `src/renderer/shell/mountShell.js`
- Modify: `src/preload/index.js`
- Modify: `src/shared/ipc/channels.js`
- Modify: template and review tests

**Interfaces:**
- Consumes: one reviewed template proposal containing all folders and files.
- Produces: preflighted all-or-rollback project creation result.

- [x] Add failing tests for a later template file failing after earlier folders/files succeeded.
- [x] Preflight collisions, paths, backups, and audit destinations for the complete plan.
- [x] Execute the plan in Main with rollback of newly created artifacts on failure.
- [x] Move review execution orchestration out of `mountShell.js`.
- [x] Keep Shell responsible only for composition and wiring.

### Task 10: Structural Debt and Contract Consolidation

**Files:**
- Split: `src/renderer/settings/mountSettingsPanel.js`
- Split: `src/renderer/selectionActions/mountSelectionActions.js`
- Split: `src/renderer/files/mountFilePanel.js`
- Split: `src/renderer/styles/layout.css`
- Modify: `src/shared/ipc/channels.js`
- Modify: `src/preload/index.js`
- Modify: source/behavior tests for affected modules

**Interfaces:**
- Consumes: existing public renderer and preload contracts.
- Produces: unchanged behavior through smaller owner-specific modules.

- [x] Add contract tests for complete shared/preload IPC parity.
- [x] Extract settings category controllers, action-form controllers, file-tree rendering, and shell review execution one owner at a time.
- [x] Consolidate path-normalization helpers only where semantics are identical.
- [x] Split layout CSS by existing UI area without changing tokens or visuals.
- [x] Run the full suite after every extraction and request visual smoke testing after each renderer batch.

### Task 11: Release Reproducibility, Dependencies, and Documentation

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.github/workflows/ci.yml`
- Modify: `THIRD_PARTY_NOTICES.md`
- Modify: `licenses/`
- Modify: `src/main/embeddings/embeddingModelStore.js`
- Modify: release tests and canonical release docs

**Interfaces:**
- Consumes: clean checkout, pinned dependency lockfile, verified model artifact.
- Produces: repeatable Windows release candidate with documented third-party inventory.

- [x] Resolve fixable `fast-uri` and `protobufjs` advisories without weakening tests.
- [x] Pin and document the Sharp/libvips runtime surface and verify its license obligations.
- [x] Verify the model hash at build/start before loading it.
- [x] Add an explicit pinned-revision model provisioning and checksum workflow for clean checkouts.
- [x] Add a Windows CI packaging smoke job while retaining platform-neutral Node tests.
- [x] Complete the direct/transitive dependency license sweep and third-party notices.
- [ ] Choose and document the public root project license before publication. The private repository remains deliberately `UNLICENSED`.
- [x] Correct stale audit, setup, migration, and zero-vulnerability claims.
- [x] Run `npm ci`, the reviewed audit policy, `npm test`, Gitleaks, and a Windows package build. The independent portable smoke test remains the final manual checkpoint.

## Manual Checkpoints

1. After Task 2-5: open two vaults in sequence, exercise migration conflict, read/update/rename, restart, and confirm no cross-vault state.
2. After Task 7: test local and deliberately external provider URLs plus embedding settings persistence.
3. After Task 9-10: visually test templates, Review Basket, Files, Selection Actions, Settings, Preview, and responsive panel behavior.
4. After Task 11: test the clean portable release candidate on a separate folder/profile.
