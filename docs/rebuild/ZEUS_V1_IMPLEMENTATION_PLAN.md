# ZEUS V1 Implementation Plan

## Phase 0 - Rebuild Setup

- [x] Confirm V1 product sentence.
- [x] Confirm V1 feature list.
- [x] Confirm non-V1 list.
- [x] Create clean project folder.
- [x] Create new `AGENTS.md`.
- [x] Create minimal README.
- [x] Decide whether to reuse the current GitHub repo after archiving the prototype.

## Phase 1 - Foundation

- [x] Electron scaffold.
- [x] strict preload bridge.
- [x] main/renderer/shared separation.
- [x] automated test setup.
- [x] first security/path tests.

## Phase 2 - Vault Core

- [x] open vault.
- [x] vault profile foundation.
- [x] file navigation module foundation.
- [x] file-tree refresh preserves expanded folders.
- [x] Markdown read foundation.
- [x] Markdown render/sanitize.
- [x] Assistant chat Markdown rendering through shared renderer.
- [x] Request-scoped selected Markdown context with visible Auto-context toggle.
- [x] Local Markdown source/edit preview mode without persistence.
- [x] Markdown link navigation with preview open and explicit Reveal in Files.
- [x] Preview navigation history with back/forward controls.
- [x] path safety foundation.
- [x] dot-folder block foundation.

## Phase 3 - Action And Review Core

- [x] action schema.
- [x] proposal plan parser.
- [x] review basket state foundation.
- [x] review basket selection, remove, clear-open, and execute controls.
- [x] create note service with reviewed execution and audit logging.
- [x] update note service with reviewed diff execution, backup, stale-content check, and audit logging.
- [ ] insert/move/rename/archive note services.
- [x] diff preview foundation for line-based Markdown summaries in Review Basket.
- [x] diff review modal for existing-file proposals without enabling execution.
- [x] backup service foundation for existing Markdown notes.
- [ ] separate archive/trash-empty workflow planning, not as normal assistant delete.
- [x] audit log foundation for executed `create_note`.
- [x] audit log coverage for executed `create_note` and `update_note`.
- [ ] full audit log coverage for future insert/move/rename/archive actions.

## Phase 4 - Providers

- [ ] LM Studio chat.
- [ ] Ollama chat.
- [ ] provider settings.
- [ ] local-provider URL validation.
- [ ] model/capability display.

## Phase 5 - Embeddings V1-Light

- [ ] choose local embedding runtime.
- [ ] index Markdown files.
- [ ] store index locally/private.
- [ ] similar note candidates.
- [ ] tag candidates.
- [ ] folder/link candidates.
- [ ] Folder Context Index maps combined with embeddings and stale-scan detection.
- [ ] review-basket integration.

## Phase 6 - V1 Workflows

- [ ] New Project workflow.
- [ ] Inbox cleanup workflow.
- [ ] selected folder analysis.
- [ ] selected folder count/list prompt before creating a Folder Context Index.
- [ ] project note maintenance suggestions.
- [ ] manual smoke tests.
- [ ] focused external audit.

## Phase 7 - Release Baseline

- [ ] README.
- [ ] architecture docs.
- [ ] testing docs.
- [ ] GitHub cleanup.
- [ ] dependency/security audit.
- [ ] package/build check.
