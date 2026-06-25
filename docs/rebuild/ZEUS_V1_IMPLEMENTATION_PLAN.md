# ZEUS V1 Implementation Plan

Audit triage reference: [ZEUS_V1_AUDIT_TRIAGE.md](./ZEUS_V1_AUDIT_TRIAGE.md).

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
- [x] Strict preload bridge.
- [x] Main/renderer/shared separation.
- [x] Automated test setup.
- [x] First security/path tests.

## Phase 2 - Vault Core

- [x] Open vault.
- [x] Vault profile foundation.
- [x] File navigation module foundation.
- [x] File-tree refresh preserves expanded folders.
- [x] Markdown read foundation.
- [x] Markdown render/sanitize.
- [x] Assistant chat Markdown rendering through shared renderer.
- [x] Request-scoped selected Markdown context with visible Auto-context toggle.
- [x] Selected-folder read-context preflight.
- [x] Recursive folder listing reads structure only, not note contents.
- [x] Local Markdown source/edit preview mode without persistence.
- [x] Markdown link navigation with preview open and explicit Reveal in Files.
- [x] Preview navigation history with back/forward controls.
- [x] Path safety foundation.
- [x] Dot-folder block foundation.

## Phase 3 - Action And Review Core

- [x] Action schema.
- [x] Proposal plan parser.
- [x] Review Basket state foundation.
- [x] Review Basket selection, remove, clear-open, and execute controls.
- [x] Create note service with reviewed execution and audit logging.
- [x] Update note service with reviewed diff execution, backup, stale-content check, and audit logging.
- [x] Diff preview foundation for line-based Markdown summaries in Review Basket.
- [x] Diff review modal for existing-file proposals.
- [x] Backup service foundation for existing Markdown notes.
- [x] Audit log coverage for executed `create_note` and `update_note`.
- [x] Guard tests keep future write workflow actions non-executable until their services exist.

## Phase 4 - Context And Workflow Control

- [x] Refactor folder context flow to `PendingActionState` plus `FolderContextController`.
- [x] Add explicit scope cards for folder actions: current level, all subfolders, cancel.
- [x] Ensure short replies such as `all` or `alle` only resolve an existing pending folder action.
- [ ] Keep selected-file, selected-folder, dropped-file, and future embedding context sources visibly separated.
- [ ] Add limits for max context size and max listed folders/files per request.

## Phase 5 - Providers And Settings Foundation

- [ ] LM Studio chat baseline.
- [ ] Ollama chat baseline.
- [ ] Real chat abort: request id, `AbortController`, `chat:cancel` IPC, Send-to-Cancel UI state, and ignored late responses.
- [ ] Provider settings foundation: URL, model, timeout, token/context limits.
- [ ] Local-provider URL validation.
- [ ] Model/capability display.
- [ ] Settings persistence in app/user-data storage.

## Phase 5.5 - Reviewed Update Flow

This is a V1-critical workflow, not a later comfort feature. The prototype already proved the value of chat-driven file updates; the rebuild must make it reliable and review-safe before larger cleanup features.

- [ ] Chat-generated `update_note` proposals reliably target the selected Markdown file when `R` and `W` allow it.
- [ ] Missing `R` or `W` produces a clear app-level guidance message, not generic model text about lacking filesystem access.
- [ ] Edit Mode can create an `update_note` proposal from local source changes instead of writing directly.
- [ ] Partial edits are supported through focused insertion/replacement planning, so ZEUS can add or replace one section without pasting an entire large note back into the file.
- [ ] Diff preview remains mandatory before applying any update.
- [ ] Backup, stale-content validation, and audit logging stay on the existing `update_note` service path.

## Phase 6 - V1 Release Hardening

- [ ] Add renderer Content Security Policy.
- [ ] Add max-size guards for create/update note content and provider/context payloads.
- [ ] Add GitHub Actions CI for JS checks and Node tests.
- [ ] Add `CONTRIBUTING.md`.
- [ ] Add `CHANGELOG.md`.
- [ ] Add `SECURITY.md`.
- [ ] Run dependency/security audit.
- [ ] Run accessibility pass for custom controls, keyboard operation, contrast, and ARIA labels.
- [ ] Add IPC wrapper/helper only if duplicated validation/error mapping becomes evident.

## Phase 7 - V1 Feature Candidates

These are V1 candidates if they stay small and do not destabilize safety/review flows.

- [ ] New Project workflow from deterministic template/preset logic.
- [ ] Minimal template/preset support for new notes and projects.
- [ ] Insert into note service with focused diff preview, backup, stale-content validation, and audit logging.
- [ ] Move note service with collision checks, backup/audit coverage, and no automatic link repair unless separately previewed.
- [ ] Rename note service with collision checks, backup/audit coverage, and later link-update planning.
- [ ] Archive note service as the normal delete alternative, plus separate archive/trash-empty workflow planning.
- [ ] Inbox cleanup workflow with reviewable suggestions.
- [ ] Selected folder analysis with explicit scope and limits.
- [ ] Project note maintenance suggestions.
- [ ] Basic image handling foundation: display/import/move/rename through safe IPC.
- [ ] Local embeddings V1-light: choose runtime, store private index, suggest similar notes/tags/links/folders.
- [ ] Review Basket integration for embedding-backed suggestions.
- [ ] Folder Context Index maps combined with embeddings and stale-scan detection, stored in `.zeus/` or configured cache.

## Phase 8 - V1 Freeze And Release Baseline

- [ ] README update.
- [ ] Architecture docs update.
- [ ] Testing docs update.
- [ ] Manual smoke tests.
- [ ] Focused external audit.
- [ ] GitHub cleanup.
- [ ] Package/build check.
- [ ] V1 freeze decision.

## V1.1 / V1.2 Backlog

- [ ] Search within vault.
- [ ] Audit log / backup history UI with restore-oriented controls.
- [ ] End-to-end Electron tests.
- [ ] Async or worker-based deep folder crawling for very large vaults.
- [ ] Backup retention policy and optional cleanup UI.
- [ ] Batch AI actions over multiple notes with grouped diffs.
- [ ] Plugin-style extension points for community contributions.
- [ ] More complete settings UI, including hotkeys and theme presets.
- [ ] Vision analysis and image tagging gated by model capability.

## Parking Lot

- [ ] Voice input.
- [ ] Peer-to-peer sync.
- [ ] External HTTP/CLI automation API.
- [ ] Encrypted backups with user-managed passphrases.
- [ ] Full plugin marketplace or broad agent-harness behavior.
